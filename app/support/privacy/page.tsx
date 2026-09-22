import type { Metadata } from "next";
import PrivacyPageClient from "./PrivacyPageClient";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 뷰티워크",
  description: "뷰티워크의 개인정보 수집·이용·보관에 관한 처리방침입니다.",
  alternates: { canonical: "/support/privacy" },
};

export default function PrivacyPage() {
  return <PrivacyPageClient />;
}
