"use client";

import CompanyLayout from "@/components/company/CompanyLayout";
import EventBand from "@/components/company/EventBand";
import AdPlanCards from "@/components/company/AdPlanCards";

/** 배너광고 상품 안내 — 로그인한 기업이 보는 쪽. */
export default function CompanyDashboardAdsPage() {
  return (
    <CompanyLayout activePage="plans-ads">
      <div className="co-plans">
        <EventBand 안쪽 />
        <AdPlanCards 안쪽 />
      </div>
    </CompanyLayout>
  );
}
