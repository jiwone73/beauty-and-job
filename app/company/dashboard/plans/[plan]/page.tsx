"use client";

import { notFound, useParams } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import PlanDetail from "@/components/company/PlanDetail";
import { 플랜, 플랜인가, type PlanId } from "@/lib/companyPlans";

/** 채용상품 안의 상품 하나. 사이드에서 이름을 누르면 여기로 온다. */
export default function CompanyDashboardPlanDetailPage() {
  const 자리 = String(useParams()?.plan || "").toUpperCase();
  if (!플랜인가(자리)) notFound();
  const id = 자리 as PlanId;

  return (
    // 제목은 본문이 스스로 적는다 — 「채용공고 상품 / 라이트 / 한 줄」이 한
    // 덩어리라, 이름만 떼어 화면 위에 따로 세우면 그 덩어리가 머리를 잃는다.
    <CompanyLayout activePage={`plan-${자리.toLowerCase()}`} title={플랜[id].name} 제목숨김>
      <div className="co-plans">
        <PlanDetail id={id} />
      </div>
    </CompanyLayout>
  );
}
