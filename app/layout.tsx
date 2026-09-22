import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomTabBar from "@/components/BottomTabBar";
import AuthInterceptor from "@/components/AuthInterceptor";
import RoleGuard from "@/components/RoleGuard";
import VisitBeacon from "@/components/VisitBeacon";
import { 검색공개 } from "@/lib/robotsGate";

export const metadata: Metadata = {
  // 상대경로로 준 OG 이미지 등을 절대주소로 바꾸는 기준. 오픈 전에도 미리
  // 박아 둔다 — 이 값이 없으면 페이지마다 OG 이미지가 다 깨진 채로 뜬다.
  metadataBase: new URL("https://beautywork.co.kr"),
  // lib/robotsGate.js 하나로 이 값과 robots.ts·next.config.js 를 같이 묶는다.
  robots: 검색공개 ? { index: true, follow: true } : { index: false, follow: false },
  title: "뷰티워크 | 뷰티업계 구인구직·채용정보",
  description:
    "살롱·샵 현장부터 브랜드 오피스까지, 뷰티업계 일자리를 한곳에서. 헤어·네일·피부·메이크업·화장품 브랜드 채용정보를 확인하세요.",
  keywords: ["뷰티 채용", "화장품 채용", "뷰티 커리어", "BeautyWork"],
  // 네이버·구글이 제목·설명과 함께 종합해서 보는 값. 카카오톡 등에 링크를
  // 공유했을 때 뜨는 미리보기도 이 값을 쓴다.
  openGraph: {
    type: "website",
    title: "뷰티워크 | 뷰티업계 구인구직·채용정보",
    description: "살롱·샵 현장부터 브랜드 오피스까지, 뷰티업계 일자리를 한곳에서.",
    url: "/",
    images: ["/icons/icon-512.png"],
  },
  twitter: {
    card: "summary",
    title: "뷰티워크 | 뷰티업계 구인구직·채용정보",
    description: "살롱·샵 현장부터 브랜드 오피스까지, 뷰티업계 일자리를 한곳에서.",
    images: ["/icons/icon-512.png"],
  },
  // 구글 서치콘솔·네이버 서치어드바이저 소유확인(HTML 태그 방식).
  // 정용희 계정으로 등록(2026-09-22).
  verification: {
    google: "_kN7lXdp06PiofqILys3xwoGTWNz_GJCg50Uix8nlSI",
    other: {
      "naver-site-verification": "ec4dd9319137507a18b98a99d8a0b1b17d84e015",
    },
  },
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
  themeColor: "#582681",
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
        {/* 네이버·구글이 사이트와 SNS 채널의 관계를 읽는 자리(sameAs).
            연락처 등 없는 값은 안 적는다 — 회사 정보 자체가 아니라 이
            서비스(뷰티워크)를 알리는 조직 정보라 companyIdentity 같은
            사업자 값과는 따로 둔다. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "뷰티워크",
              url: "https://beautywork.co.kr",
              logo: "https://beautywork.co.kr/icons/icon-512.png",
              sameAs: ["https://www.instagram.com/beautywork.kr/"],
            }),
          }}
        />
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
