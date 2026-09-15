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
    <CompanyLayout activePage={`plan-${자리.toLowerCase()}`} title={플랜[id].name}>
      <div className="co-plans">
        <PlanDetail id={id} 이름보임={false} />
      </div>
    </CompanyLayout>
  );
}
