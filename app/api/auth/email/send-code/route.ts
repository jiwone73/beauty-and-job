export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { sendSignupEmailVerifyCode } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 가입용 이메일 인증코드 발송 (비인증 — 아직 계정 생성 전)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = (body?.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return err("VALIDATION_001", "올바른 이메일 형식을 입력해주세요.", 400);

  // 개인·기업 통틀어 이미 가입된 이메일이면 차단
  const [u, c] = await Promise.all([
    pool.query(`SELECT 1 FROM users WHERE lower(email) = $1 LIMIT 1`, [email]),
    pool.query(`SELECT 1 FROM companies WHERE lower(email) = $1 LIMIT 1`, [email]),
  ]);
  if ((u.rowCount ?? 0) > 0 || (c.rowCount ?? 0) > 0) return err("USER_001", "이미 가입된 이메일입니다.", 409);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE revoked_at IS NULL AND token_hash LIKE $1`,
    [`email_verify:${email}:%`]
  );
  await pool.query(
    `INSERT INTO refresh_tokens (owner_id, owner_type, token_hash, expires_at)
     VALUES (gen_random_uuid(), 'user', $1, $2)
     ON CONFLICT (token_hash) DO UPDATE SET expires_at = $2, revoked_at = NULL`,
    [`email_verify:${email}:${code}`, expiresAt]
  );

  let sent = true;
  let sendError: string | undefined;
  try {
    const result: any = await sendSignupEmailVerifyCode(email, code);
    if (result?.error) {
      sent = false;
      sendError = result.error?.message || JSON.stringify(result.error);
      console.error("[email-verify] resend error", result.error);
    }
  } catch (e: any) {
    sent = false;
    sendError = e?.message || String(e);
    console.error("[email-verify] send fail", e);
  }

  const devCode = process.env.NODE_ENV !== "production" ? code : undefined;
  return ok({ sent, ...(sendError ? { error: sendError } : {}), ...(devCode ? { dev_code: devCode } : {}) });
}
