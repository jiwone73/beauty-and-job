import type { Metadata } from "next";
import SupportPageClient from "./SupportPageClient";

export const metadata: Metadata = {
  title: "1:1 문의하기 | 뷰티워크 고객센터",
  description: "뷰티워크 이용 중 궁금한 점을 1:1 문의로 남겨 주세요.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return <SupportPageClient />;
}
