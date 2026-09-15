"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CompanyLayout from "@/components/company/CompanyLayout";
import { 광고상품 } from "@/lib/adProducts";

/**
 * 배너광고 상품 안내.
 *
 * 채용공고 상품과 나눠 둔 까닭은 파는 물건이 다르기 때문이다 — 저쪽은 공고를
 * 거는 권리를 팔고, 이쪽은 화면의 자리를 판다. 한 화면에 같이 두면 요금제 카드
 * 아래 딸린 곁다리로 읽힌다.
 *
 * 값과 자세한 설명은 /company/ads 가 갖고 있다. 여기서는 「어디에 뜨는가」까지만
 * 보여 준다 — 광고 자리를 고르는 기준은 그것 하나다.
 */
export default function CompanyDashboardAdsPage() {
  return (
    <CompanyLayout activePage="plans-ads">
      <div className="co-plans">
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
      </div>
    </CompanyLayout>
  );
}
