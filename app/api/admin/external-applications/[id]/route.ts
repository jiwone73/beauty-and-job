export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { sendExternalApplicationEmail } from "@/lib/email";

// 외부 지원 전달 / 메모
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const { id } = params;
  const b = await req.json().catch(() => ({}));
  const action = b.action;
  const admin_note = typeof b.admin_note === "string" ? b.admin_note : undefined;

  // 대상 조회
  const r = await pool.query(
    `SELECT a.id, a.third_party_consent, a.cover_letter, a.delivery_status,
            u.name AS applicant_name, u.phone AS applicant_phone, u.email AS applicant_email,
            jp.title AS job_title, jp.external_contact_email,
            c.company_name AS company_name, c.email::text AS ec_contact_email
     FROM applications a
     JOIN job_postings jp ON jp.id = a.job_posting_id AND jp.source = 'EXTERNAL'
     LEFT JOIN companies c ON c.id = jp.company_id
     JOIN users u ON u.id = a.user_id
     WHERE a.id = $1`,
    [id]
  );
  if (r.rowCount === 0) return err("APP_001", "지원 내역을 찾을 수 없습니다.", 404);
  const app = r.rows[0];

  if (action === "note") {
    await pool.query(`UPDATE applications SET admin_note = $2 WHERE id = $1`, [id, admin_note ?? null]);
    return ok({ id, admin_note: admin_note ?? null });
  }

  if (action !== "forward") return err("VALIDATION_001", "알 수 없는 요청입니다.", 400);

  if (!app.third_party_consent) return err("APP_004", "제3자 제공 동의가 없어 전달할 수 없습니다.", 400);

  const target = (app.external_contact_email || app.ec_contact_email || "").trim();

  // 이메일 있으면 자동 발송, 없으면 수동 전달로 기록
  if (target) {
    try {
      const sent: any = await sendExternalApplicationEmail(target, {
        companyName: app.company_name || "채용 담당자",
        applicantName: app.applicant_name || "지원자",
        applicantPhone: app.applicant_phone || "",
        applicantEmail: app.applicant_email || "",
        jobTitle: app.job_title || "",
        coverLetter: app.cover_letter,
      });
      if (sent?.error) throw new Error(sent.error?.message || "send failed");
      await pool.query(
        `UPDATE applications SET delivery_status = 'FORWARDED', forwarded_channel = 'EMAIL', forwarded_at = NOW(),
                admin_note = COALESCE($2, admin_note) WHERE id = $1`,
        [id, admin_note ?? null]
      );
      return ok({ id, delivery_status: "FORWARDED", forwarded_channel: "EMAIL" });
    } catch (e) {
      console.error("[external forward email]", e);
      await pool.query(`UPDATE applications SET delivery_status = 'FAILED' WHERE id = $1`, [id]);
      return err("EMAIL_001", "메일 전달에 실패했습니다. 수동으로 전달해주세요.", 502);
    }
  } else {
    // 수동 전달 처리
    await pool.query(
      `UPDATE applications SET delivery_status = 'FORWARDED', forwarded_channel = 'MANUAL', forwarded_at = NOW(),
              admin_note = COALESCE($2, admin_note) WHERE id = $1`,
      [id, admin_note ?? null]
    );
    return ok({ id, delivery_status: "FORWARDED", forwarded_channel: "MANUAL" });
  }
}
