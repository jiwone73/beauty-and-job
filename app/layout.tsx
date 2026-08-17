import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomTabBar from "@/components/BottomTabBar";
import AuthInterceptor from "@/components/AuthInterceptor";
import RoleGuard from "@/components/RoleGuard";
import VisitBeacon from "@/components/VisitBeacon";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "뷰티워크 | 뷰티 커리어의 시작과 성장",
  description:
    "전문가 채용부터 업계 트렌드까지, 뷰티 산업 종사자를 위한 채용 플랫폼 뷰티워크",
  keywords: ["뷰티 채용", "화장품 채용", "뷰티 커리어", "BeautyWork"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#5f0080",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* '로그인 유지'를 끈 사람 정리 — lib/auth/session.ts 참고.
            세션 쿠키가 사라졌다면 브라우저가 닫혔던 것이므로 토큰을 버린다.
            화면을 그리기 전에 끝내야 로그인된 헤더가 번쩍이지 않는다. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{
  if(localStorage.getItem('bw_login_session_only')==='1' &&
     !document.cookie.split('; ').some(function(c){return c.indexOf('bw_sess=')===0})){
    ['access_token','beautynjob-auth','beautynjob-profile','beautynjob-applications','bw_login_session_only']
      .forEach(function(k){localStorage.removeItem(k)});
  }
}catch(e){}`,
          }}
        />
      </head>
      <body className="font-sans">
        <AuthInterceptor />
        <RoleGuard />
        <VisitBeacon />
        {children}
        <BottomTabBar />
      </body>
    </html>
  );
}
