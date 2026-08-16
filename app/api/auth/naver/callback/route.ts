export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { signAccessToken } from "@/lib/jwt";

const NAVER_TOKEN_URL = "https://nid.naver.com/oauth2.0/token";
const NAVER_USER_URL = "https://openapi.naver.com/v1/nid/me";

// 네이버 로그인 콜백 — 카카오와 같은 규칙으로 처리한다.
//  · naver_id 로 재방문 조회 → 없으면 (인증된) 이메일로 기존 회원과 연동 → 그래도 없으면 신규 가입
//  · 전화번호는 네이버 동의 항목에 없을 수 있어 비워 두고, 온보딩에서 인증받는다.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const naverError = url.searchParams.get("error");
  const base = process.env.NEXT_PUBLIC_BASE_URL || url.origin;

  if (naverError || !code) {
    return NextResponse.redirect(`${base}/login?naver_error=cancelled`);
  }
  // CSRF: 시작할 때 심어 둔 state 와 같아야 한다.
  const savedState = req.cookies.get("naver_state")?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${base}/login?naver_error=state`);
  }

  try {
    // 1) 인가코드 → 네이버 토큰
    const tokenRes = await fetch(NAVER_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: (process.env.NAVER_LOGIN_CLIENT_ID || "").trim(),
        client_secret: (process.env.NAVER_LOGIN_CLIENT_SECRET || "").trim(),
        code,
        state: state || "",
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("[naver token]", tokenData);
      return NextResponse.redirect(`${base}/login?naver_error=token`);
    }

    // 2) 토큰 → 사용자 정보
    const meRes = await fetch(NAVER_USER_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const me = await meRes.json();
    const p = me?.response || {};
    const naverId = p.id;
    if (!naverId) {
      console.error("[naver user]", me);
      return NextResponse.redirect(`${base}/login?naver_error=user`);
    }

    const nickname = p.name || p.nickname || "네이버회원";
    const profileImage = p.profile_image || null;
    const email = p.email || null;                       // 네이버는 인증된 주소만 내려준다
    const phone = (p.mobile || "").replace(/\D/g, "") || null;

    // 3) 회원 조회 / 연동 / 생성
    let user: any = null;
    let isNew = false;

    const byNaver = await pool.query(
      `SELECT id, email, name, phone, status, job_type, office_job_areas
       FROM users WHERE naver_id = $1`,
      [naverId]
    );

    if (byNaver.rowCount && byNaver.rowCount > 0) {
      user = byNaver.rows[0];
    } else if (email) {
      const byEmail = await pool.query(
        `SELECT id, email, name, phone, status, job_type, office_job_areas
         FROM users WHERE email = $1`,
        [email]
      );
      if (byEmail.rowCount && byEmail.rowCount > 0) {
        const linked = await pool.query(
          `UPDATE users
             SET naver_id = $1,
                 avatar_url = COALESCE(avatar_url, $2),
                 phone = COALESCE(phone, $3),
                 last_login_at = NOW()
           WHERE id = $4
           RETURNING id, email, name, phone, status, job_type, office_job_areas`,
          [naverId, profileImage, phone, byEmail.rows[0].id]
        );
        user = linked.rows[0];
      }
    }

    if (!user) {
      isNew = true;
      const ins = await pool.query(
        `INSERT INTO users (naver_id, name, email, phone, avatar_url, status)
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
         RETURNING id, email, name, phone, status, job_type, office_job_areas`,
        [naverId, nickname, email, phone, profileImage]
      );
      user = ins.rows[0];
    }

    if (user.status && user.status !== "ACTIVE") {
      return NextResponse.redirect(`${base}/login?naver_error=inactive`);
    }

    if (!isNew) {
      pool
        .query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id])
        .catch((e) => console.error("[update last_login_at]", e));
    }

    const accessToken = signAccessToken({
      sub: user.id,
      owner_type: "user",
      role: "user",
    });

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

    // 카카오와 같은 1회용 쿠키 규약 — 클라이언트 콜백 화면이 읽어 localStorage 로 옮긴다.
    const b64 = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
    const res = NextResponse.redirect(`${base}/login/social/callback`);
    res.cookies.set("social_auth", b64, {
      maxAge: 60,
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });
    res.cookies.set("naver_state", "", { maxAge: 0, path: "/" });
    return res;
  } catch (e) {
    console.error("[naver callback]", e);
    return NextResponse.redirect(`${base}/login?naver_error=exception`);
  }
}
