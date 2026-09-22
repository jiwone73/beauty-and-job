import type { Metadata } from "next";
import FaqPageClient from "./FaqPageClient";

export function generateMetadata({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }): Metadata {
  const 기업 = searchParams?.누구 === "기업";
  return {
    title: `자주 묻는 질문(FAQ) - ${기업 ? "기업회원" : "개인회원"} | 뷰티워크`,
    description: 기업
      ? "뷰티워크 기업회원의 채용공고 등록, 인재검색, 결제 관련 자주 묻는 질문입니다."
      : "뷰티워크 개인회원의 이력서, 지원, 채팅 관련 자주 묻는 질문입니다.",
    alternates: { canonical: `/support/faq?누구=${기업 ? "기업" : "개인"}` },
  };
}

export default function FaqPage() {
  return <FaqPageClient />;
}
