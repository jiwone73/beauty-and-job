import type { Metadata } from "next";
import TermsPageClient from "./TermsPageClient";

export const metadata: Metadata = {
  title: "이용약관 | 뷰티워크",
  description: "뷰티워크 서비스 이용에 관한 약관입니다.",
  alternates: { canonical: "/support/terms" },
};

export default function TermsPage() {
  return <TermsPageClient />;
}
