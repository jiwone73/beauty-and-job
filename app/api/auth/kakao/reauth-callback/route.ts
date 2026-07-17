export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";
const KAKAO_USER_URL = "https://kapi.kakao.com/v2/user/me";

// 카카오 계정 이메일 변경 2단계: 카카오 재인증 결과 확인 후 이메일 업데이트
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const kakaoError = url.searchParams.get("error");
  const base = process.env.NEXT_PUBLIC_BASE_URL || url.origin;
  const fail = (reason: string) => NextResponse.redirect(`${base}/profile?email_error=${reason}`);

  if (kakaoError || !code || !state) return fail("cancelled");

  try {
    const st = await pool.query(
      `SELECT owner_id, token_hash FROM refresh_tokens
       WHERE token_hash LIKE $1 AND expires_at > NOW() AND revoked_at IS NULL LIMIT 1`,
      [`kakao_reauth:${state}:%`]
    );
    if (st.rowCount === 0) return fail("expired");
    const userId = st.rows[0].owner_id;
    const tokenHash: string = st.rows[0].token_hash;
    const newEmail = tokenHash.substring(`kakao_reauth:${state}:`.length);

    // 인가코드 → 카카오 토큰
    const tokenRes = await fetch(KAKAO_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.KAKAO_REST_API_KEY!,
        client_secret: process.env.KAKAO_CLIENT_SECRET!,
        redirect_uri: `${base}/api/auth/kakao/reauth-callback`,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("[kakao reauth token]", tokenData);
      return fail("token");
    }

    const meRes = await fetch(KAKAO_USER_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const kakaoUser = await meRes.json();
    const kakaoId = kakaoUser?.id;
    if (!kakaoId) return fail("user");

    // 계정 소유 확인: 이 계정의 kakao_id와 일치해야 함
    const u = await pool.query(
      `SELECT kakao_id FROM users WHERE id = $1 AND status = 'ACTIVE'`,
      [userId]
    );
    if (u.rowCount === 0 || String(u.rows[0].kakao_id) !== String(kakaoId)) return fail("mismatch");

    const dup = await pool.query(
      `SELECT id FROM users WHERE lower(email) = $1 AND status = 'ACTIVE' AND id != $2`,
      [newEmail, userId]
    );
    if ((dup.rowCount ?? 0) > 0) return fail("duplicate");

    await pool.query(`UPDATE users SET email = $1 WHERE id = $2`, [newEmail, userId]);
    await pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [tokenHash]);

    return NextResponse.redirect(`${base}/profile?email_changed=1`);
  } catch (e) {
    console.error("[kakao reauth]", e);
    return fail("error");
  }
}
