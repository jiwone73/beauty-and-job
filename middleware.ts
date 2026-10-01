import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
 */
const BYPASS_COOKIE = "bw_preview";
const SECRET = process.env.PREVIEW_ACCESS_CODE || "beautywork1012";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (pathname.startsWith("/api/cron")) {
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
