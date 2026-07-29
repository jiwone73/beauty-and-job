export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 비회원 기업 → 회원 기업 연결(병합): 비회원의 공고를 회원 공고로 옮기고,
// 비회원 행은 삭제하지 않고 merged_into_company_id로 "연결됨" 표시만 남긴다.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const nmId = params.id;
  const b = await req.json().catch(() => ({}));
  const memberId = (b.company_id || "").trim();
  if (!memberId) return err("VALIDATION_001", "연결할 회원 기업을 선택해주세요.", 400);
  if (memberId === nmId) return err("VALIDATION_001", "같은 기업으로는 연결할 수 없습니다.", 400);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const nm = await client.query(`SELECT id, is_member, company_name FROM companies WHERE id = $1`, [nmId]);
    if (nm.rowCount === 0) { await client.query("ROLLBACK"); return err("NOT_FOUND", "비회원 기업을 찾을 수 없습니다.", 404); }
    if (nm.rows[0].is_member) { await client.query("ROLLBACK"); return err("VALIDATION_002", "이미 회원 기업입니다.", 409); }

    const mem = await client.query(`SELECT id, is_member, company_name FROM companies WHERE id = $1`, [memberId]);
    if (mem.rowCount === 0) { await client.query("ROLLBACK"); return err("NOT_FOUND", "회원 기업을 찾을 수 없습니다.", 404); }
    if (!mem.rows[0].is_member) { await client.query("ROLLBACK"); return err("VALIDATION_002", "연결 대상은 회원 기업이어야 합니다.", 409); }

    // 1) 비회원 공고 → 회원 공고로 이관
    const jobs = await client.query(
      `UPDATE job_postings
       SET company_id = $2, source = 'NATIVE', apply_method = 'NATIVE', updated_at = now()
       WHERE company_id = $1
       RETURNING id`,
      [nmId, memberId]
    );
    const jobIds = jobs.rows.map((r) => r.id);

    // 2) 이 공고들의 외부 전달 상태 해제(회원 지원자 관리로 편입)
    if (jobIds.length > 0) {
      await client.query(
        `UPDATE applications SET delivery_status = NULL
         WHERE job_posting_id = ANY($1::uuid[]) AND delivery_status IS NOT NULL`,
        [jobIds]
      );
    }

    // 3) 비회원 행은 보존하되 연결 표시
    await client.query(
      `UPDATE companies SET merged_into_company_id = $2, updated_at = now() WHERE id = $1`,
      [nmId, memberId]
    );

    await client.query("COMMIT");
    return ok({ non_member_id: nmId, company_id: memberId, company_name: mem.rows[0].company_name, moved_jobs: jobIds.length });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("[external link]", e);
    return err("SERVER_001", "연결 중 오류가 발생했습니다.", 500);
  } finally {
    client.release();
  }
}
