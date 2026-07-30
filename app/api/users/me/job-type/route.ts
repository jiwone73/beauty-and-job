export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 구직 트랙(매장직 STORE / 사무직 OFFICE) 전환 — 로그인 필요
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;
  const userId = auth!.sub;

  const body = await req.json().catch(() => ({}));
  const jobType = (body?.job_type || "").trim().toUpperCase();
  if (jobType !== "STORE" && jobType !== "OFFICE")
    return err("VALIDATION_001", "올바른 구직 트랙이 아닙니다.", 400);

  // users.job_type 변경 + 이력서 분류(resumes.job_type)도 동기화(이력서 행이 있으면)
  await pool.query(`UPDATE users SET job_type = $1 WHERE id = $2`, [jobType, userId]);
  await pool.query(`UPDATE resumes SET job_type = $1, updated_at = NOW() WHERE user_id = $2`, [jobType, userId]);

  return ok({ job_type: jobType });
}
