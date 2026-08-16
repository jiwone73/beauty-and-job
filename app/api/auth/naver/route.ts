export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// 네이버 로그인 시작 — 카카오와 같은 구조.
// state 는 CSRF 방지용이라 쿠키에 담아 두고 콜백에서 대조한다.
export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  const state = crypto.randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: process.env.NAVER_CLIENT_ID!,
    redirect_uri: `${base}/api/auth/naver/callback`,
    response_type: "code",
    state,
  });
  const res = NextResponse.redirect(
    `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`
  );
  res.cookies.set("naver_state", state, {
    maxAge: 300,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  return res;
}
