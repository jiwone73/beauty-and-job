export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { sendEmailChangeCodeEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 이메일 변경 1단계: 새 이메일로 인증코드 발송
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const newEmail = (body?.new_email || "").trim().toLowerCase();

  if (!EMAIL_RE.test(newEmail)) return err("VALIDATION_001", "올바른 이메일 형식을 입력해주세요.", 400);

  const cur = await pool.query(
    `SELECT email FROM companies WHERE id = $1 AND status = 'ACTIVE'`,
    [auth!.sub]
  );
  if (cur.rowCount === 0) return err("COMPANY_001", "계정을 찾을 수 없습니다.", 404);

  if ((cur.rows[0].email || "").toLowerCase() === newEmail)
    return err("VALIDATION_001", "현재 이메일과 동일합니다.", 400);

  // 이메일은 로그인 아이디다. 개인·기업이 표는 달라도 주소는 하나여야 한다 —
  // 겹치면 한 주소가 두 계정의 아이디가 되어, 그 사람은 새 계정을 못 만들고
  // 두 계정의 안내 메일이 한 편지함에 섞인다.
  // status 로 거르지 않는다. 가입 때의 중복 검사도 거르지 않으므로, 여기서만
  // 열어 주면 탈퇴한 계정의 주소를 가져간 뒤 가입 화면에서 막히게 된다.
  const [c, u] = await Promise.all([
    pool.query(`SELECT 1 FROM companies WHERE lower(email) = $1 AND id != $2 LIMIT 1`, [newEmail, auth!.sub]),
    pool.query(`SELECT 1 FROM users WHERE lower(email) = $1 LIMIT 1`, [newEmail]),
  ]);
  if ((c.rowCount ?? 0) > 0 || (u.rowCount ?? 0) > 0) return err("COMPANY_002", "이미 사용 중인 이메일입니다.", 409);

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
