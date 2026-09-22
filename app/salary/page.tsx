import type { Metadata } from "next";
import SalaryPageClient from "./SalaryPageClient";

export const metadata: Metadata = {
  title: "뷰티 업계 직무별 연봉정보 | 뷰티워크",
  description: "마케팅·MD·디자인·영업 등 뷰티 업계 오피스 직무의 연차별 평균 연봉을 확인하세요.",
  alternates: { canonical: "/salary" },
};

export default function SalaryPage() {
  return <SalaryPageClient />;
}
