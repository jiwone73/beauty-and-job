export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// 네이버 로그인 시작 — 카카오와 같은 구조.
// state 는 CSRF 방지용이라 쿠키에 담아 두고 콜백에서 대조한다.
// 키는 '네이버 아이디로 로그인'을 신청한 앱의 것이어야 한다.
// (뉴스레터가 쓰는 검색 API 앱 키로는 로그인이 되지 않는다 — 앱 설정 오류로 튕긴다.)
export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  // 콘솔에서 복사해 붙이면 값 앞뒤에 공백·탭이 딸려 오는 일이 잦다. 그대로 보내면 네이버가 앱을 못 찾는다.
  const clientId = (process.env.NAVER_LOGIN_CLIENT_ID || "").trim();
  if (!clientId) {
    return NextResponse.redirect(`${base}/login?naver_error=not_configured`);
  }
  const state = crypto.randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: clientId,
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
