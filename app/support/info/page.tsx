import type { Metadata } from "next";
import SupportInfoClient from "./SupportInfoClient";

export const metadata: Metadata = {
  title: "고객센터 안내 | 뷰티워크",
  description: "뷰티워크 고객센터 운영시간, 이메일, 온라인 문의 안내입니다.",
  alternates: { canonical: "/support/info" },
};

export default function SupportInfoPage() {
  return <SupportInfoClient />;
}
