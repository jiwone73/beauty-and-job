"use client";

import ServiceHeader from "@/components/company/ServiceHeader";
import EventBand from "@/components/company/EventBand";
import AdPlanCards from "@/components/company/AdPlanCards";

/**
 * 배너광고 상품 안내 — 고르는 자리. 채용공고 상품 안내와 같은 짜임이다.
 * 카드 둘에서 화면을 고르고, 상품 낱개와 값은 「자세히 보기」 뒤에 있다.
 */
export default function CompanyAdsPlansPage() {
  return (
    <div className="cs-page">
      <ServiceHeader />
      <section className="cs-wrap">
        <h2 className="cs-h2">배너광고 상품 안내</h2>
        <EventBand />
        <AdPlanCards />
      </section>
    </div>
  );
}
