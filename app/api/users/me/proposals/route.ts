export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { 제안분야들 } from "@/lib/positionLine";
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
              p.declined_at, p.canceled_at, p.position_index,
              p.job_posting_id,
              c.company_name, c.brand_name,
              jp.title AS job_title, jp.status AS job_status, jp.deadline,
              jp.location, jp.employment_type, jp.salary_type, jp.salary_min, jp.salary_max,
              jp.contact_methods, jp.job_type, jp.positions, jp.created_at AS job_created_at,
              -- 지금 무슨 일까지 갔는가. 카드 오른쪽 상태와 단추가 이걸로 정해진다.
              (SELECT count(*) FROM proposal_messages m
                WHERE m.proposal_id = p.id AND m.kind = 'TEXT')::int AS message_count,
              (SELECT m.appointment_at FROM proposal_messages m
                WHERE m.proposal_id = p.id AND m.kind = 'APPOINTMENT'
                  AND m.appointment_status = 'ACCEPTED'
                ORDER BY m.appointment_at DESC LIMIT 1) AS appointment_at,
              (SELECT ap.status FROM applications ap
                WHERE ap.user_id = p.user_id AND ap.job_posting_id = p.job_posting_id
                  AND ap.status <> 'WITHDRAWN'
                ORDER BY ap.applied_at DESC LIMIT 1) AS application_status,
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
    // 모집분야는 공고 상세와 같은 규칙으로 한 줄로 편다(lib/positionLine).
    const 목록 = rows.map((r) => ({
      ...r,
      positionLines: 제안분야들(r.positions, r.position_index, (r.job_type || "") === "OFFICE"),
    }));
    return ok({ proposals: 목록, unread });
  } catch (e: any) {
    console.error("[proposals GET]", e);
    return err("PROPOSAL_002", "제안을 불러오지 못했습니다: " + e.message, 500);
  }
}
