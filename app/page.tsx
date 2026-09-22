import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";

// 제목·설명은 app/layout.tsx 의 기본값을 그대로 물려받는다(이미 홈에
// 맞는 문구다) — canonical만 명시해 다른 형태(예: 물음표 붙은 진입
// 링크)로 들어와도 대표 주소가 하나로 모이게 한다.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <HomePageClient />;
}
