export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import CompanyServiceView from "@/components/company/CompanyServiceView";
import { 기업이벤트읽기 } from "@/lib/companyEvent.server";

export const metadata: Metadata = {
  title: "뷰티업계 채용공고 등록 | 뷰티워크",
  description: "헤어·네일·피부·메이크업 매장부터 화장품 브랜드 본사까지, 뷰티워크에서 채용공고를 등록하세요.",
  alternates: { canonical: "/company" },
};

/**
 * 기업 서비스 소개.
 *
 * 이벤트 여부를 서버에서 정해 내려준다. 브라우저에서 받아 오던 때는 첫 칠에
 * 원래 배너와 원래 제목이 그려졌다가 잠시 뒤 이벤트 것으로 갈렸다 — 보는
 * 사람에게는 그것이 깜빡임이다.
 */
export default async function CompanyServicePage() {
  const 이벤트 = await 기업이벤트읽기();
  return <CompanyServiceView 이벤트={이벤트} />;
}
