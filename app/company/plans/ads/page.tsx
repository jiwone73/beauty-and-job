"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ServiceHeader from "@/components/company/ServiceHeader";
import EventBand from "@/components/company/EventBand";
import { 광고상품 } from "@/lib/adProducts";

/**
 * 배너광고 상품 안내 — 아직 가입 전인 곳이 보는 쪽.
 *
 * 대시보드 안쪽에만 있던 화면이라, 가입하지 않은 사장님은 배너광고가 있는
 * 줄도 몰랐다. 상품 설명은 로그인 뒤에 보여 줄 것이 아니다.
 */
export default function CompanyAdsPlansPage() {
  return (
    <div className="cs-page">
      <ServiceHeader />
      <section className="cs-wrap">
        <h2 className="cs-h2">배너광고 상품 안내</h2>
        <EventBand />
        <p className="cs-lead" style={{ marginTop: 0, marginBottom: 22 }}>
          공고가 아니라 <b>자리</b>를 사는 상품입니다. 브랜드·교육·장비를 알리는 데 씁니다.
        </p>
        <div className="cs-ads">
          {광고상품.map((a) => (
            <Link key={a.id} href="/company/ads" className="cs-ad">
              <span className="cs-ad-nm">{a.name}</span>
              <span className="cs-ad-where">{a.자리}</span>
              <span className="cs-ad-sum">{a.한줄}</span>
            </Link>
          ))}
        </div>
        <div className="cs-center" style={{ marginTop: 34 }}>
          <Link href="/company/ads" className="cs-btn-fill lg">
            값과 자세한 설명 보기 <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
}
