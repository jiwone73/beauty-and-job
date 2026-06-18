import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomTabBar from "@/components/BottomTabBar";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "뷰티앤잡 | 뷰티 커리어의 시작과 성장",
  description:
    "전문가 채용부터 업계 트렌드까지, 뷰티 산업 종사자를 위한 채용 플랫폼 뷰티앤잡",
  keywords: ["뷰티 채용", "화장품 채용", "뷰티 커리어", "Beauty&Job"],
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
      <body className="font-sans">
        {children}
        <BottomTabBar />
      </body>
    </html>
  );
}
