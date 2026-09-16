"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Minus, ArrowRight } from "lucide-react";
import CompanyLayout from "@/components/company/CompanyLayout";
import PlanCards from "@/components/company/PlanCards";
import EventBand from "@/components/company/EventBand";
import { 요금제FAQ } from "@/lib/companyPlans";

/**
 * 채용상품 — 로그인한 기업이 머리줄에서 들어오는 첫 화면.
 *
 * 로그인 전(/company/plans)과 같은 것을 보여 주되 대시보드 껍데기를 두른다.
 * 왼쪽 사이드에 상품 이름이 서고, 카드의 「자세히 보기」와 사이드가 같은 곳으로
 * 간다 — 둘 중 어느 길로 눌러도 같은 화면이어야 한다.
 */
export default function CompanyDashboardPlansPage() {
  const [열린질문, set열린질문] = useState<number | null>(null);

  return (
    <CompanyLayout activePage="plans">
      <div className="co-plans">
        <EventBand 안쪽 요금안내 />
        <PlanCards 안쪽 />

        <h2 className="cs-h2" style={{ marginTop: 56 }}>자주 묻는 질문</h2>
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
      </div>
    </CompanyLayout>
  );
}
