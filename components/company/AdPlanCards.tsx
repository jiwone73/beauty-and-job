"use client";

import Link from "next/link";
import { Megaphone, Search } from "lucide-react";
import { 면상품, 면이름, 면설명, 면요약, 광고기간, type 광고면 } from "@/lib/adProducts";
import { 원 } from "@/lib/companyPlans";

/**
 * 배너광고 두 장 — 요금제 카드와 같은 짜임이다.
 *
 * 카드에서 정하는 것은 「어느 화면에 걸까」 하나다. 그 안의 낱개 상품은 자세히
 * 보기가 말한다 — 카드에 다 적으면 고르기도 전에 낱개를 견주게 된다.
 */
const 아이콘 = { MAIN: Megaphone, JOBS: Search } as const;

export default function AdPlanCards({ 안쪽 = false }: { 안쪽?: boolean }) {
  const 바탕 = 안쪽 ? "/company/dashboard/plans/ads" : "/company/plans/ads";
  const 면들: 광고면[] = ["MAIN", "JOBS"];

  return (
    <>
      <div className="cs-plans ad2">
        {면들.map((면) => {
          const Icon = 아이콘[면];
          // 값이 있는 것 중 제일 싼 것을 「…부터」로 적는다. 다 협의면 협의다.
          const 값들 = 면상품(면).flatMap((x) =>
            광고기간.map((d) => x.가격[d]).filter((v): v is number => v !== null));
          const 시작값 = 값들.length ? Math.min(...값들) : null;
          return (
            <div key={면} className="cs-plan">
              <p className="cs-plan-nm"><Icon size={17} strokeWidth={2.2} />{면이름[면]}</p>
              <p className="cs-plan-ln">{면설명[면]}</p>
              <p className="cs-plan-pr">
                {시작값 === null ? "협의" : <>{원(시작값).replace("원", "")}<i>원</i><em>~</em></>}
                <span className="cs-plan-du">{시작값 === null ? "기간·자리별 견적" : `${광고기간[0]}일 기준`}</span>
              </p>
              {/* 단추가 목록 위에 선다 — 요금제 카드와 같은 차례다. 목록을 위에
                  두면 갈래마다 줄 수가 달라 단추 자리가 어긋난다. */}
              <Link href={`${바탕}/${면 === "MAIN" ? "main" : "jobs"}`} className="cs-plan-btn">
                자세히 보기
              </Link>
              <ul className="cs-plan-feat">
                {면요약[면].map((줄) => <li key={줄}>{줄}</li>)}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="cs-vat right">부가세 포함</p>
    </>
  );
}
