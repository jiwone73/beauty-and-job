export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 개인 이메일 변경: 현재 비밀번호 재확인 후 즉시 변경
// (가입 때 이메일 인증을 하지 않으므로 별도 이메일 코드 인증 없음.
//  카카오 계정은 이 경로가 아니라 카카오 동기화를 사용)
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const password = (body?.password || "").trim();
  const newEmail = (body?.new_email || "").trim().toLowerCase();

  if (!EMAIL_RE.test(newEmail)) return err("VALIDATION_001", "올바른 이메일 형식을 입력해주세요.", 400);

  const cur = await pool.query(
    `SELECT email, password_hash FROM users WHERE id = $1 AND status = 'ACTIVE'`,
    [auth!.sub]
  );
  if (cur.rowCount === 0) return err("USER_004", "계정을 찾을 수 없습니다.", 404);

  const hash = cur.rows[0].password_hash;
  if (!hash) return err("VALIDATION_001", "카카오 계정은 카카오에서 이메일을 동기화해주세요.", 400);
  if (!password) return err("VALIDATION_001", "현재 비밀번호를 입력해주세요.", 400);

  const valid = await bcrypt.compare(password, hash);
  if (!valid) return err("AUTH_003", "비밀번호가 일치하지 않습니다.", 401);

  if ((cur.rows[0].email || "").toLowerCase() === newEmail)
    return err("VALIDATION_001", "현재 이메일과 동일합니다.", 400);

  const dup = await pool.query(
    `SELECT id FROM users WHERE lower(email) = $1 AND status = 'ACTIVE' AND id != $2`,
    [newEmail, auth!.sub]
  );
  if ((dup.rowCount ?? 0) > 0) return err("USER_005", "이미 사용 중인 이메일입니다.", 409);

  await pool.query(`UPDATE users SET email = $1 WHERE id = $2`, [newEmail, auth!.sub]);
  return ok({ email: newEmail });
}
