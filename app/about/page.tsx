import type { Metadata } from "next";
import AboutPageClient from "./AboutPageClient";

export const metadata: Metadata = {
  title: "회사 소개 | 뷰티워크",
  description: "뷰티워크는 네일·속눈썹·헤어부터 뷰티 브랜드까지, 뷰티 업계 채용만 모은 특화 채용 플랫폼입니다.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <AboutPageClient />;
}
