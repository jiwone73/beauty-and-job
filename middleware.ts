import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { 시험환경 } from "@/lib/appEnv";

/**
 * 오픈(2026-10-12) 전 사이트 전체를 막는다.
 *
 * 홍보도 안 했는데 카카오 로그인으로 실제 가입이 들어온 걸 보고
 * ("회원가입 유입이 된 건이 있으면") 급히 닫는다. 크론(예약 작업)은 사람이
 * 보는 화면이 아니라 서버가 비밀키로 부르는 것이라 그대로 둔다 — 막으면
 * 노출종료 알림 같은 예약 작업이 멈춘다.
 *
 * 테스트는 계속해야 하니(10/12까지 안정화 기간) ?access=코드 로 한 번 들어오면
 * 쿠키로 30일간 기억해 그 다음부터는 그냥 들어간다.
 *
 * beautywork.co.kr(실제 도메인)만 막는다 — vercel.app 기본 도메인은 내가
 * 작업 확인할 때 계속 써야 한다("beauty-work.vercel.app 이건 막으면 안되지").
 */
const BYPASS_COOKIE = "bw_preview";
const SECRET = process.env.PREVIEW_ACCESS_CODE || "beautywork1012";
const GATED_HOST = "beautywork.co.kr";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // 시험(staging) 사이트 — 실제 사람에게 닿거나 요금이 나가는 길은 막는다.
  //  · 예약 작업(크론): Vercel 이 시험 프로젝트에서도 부르므로 아무 일도 하지 않고 돌려보낸다.
  //  · 카카오·네이버 로그인: 시험 사이트 주소가 등록돼 있지 않고, 진짜 계정이 시험 DB 에 생기면 안 된다.
  //  · 검색엔진: 늘 막는다(robots.txt 와 별개로 응답 머리글에도 적는다).
  if (시험환경) {
    if (pathname.startsWith("/api/cron")) {
      return NextResponse.json({ success: true, skipped: "staging" });
    }
    if (pathname.startsWith("/api/auth/kakao") || pathname.startsWith("/api/auth/naver")) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = pathname.startsWith("/api/auth/kakao") ? "?kakao_error=staging" : "?naver_error=staging";
      return NextResponse.redirect(url);
    }
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return res;
  }

  if (pathname.startsWith("/api/cron")) {
    return NextResponse.next();
  }

  const host = (req.headers.get("host") || "").toLowerCase();
  if (!host.endsWith(GATED_HOST)) {
    return NextResponse.next();
  }

  const code = searchParams.get("access");
  if (code === SECRET) {
    const url = req.nextUrl.clone();
    url.searchParams.delete("access");
    const res = NextResponse.redirect(url);
    res.cookies.set(BYPASS_COOKIE, SECRET, { httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: "/" });
    return res;
  }

  if (req.cookies.get(BYPASS_COOKIE)?.value === SECRET) {
    return NextResponse.next();
  }

  return new NextResponse(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>뷰티워크</title></head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;background:#faf9fb;">
  <div style="text-align:center;color:#555;padding:0 20px;">
    <h1 style="font-size:19px;font-weight:600;margin:0 0 8px;">오픈 준비중입니다</h1>
    <p style="font-size:14px;margin:0;">더 좋은 모습으로 곧 찾아뵙겠습니다.</p>
  </div>
</body></html>`,
    { status: 503, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
