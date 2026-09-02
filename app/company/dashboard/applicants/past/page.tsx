"use client";
import ApplicantsScreen from "@/components/company/ApplicantsScreen";

// 지난 지원자 — 마감된 공고의 지원자. 목록은 같은 화면을 쓰고 범위만 바꾼다.
export default function PastApplicantsPage() {
  return <ApplicantsScreen scope="past" />;
}
