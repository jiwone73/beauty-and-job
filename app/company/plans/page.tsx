"use client";

import Link from "next/link";
import ServiceHeader from "@/components/company/ServiceHeader";
import PlanCards from "@/components/company/PlanCards";
import EventBand from "@/components/company/EventBand";

/**
 * 요금제 — 고르는 자리.
 *
 * 카드 넉 장과 자주 묻는 질문만 둔다. 예전에는 아래에 플랜 비교·기간별 요금·
 * 노출 자리가 줄줄이 붙어 있었는데, 카드에서 고르려던 사람이 표까지 내려가
 * 처음부터 다시 비교하게 됐다. 비교할 것은 카드 안에 녹였고, 기간별 값과
 * 노출 자리는 카드의 「자세히 보기」 뒤로 보냈다.
 */

export default function CompanyPlansPage() {
  return (
    <div className="cs-page">
      <ServiceHeader />

      <section className="cs-wrap">
        <h2 className="cs-h2">요금제</h2>
        <EventBand 요금안내 />
        <PlanCards />
      </section>

      <section className="cs-wrap">
        <p style={{ fontSize: 14.5, color: "#555", lineHeight: 1.7 }}>
          요금제 자주 묻는 질문은{" "}
          <Link href="/support/faq?누구=기업" style={{ color: "#582681", fontWeight: 600 }}>
            기업회원 FAQ
          </Link>
          에서 확인하실 수 있습니다. 그래도 궁금한 점이 해결되지 않으면{" "}
          <Link href="/support" style={{ color: "#582681", fontWeight: 600 }}>
            1:1 문의하기
          </Link>
          로 문의해 주세요.
        </p>
      </section>
    </div>
  );
}
