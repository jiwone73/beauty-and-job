export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 카카오 계정 이메일 변경 1단계: 카카오 재인증(OAuth) 시작 URL 발급
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const newEmail = (body?.new_email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(newEmail)) return err("VALIDATION_001", "올바른 이메일 형식을 입력해주세요.", 400);

  const cur = await pool.query(
    `SELECT email, kakao_id FROM users WHERE id = $1 AND status = 'ACTIVE'`,
    [auth!.sub]
  );
  if (cur.rowCount === 0) return err("USER_004", "계정을 찾을 수 없습니다.", 404);
  if (!cur.rows[0].kakao_id) return err("VALIDATION_001", "카카오 로그인 계정이 아닙니다.", 400);
  if ((cur.rows[0].email || "").toLowerCase() === newEmail)
    return err("VALIDATION_001", "현재 이메일과 동일합니다.", 400);

  const dup = await pool.query(
    `SELECT id FROM users WHERE lower(email) = $1 AND status = 'ACTIVE' AND id != $2`,
    [newEmail, auth!.sub]
  );
  if ((dup.rowCount ?? 0) > 0) return err("USER_005", "이미 사용 중인 이메일입니다.", 409);

  // state 저장 (user_id + new_email 을 서버에 보관, 10분 유효)
  const state = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await pool.query(
    `INSERT INTO refresh_tokens (owner_id, owner_type, token_hash, expires_at)
     VALUES ($1, 'user', $2, $3)
     ON CONFLICT (token_hash) DO UPDATE SET expires_at = $3, revoked_at = NULL`,
    [auth!.sub, `kakao_reauth:${state}:${newEmail}`, expiresAt]
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
