export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { 프로필못채움 } from "@/lib/applyReady";

// 지원 버튼을 누르기 전에 「지금 낼 수 있나」를 묻는 자리.
// 판단 규칙은 지원 API 와 같은 lib/applyReady 를 쓴다 — 여기서 「가능」이라
// 해 놓고 눌렀을 때 튕기면 안 된다.
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  const [me, resume] = await Promise.all([
    pool.query(
      `SELECT phone, birth_date, gender, email, region_sido, preferred_regions, job_type
         FROM users WHERE id = $1`,
      [auth!.sub]
    ),
    pool.query(`SELECT 1 FROM resumes WHERE user_id = $1 LIMIT 1`, [auth!.sub]),
  ]);
  if (me.rowCount === 0) return err("USER_404", "사용자를 찾을 수 없습니다.", 404);

  const 못채움 = 프로필못채움(me.rows[0]);
  const 이력서있음 = (resume.rowCount ?? 0) > 0;
  return ok({ ready: 못채움.length === 0 && 이력서있음, missing: 못채움, hasResume: 이력서있음 });
}
