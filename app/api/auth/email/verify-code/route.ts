export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";

// 가입용 이메일 인증코드 확인 (비인증)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = (body?.email || "").trim().toLowerCase();
  const code = (body?.code || "").trim();
  if (!email || !code) return err("VALIDATION_001", "인증코드를 입력해주세요.", 400);

  const tokenHash = `email_verify:${email}:${code}`;
  const found = await pool.query(
    `SELECT id FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW() AND revoked_at IS NULL`,
    [tokenHash]
  );
  if (found.rowCount === 0) return err("AUTH_003", "인증코드가 올바르지 않거나 만료되었습니다.", 400);

  await pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [tokenHash]);
  return ok({ verified: true });
}
