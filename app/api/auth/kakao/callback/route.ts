export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { signAccessToken } from "@/lib/jwt";

const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";
const KAKAO_USER_URL = "https://kapi.kakao.com/v2/user/me";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const kakaoError = url.searchParams.get("error");
  const base = process.env.NEXT_PUBLIC_BASE_URL || url.origin;

  // 사용자가 동의 취소 등
  if (kakaoError || !code) {
    return NextResponse.redirect(`${base}/login?kakao_error=cancelled`);
  }

  try {
    // 1) 인가코드 → 카카오 토큰
    const tokenRes = await fetch(KAKAO_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.KAKAO_REST_API_KEY!,
        client_secret: process.env.KAKAO_CLIENT_SECRET!,
        redirect_uri: `${base}/api/auth/kakao/callback`,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("[kakao token]", tokenData);
      return NextResponse.redirect(`${base}/login?kakao_error=token`);
    }

    // 2) 카카오 토큰 → 사용자 정보
    const meRes = await fetch(KAKAO_USER_URL, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });
    const kakaoUser = await meRes.json();
    const kakaoId = kakaoUser?.id;
    if (!kakaoId) {
      console.error("[kakao user]", kakaoUser);
      return NextResponse.redirect(`${base}/login?kakao_error=user`);
    }

    const account = kakaoUser.kakao_account || {};
    const nickname =
      account.profile?.nickname || kakaoUser.properties?.nickname || "카카오회원";
    const profileImage =
      account.profile?.profile_image_url ||
      kakaoUser.properties?.profile_image ||
      null;
    // 이메일: 인증된 이메일만 계정 통합에 사용 (가로채기 방지)
    const email =
      account.email && account.is_email_valid && account.is_email_verified
        ? account.email
        : null;

    // 3) 회원 조회 / 연동 / 생성
    let user: any = null;
    let isNew = false;

    // (a) kakao_id로 먼저 조회 — 재방문 카카오 회원
    const byKakao = await pool.query(
      `SELECT id, email, name, phone, status, job_type, office_job_areas
       FROM users WHERE kakao_id = $1`,
      [kakaoId]
    );

    if (byKakao.rowCount && byKakao.rowCount > 0) {
      user = byKakao.rows[0];
    } else if (email) {
      // (b) 이메일로 기존 회원 조회 → 있으면 연동 (원티드식 통합)
      const byEmail = await pool.query(
        `SELECT id, email, name, phone, status, job_type, office_job_areas
         FROM users WHERE email = $1`,
        [email]
      );
      if (byEmail.rowCount && byEmail.rowCount > 0) {
        const linked = await pool.query(
          `UPDATE users
             SET kakao_id = $1,
                 avatar_url = COALESCE(avatar_url, $2),
                 last_login_at = NOW()
           WHERE id = $3
           RETURNING id, email, name, phone, status, job_type, office_job_areas`,
          [kakaoId, profileImage, byEmail.rows[0].id]
        );
        user = linked.rows[0];
      }
    }

    // (c) 못 찾았으면 신규 가입 (phone은 없으므로 생략 → nullable)
    if (!user) {
      isNew = true;
      const ins = await pool.query(
        `INSERT INTO users (kakao_id, name, email, avatar_url, status)
         VALUES ($1, $2, $3, $4, 'ACTIVE')
         RETURNING id, email, name, phone, status, job_type, office_job_areas`,
        [kakaoId, nickname, email, profileImage]
      );
      user = ins.rows[0];
    }

    if (user.status && user.status !== "ACTIVE") {
      return NextResponse.redirect(`${base}/login?kakao_error=inactive`);
    }

    // 재방문/연동 시 마지막 로그인 갱신 (신규는 위에서 처리됨)
    if (!isNew) {
      pool
        .query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id])
        .catch((e) => console.error("[update last_login_at]", e));
    }

    // 4) 자체 JWT (기존 이메일 로그인과 동일한 형식)
    const accessToken = signAccessToken({
      sub: user.id,
      owner_type: "user",
      role: "user",
    });

    // 5) 1회용 쿠키(60초)로 클라이언트에 전달 → 클라가 localStorage로 옮김
    const payload = {
      access_token: accessToken,
      user: {
        name: user.name || "",
        phone: user.phone || "",
        job_type: user.job_type || "",
        office_job_areas: user.office_job_areas || [],
      },
      isNew,
    };

    const res = NextResponse.redirect(`${base}/login/kakao/callback`);
    res.cookies.set("kakao_auth", encodeURIComponent(JSON.stringify(payload)), {
      maxAge: 60,
      path: "/",
      httpOnly: false, // 클라 JS가 읽어야 함 (기존 access_token도 localStorage 방식이라 동일 등급)
      sameSite: "lax",
    });
    return res;
  } catch (e) {
    console.error("[kakao callback]", e);
    return NextResponse.redirect(`${base}/login?kakao_error=exception`);
  }
}