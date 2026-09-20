export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { 끌어올리기_대기시간_MS } from "@/lib/jobSearchStatus";

/**
 * 이력서 끌어올리기 — 인재검색 정렬 기준(job_search_status_at)을 지금
 * 시각으로 다시 찍는다. 내용은 그대로 두고 순서만 앞으로 온다.
 *
 * 이력서를 그냥 저장할 때는 이 칸을 안 건드린다(lib/resumeWrite 참고) —
 * 이 단추만이 끌어올리는 유일한 길이라야 대기시간이 뜻을 갖는다.
 */
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  const { rows } = await pool.query(
    `SELECT job_search_status_at FROM user_profiles WHERE user_id = $1`,
    [auth!.sub]
  );
  const 마지막 = rows[0]?.job_search_status_at ? new Date(rows[0].job_search_status_at) : null;
  const 다음가능 = 마지막 ? new Date(마지막.getTime() + 끌어올리기_대기시간_MS) : null;
  if (다음가능 && 다음가능.getTime() > Date.now()) {
    return err("RESUME_BUMP_001", "아직 끌어올릴 수 없습니다.", 429);
  }

  const now = new Date();
  const updated = await pool.query(
    `UPDATE user_profiles SET job_search_status_at = $2 WHERE user_id = $1`,
    [auth!.sub, now]
  );
  if (updated.rowCount === 0) {
    return err("RESUME_BUMP_002", "이력서를 먼저 저장해 주세요.", 400);
  }
  return ok({ bumpedAt: now.toISOString(), nextAvailableAt: new Date(now.getTime() + 끌어올리기_대기시간_MS).toISOString() });
}
