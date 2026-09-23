"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CompanyLayout from "@/components/company/CompanyLayout";
import PlanCards from "@/components/company/PlanCards";
import EventBand from "@/components/company/EventBand";

/**
 * 채용상품 — 로그인한 기업이 머리줄에서 들어오는 첫 화면.
 *
 * 로그인 전(/company/plans)과 같은 것을 보여 주되 대시보드 껍데기를 두른다.
 * 왼쪽 사이드에 상품 이름이 서고, 카드의 「자세히 보기」와 사이드가 같은 곳으로
 * 간다 — 둘 중 어느 길로 눌러도 같은 화면이어야 한다.
 */
export default function CompanyDashboardPlansPage() {
  return (
    <CompanyLayout activePage="plans">
      <div className="co-plans">
        <EventBand 요금안내 />
        <PlanCards 안쪽 />

        <p style={{ fontSize: 14.5, color: "#555", lineHeight: 1.7, marginTop: 56 }}>
          요금제 자주 묻는 질문은{" "}
          <Link href="/support/faq?누구=기업" style={{ color: "#582681", fontWeight: 600 }}>
            기업회원 FAQ
          </Link>
          에서 확인하실 수 있습니다.
        </p>
        <div className="cs-center" style={{ marginTop: 30 }}>
          <Link href="/support" className="cs-btn-line lg">
            1:1 문의하기 <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </CompanyLayout>
  );
}
