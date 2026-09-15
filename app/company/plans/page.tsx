"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Minus, ArrowRight } from "lucide-react";
import ServiceHeader from "@/components/company/ServiceHeader";
import PlanCards from "@/components/company/PlanCards";
import EventBand from "@/components/company/EventBand";
import { 요금제FAQ } from "@/lib/companyPlans";

/**
 * 요금제 — 고르는 자리.
 *
 * 카드 넉 장과 자주 묻는 질문만 둔다. 예전에는 아래에 플랜 비교·기간별 요금·
 * 노출 자리가 줄줄이 붙어 있었는데, 카드에서 고르려던 사람이 표까지 내려가
 * 처음부터 다시 비교하게 됐다. 비교할 것은 카드 안에 녹였고, 기간별 값과
 * 노출 자리는 카드의 「자세히 보기」 뒤로 보냈다.
 */

export default function CompanyPlansPage() {
  const [열린질문, set열린질문] = useState<number | null>(null);

  return (
    <div className="cs-page">
      <ServiceHeader />

      <section className="cs-wrap">
        <h2 className="cs-h2">요금제</h2>
        <EventBand />
        <PlanCards />
      </section>

      <section className="cs-wrap">
        <h2 className="cs-h2">자주 묻는 질문</h2>
        <ul className="cs-faq">
          {요금제FAQ.map((f, i) => (
            <li key={f.q} className={열린질문 === i ? "on" : undefined}>
              <button type="button" onClick={() => set열린질문(열린질문 === i ? null : i)} aria-expanded={열린질문 === i}>
                <i>Q.</i>
                <span>{f.q}</span>
                {열린질문 === i ? <Minus size={16} /> : <Plus size={16} />}
              </button>
              {열린질문 === i && <p>{f.a}</p>}
            </li>
          ))}
        </ul>
        <div className="cs-center" style={{ marginTop: 30 }}>
          <Link href="/support" className="cs-btn-line lg">
            고객센터 문의하기 <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
}
