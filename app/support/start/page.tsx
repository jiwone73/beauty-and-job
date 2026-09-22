import type { Metadata } from "next";
import StartPageClient from "./StartPageClient";

export function generateMetadata({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }): Metadata {
  const 기업 = searchParams?.누구 === "기업";
  return {
    title: `시작하기 - ${기업 ? "기업회원" : "개인회원"} | 뷰티워크`,
    description: 기업
      ? "뷰티워크 기업회원 가입부터 채용공고 등록까지 처음 시작하는 방법을 안내합니다."
      : "뷰티워크 개인회원 가입부터 이력서 등록, 지원까지 처음 시작하는 방법을 안내합니다.",
    alternates: { canonical: `/support/start?누구=${기업 ? "기업" : "개인"}` },
  };
}

export default function StartPage() {
  return <StartPageClient />;
}
