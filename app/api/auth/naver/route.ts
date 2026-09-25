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
  // ?reprompt=1 — 네이버가 로그인돼 있는 계정으로 곧장 넘기지 않고 아이디·비밀번호를 다시 묻게 한다.
  // 폰에 다른 네이버 계정이 로그인돼 있거나, 개발 중 상태에서 등록되지 않은 아이디로 막혔을 때
  // 계정을 바꿔 다시 시도하는 길이다. 평소 로그인은 그대로 둔다(매번 다시 묻는 것은 불편하다).
  // 지난번 시도가 끝나지 않았으면(시작 때 심은 state 쿠키가 아직 남아 있으면) 자동으로도 같은 일을 한다 —
  // 네이버가 「등록된 아이디만 로그인할 수 있다」는 오류 화면에서 멈추면 우리 쪽으로 돌아오지 못하니,
  // 그 자리에서 다시 눌렀을 때 곧장 로그인 화면이 뜨게 한다.
  const 지난시도남음 = !!req.cookies.get("naver_state")?.value;
  if (new URL(req.url).searchParams.get("reprompt") === "1" || 지난시도남음) params.set("auth_type", "reprompt");
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
