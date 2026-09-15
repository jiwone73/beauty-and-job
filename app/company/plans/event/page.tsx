"use client";

import ServiceHeader from "@/components/company/ServiceHeader";
import EventDetail from "@/components/company/EventDetail";

/** 오픈이벤트 — 아직 가입 전인 곳이 보는 쪽. 단추가 회원가입으로 간다. */
export default function CompanyEventPage() {
  return (
    <div className="cs-page">
      <ServiceHeader />
      <section className="cs-wrap">
        <EventDetail />
      </section>
    </div>
  );
}
