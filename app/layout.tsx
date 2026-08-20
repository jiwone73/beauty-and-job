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
  // 홈 화면에 추가해 열면 사파리 주소창과 아래 도구모음 없이 뜬다.
  // iOS 16.3 이하는 manifest 의 display 를 안 보고 이 값만 보므로 둘 다 둔다.
  appleWebApp: {
    capable: true,
    title: "뷰티워크",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-180.png",
  },
  // apple- 붙은 쪽은 옛 이름이라 사파리가 "이제 이걸 쓰라"고 알린다.
  // 새 이름도 함께 둔다 — 둘 중 하나만 보는 판이 있어 양쪽을 채운다.
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#5f0080",
  // 밝은 화면만 있다고 머리말에도 적는다. CSS 가 닿기 전에 브라우저가
  // 판단하는 것들이 있어 둘 다 둔다.
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* 매니페스트는 직접 건다. app/manifest.ts 를 쓰면 Next 가 링크에
            crossorigin="use-credentials" 를 붙이는데, 그 값이면 iOS 가
            매니페스트를 건너뛰고 홈 화면 아이콘을 브라우저 모드로 만드는
            일이 있다. 우리 매니페스트는 감출 것이 없으니 그냥 연다. */}
        <link rel="manifest" href="/manifest.json" />
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
