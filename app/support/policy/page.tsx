import type { Metadata } from "next";
import PolicyPageClient from "./PolicyPageClient";

export const metadata: Metadata = {
  title: "회원관리정책 | 뷰티워크",
  description: "뷰티워크 회원의 의무와 준수사항, 이용제한 기준을 안내합니다.",
  alternates: { canonical: "/support/policy" },
};

export default function PolicyPage() {
  return <PolicyPageClient />;
}
