"use client";

import Link from "next/link";
import { Megaphone, Search } from "lucide-react";
import { 면상품, 면이름, 면설명, 광고기간, type 광고면 } from "@/lib/adProducts";
import { 원 } from "@/lib/companyPlans";

/**
 * 배너광고 두 장 — 요금제 카드와 같은 짜임이다.
 *
 * 고르는 기준이 「어디에 뜨는가」 하나라 카드도 화면 단위로 둘이다. 상품
 * 낱개(직군별 배너 등)는 카드에 다 늘어놓지 않고 「자세히 보기」 뒤로 보낸다.
 */
const 아이콘 = { MAIN: Megaphone, JOBS: Search } as const;

export default function AdPlanCards({ 안쪽 = false }: { 안쪽?: boolean }) {
  const 바탕 = 안쪽 ? "/company/dashboard/plans/ads" : "/company/plans/ads";
  const 면들: 광고면[] = ["MAIN", "JOBS"];

  return (
    <div className="cs-plans ad2">
      {면들.map((면) => {
        const Icon = 아이콘[면];
        const 것들 = 면상품(면);
        // 값이 있는 것 중 제일 짧은 기간의 값을 「…부터」로 적는다. 다 협의면 협의다.
        const 값들 = 것들.flatMap((x) => 광고기간.map((d) => x.가격[d]).filter((v): v is number => v !== null));
        const 시작값 = 값들.length ? Math.min(...값들) : null;
        return (
          <div key={면} className="cs-plan">
            <p className="cs-plan-nm"><Icon size={17} />{면이름[면]}</p>
            <p className="cs-plan-ln">{면설명[면]}</p>
            <p className="cs-plan-amt">
              {시작값 === null ? <em>협의</em> : <>{원(시작값).replace("원", "")}<i>원</i><em>~</em></>}
            </p>
            <p className="cs-vat right">{시작값 === null ? "기간·자리에 따라 견적" : `${광고기간[0]}일 기준 · 부가세 별도`}</p>
            <ul className="cs-plan-li">
              {것들.map((x) => (
                <li key={x.id}><b>{x.name}</b><span>{x.자리}</span></li>
              ))}
            </ul>
            <Link href={`${바탕}/${면 === "MAIN" ? "main" : "jobs"}`} className="cs-plan-btn">자세히 보기</Link>
          </div>
        );
      })}
    </div>
  );
}
