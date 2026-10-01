export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, getAuth } from "@/lib/api";
import { sendTalentRecommendedEmail } from "@/lib/email";

/**
 * 인재 추천 2단계 확인 페이지가 쓰는 자리.
 *
 * 메일 링크(로그인 없음, 토큰)로도 들어오고, 인앱 알림을 눌러(로그인 있음)
 * 들어오기도 한다 — 둘 다 받는다: 로그인한 사람이 그 추천의 당사자면 토큰
 * 없이도 열어 주고, 아니면 토큰이 맞아야 연다.
 *
 * GET은 화면을 그리기 위한 조회만 하고 아무것도 바꾸지 않는다 — 메일
 * 프로그램이 링크를 미리 열어 보는 것(프리페치)에 응답이 걸리면 안 된다.
 * 실제 응답은 버튼을 눌러야 나가는 POST에서만 기록한다.
 */
async function 찾기(id: string) {
  const { rows } = await pool.query(
    `SELECT tr.id, tr.status, tr.token, tr.company_id, tr.job_posting_id, tr.user_id,
            u.name AS user_name, jp.title AS job_title,
            COALESCE(c.brand_name, c.company_name) AS company_name, c.email AS company_email
       FROM talent_recommendations tr
       JOIN users u ON u.id = tr.user_id
       JOIN job_postings jp ON jp.id = tr.job_posting_id
       JOIN companies c ON c.id = tr.company_id
      WHERE tr.id = $1`,
    [id]
  );
  return rows[0] || null;
}

function 본인확인(req: NextRequest, rec: any, token: string | null) {
  const auth = getAuth(req);
  if (auth && auth.owner_type === "user" && auth.sub === rec.user_id) return true;
  return !!token && token === rec.token;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.nextUrl.searchParams.get("token");
  const rec = await 찾기(params.id);
  if (!rec || !본인확인(req, rec, token)) return err("TR_001", "링크가 올바르지 않습니다.", 404);
  return ok({
    status: rec.status,
    companyName: rec.company_name,
    jobTitle: rec.job_title,
    userName: rec.user_name,
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const token = body?.token ?? null;
  const choice = body?.choice;
  if (choice !== "yes" && choice !== "no") {
    return err("TR_002", "요청이 올바르지 않습니다.", 400);
  }

  const rec = await 찾기(params.id);
  if (!rec || !본인확인(req, rec, token)) return err("TR_001", "링크가 올바르지 않습니다.", 404);
  if (rec.status !== "PENDING") {
    return ok({ status: rec.status, already: true });
  }

  const status = choice === "yes" ? "INTERESTED" : "DECLINED";
  await pool.query(`UPDATE talent_recommendations SET status = $2, responded_at = NOW() WHERE id = $1`, [params.id, status]);

  if (choice === "yes") {
    try {
      await pool.query(
        `INSERT INTO notifications (company_id, type, title, message, related_id, related_type)
         VALUES ($1, 'TALENT_INTEREST', '관심 보인 인재가 있어요', $2, $3, 'user')`,
        [rec.company_id, `「${rec.job_title}」에 ${rec.user_name}님이 관심을 보였어요. 인재풀에서 확인하고 제안해 보세요.`, rec.user_id]
      );
      await pool.query(`UPDATE talent_recommendations SET notified_company_at = NOW() WHERE id = $1`, [params.id]);
      if (rec.company_email) {
        await sendTalentRecommendedEmail(rec.company_email, rec.company_name, rec.user_name, rec.job_title, rec.job_posting_id);
      }
    } catch (e) {
      console.error("[talent-recommendations respond]", e);
    }
  }

  return ok({ status });
}
