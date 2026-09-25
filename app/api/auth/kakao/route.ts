export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  const params = new URLSearchParams({
    client_id: (process.env.KAKAO_REST_API_KEY || "").trim(),
    redirect_uri: `${base}/api/auth/kakao/callback`,
    response_type: "code",
  });
  // ?reprompt=1 — 카카오가 폰에 로그인돼 있는 계정으로 곧장 넘기지 않고 로그인 화면을 다시 띄우게 한다.
  // 다른 카카오 계정으로 자동 진행돼 가입 화면이 뜨는 일을 풀어 볼 때 쓴다. 평소 로그인은 그대로 둔다.
  if (new URL(req.url).searchParams.get("reprompt") === "1") params.set("prompt", "login");
  return NextResponse.redirect(
    `https://kauth.kakao.com/oauth/authorize?${params.toString()}`
  );
}