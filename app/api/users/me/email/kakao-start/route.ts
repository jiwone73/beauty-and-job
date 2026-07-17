export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 카카오 계정 이메일 동기화 1단계: 카카오 재인증(OAuth) 시작 URL 발급
// (사용자가 이메일을 입력하는 게 아니라, 카카오의 검증 이메일을 그대로 당겨옴)
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  const cur = await pool.query(
    `SELECT kakao_id FROM users WHERE id = $1 AND status = 'ACTIVE'`,
    [auth!.sub]
  );
  if (cur.rowCount === 0) return err("USER_004", "계정을 찾을 수 없습니다.", 404);
  if (!cur.rows[0].kakao_id) return err("VALIDATION_001", "카카오 로그인 계정이 아닙니다.", 400);

  const state = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await pool.query(
    `INSERT INTO refresh_tokens (owner_id, owner_type, token_hash, expires_at)
     VALUES ($1, 'user', $2, $3)
     ON CONFLICT (token_hash) DO UPDATE SET expires_at = $3, revoked_at = NULL`,
    [auth!.sub, `kakao_esync:${state}`, expiresAt]
  );

  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  const redirectUri = `${base}/api/auth/kakao/reauth-callback`;
  const authorizeUrl =
    `https://kauth.kakao.com/oauth/authorize` +
    `?client_id=${process.env.KAKAO_REST_API_KEY}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code&prompt=login&state=${state}`;

  return ok({ authorize_url: authorizeUrl });
}
