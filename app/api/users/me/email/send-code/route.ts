export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { sendEmailChangeCodeEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 개인 이메일 변경: 새 이메일로 인증코드 발송 (로그인 필요)
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;
  const userId = auth!.sub;

  const body = await req.json().catch(() => ({}));
  const newEmail = (body?.new_email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(newEmail)) return err("VALIDATION_001", "올바른 이메일 형식을 입력해주세요.", 400);

  // 현재 이메일과 동일한지 확인
  const cur = await pool.query(
    `SELECT email FROM users WHERE id = $1 AND status = 'ACTIVE'`,
    [userId]
  );
  if (cur.rowCount === 0) return err("USER_004", "계정을 찾을 수 없습니다.", 404);
  if ((cur.rows[0].email || "").toLowerCase() === newEmail)
    return err("VALIDATION_001", "현재 이메일과 동일합니다.", 400);

  // 개인·기업 통틀어 이미 사용 중인 이메일이면 차단(본인 제외)
  const [u, c] = await Promise.all([
    pool.query(`SELECT 1 FROM users WHERE lower(email) = $1 AND id != $2 LIMIT 1`, [newEmail, userId]),
    pool.query(`SELECT 1 FROM companies WHERE lower(email) = $1 LIMIT 1`, [newEmail]),
  ]);
  if ((u.rowCount ?? 0) > 0 || (c.rowCount ?? 0) > 0) return err("USER_005", "이미 사용 중인 이메일입니다.", 409);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // [테스트] 발송 실패해도 서버 콘솔로 인증코드 확인 (Vercel 로그). +별칭도 그대로 동작.
  console.log(`[EMAIL CHANGE] user=${userId} ${newEmail} → ${code} (테스트용 콘솔 출력)`);

  // 이 사용자의 이전 변경 코드는 무효화 후 신규 저장
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE revoked_at IS NULL AND token_hash LIKE $1`,
    [`email_change:${userId}:%`]
  );
  await pool.query(
    `INSERT INTO refresh_tokens (owner_id, owner_type, token_hash, expires_at)
     VALUES (gen_random_uuid(), 'user', $1, $2)
     ON CONFLICT (token_hash) DO UPDATE SET expires_at = $2, revoked_at = NULL`,
    [`email_change:${userId}:${newEmail}:${code}`, expiresAt]
  );

  let sent = true;
  let sendError: string | undefined;
  try {
    const result: any = await sendEmailChangeCodeEmail(newEmail, code);
    if (result?.error) {
      sent = false;
      sendError = result.error?.message || JSON.stringify(result.error);
      console.error("[email-change] send error", result.error);
    }
  } catch (e: any) {
    sent = false;
    sendError = e?.message || String(e);
    console.error("[email-change] send fail", e);
  }

  const devCode = process.env.NODE_ENV !== "production" ? code : undefined;
  return ok({ sent, ...(sendError ? { error: sendError } : {}), ...(devCode ? { dev_code: devCode } : {}) });
}
