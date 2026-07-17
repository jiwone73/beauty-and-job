export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { sendEmailChangeCodeEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 이메일 변경 1단계: 비밀번호 확인 + 새 이메일로 인증코드 발송
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const password = (body?.password || "").trim();
  const newEmail = (body?.new_email || "").trim().toLowerCase();

  if (!EMAIL_RE.test(newEmail)) return err("VALIDATION_001", "올바른 이메일 형식을 입력해주세요.", 400);
  if (!password) return err("VALIDATION_001", "비밀번호를 입력해주세요.", 400);

  const cur = await pool.query(
    `SELECT email, password_hash FROM companies WHERE id = $1 AND status = 'ACTIVE'`,
    [auth!.sub]
  );
  if (cur.rowCount === 0) return err("COMPANY_001", "계정을 찾을 수 없습니다.", 404);

  const valid = await bcrypt.compare(password, cur.rows[0].password_hash);
  if (!valid) return err("AUTH_003", "비밀번호가 일치하지 않습니다.", 401);
  if ((cur.rows[0].email || "").toLowerCase() === newEmail)
    return err("VALIDATION_001", "현재 이메일과 동일합니다.", 400);

  const dup = await pool.query(
    `SELECT id FROM companies WHERE lower(email) = $1 AND status = 'ACTIVE' AND id != $2`,
    [newEmail, auth!.sub]
  );
  if ((dup.rowCount ?? 0) > 0) return err("COMPANY_002", "이미 사용 중인 이메일입니다.", 409);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // 이 기업의 기존 이메일 변경 코드는 모두 무효화 → 최신 코드만 유효
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE revoked_at IS NULL AND token_hash LIKE $1`,
    [`email_change:${auth!.sub}:%`]
  );
  await pool.query(
    `INSERT INTO refresh_tokens (owner_id, owner_type, token_hash, expires_at)
     VALUES (gen_random_uuid(), 'user', $1, $2)
     ON CONFLICT (token_hash) DO UPDATE SET expires_at = $2, revoked_at = NULL`,
    [`email_change:${auth!.sub}:${newEmail}:${code}`, expiresAt]
  );

  let sent = true;
  let sendError: string | undefined;
  try {
    const result: any = await sendEmailChangeCodeEmail(newEmail, code);
    // Resend는 실패 시 throw 하지 않고 { error } 를 반환함
    if (result?.error) {
      sent = false;
      sendError = result.error?.message || JSON.stringify(result.error);
      console.error("[email-change] resend error", result.error);
    }
  } catch (e: any) {
    sent = false;
    sendError = e?.message || String(e);
    console.error("[email-change] send fail", e);
  }

  const devCode = process.env.NODE_ENV !== "production" ? code : undefined;
  return ok({ sent, ...(sendError ? { error: sendError } : {}), ...(devCode ? { dev_code: devCode } : {}) });
}
