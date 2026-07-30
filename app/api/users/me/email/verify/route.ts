export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 개인 이메일 변경: 새 이메일 인증코드 확인 후 즉시 변경 (로그인 필요)
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;
  const userId = auth!.sub;

  const body = await req.json().catch(() => ({}));
  const newEmail = (body?.new_email || "").trim().toLowerCase();
  const code = (body?.code || "").trim();
  if (!EMAIL_RE.test(newEmail)) return err("VALIDATION_001", "올바른 이메일 형식을 입력해주세요.", 400);
  if (!code) return err("VALIDATION_001", "인증코드를 입력해주세요.", 400);

  const tokenHash = `email_change:${userId}:${newEmail}:${code}`;
  const found = await pool.query(
    `SELECT id FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW() AND revoked_at IS NULL`,
    [tokenHash]
  );
  if (found.rowCount === 0) return err("AUTH_003", "인증코드가 올바르지 않거나 만료되었습니다.", 400);

  // 발송~확인 사이에 선점되었을 수 있으니 중복 재확인(본인 제외)
  const [u, c] = await Promise.all([
    pool.query(`SELECT 1 FROM users WHERE lower(email) = $1 AND id != $2 LIMIT 1`, [newEmail, userId]),
    pool.query(`SELECT 1 FROM companies WHERE lower(email) = $1 LIMIT 1`, [newEmail]),
  ]);
  if ((u.rowCount ?? 0) > 0 || (c.rowCount ?? 0) > 0) {
    await pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [tokenHash]);
    return err("USER_005", "이미 사용 중인 이메일입니다.", 409);
  }

  await pool.query(`UPDATE users SET email = $1 WHERE id = $2`, [newEmail, userId]);
  await pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [tokenHash]);
  return ok({ email: newEmail });
}
