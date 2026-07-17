export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 이메일 변경 2단계: 인증코드 확인 후 이메일 업데이트
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const newEmail = (body?.new_email || "").trim().toLowerCase();
  const code = (body?.code || "").trim();

  if (!newEmail || !code) return err("VALIDATION_001", "인증코드를 입력해주세요.", 400);

  const tokenHash = `email_change:${auth!.sub}:${newEmail}:${code}`;
  const found = await pool.query(
    `SELECT id FROM refresh_tokens
     WHERE token_hash = $1 AND expires_at > NOW() AND revoked_at IS NULL`,
    [tokenHash]
  );
  if (found.rowCount === 0) return err("AUTH_003", "인증코드가 올바르지 않거나 만료되었습니다.", 400);

  // 최종 중복 재확인
  const dup = await pool.query(
    `SELECT id FROM companies WHERE lower(email) = $1 AND status = 'ACTIVE' AND id != $2`,
    [newEmail, auth!.sub]
  );
  if ((dup.rowCount ?? 0) > 0) return err("COMPANY_002", "이미 사용 중인 이메일입니다.", 409);

  await pool.query(`UPDATE companies SET email = $1, updated_at = NOW() WHERE id = $2`, [newEmail, auth!.sub]);
  await pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [tokenHash]);

  return ok({ email: newEmail });
}
