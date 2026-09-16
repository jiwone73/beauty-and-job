"use client";

import CompanyLayout from "@/components/company/CompanyLayout";
import EventDetail from "@/components/company/EventDetail";

/** 오픈이벤트 — 상품안내 안에 상품처럼 선다. 이미 가입한 곳이 보는 쪽. */
export default function CompanyDashboardEventPage() {
  return (
    <CompanyLayout activePage="plans-event" 제목숨김>
      <div className="co-plans">
        <EventDetail />
      </div>
    </CompanyLayout>
  );
}
