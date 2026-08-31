export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 받은 제안 목록.
//   공고 조건과 내 희망 조건을 함께 내려보내, 화면에서 "희망 지역과 같아요" 같은
//   맞는 점을 붙일 수 있게 한다 — 기업이 따로 쓰지 않아도 제안이 나를 보고 온
//   것처럼 읽힌다.
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.message, p.read_at, p.interested_at, p.created_at,
              p.job_posting_id,
              c.company_name, c.brand_name,
              jp.title AS job_title, jp.status AS job_status, jp.deadline,
              jp.location, jp.employment_type, jp.salary_type, jp.salary_min, jp.salary_max,
              jp.contact_methods,
              up.region_prefer, up.work_type_prefer
       FROM proposals p
       JOIN companies c    ON c.id  = p.company_id
       JOIN job_postings jp ON jp.id = p.job_posting_id
       LEFT JOIN user_profiles up ON up.user_id = p.user_id
       WHERE p.user_id = $1 AND p.hidden_at IS NULL
       ORDER BY p.created_at DESC
       LIMIT 100`,
      [auth!.sub]
    );

    const unread = rows.filter((r) => !r.read_at).length;
    return ok({ proposals: rows, unread });
  } catch (e: any) {
    console.error("[proposals GET]", e);
    return err("PROPOSAL_002", "제안을 불러오지 못했습니다: " + e.message, 500);
  }
}
