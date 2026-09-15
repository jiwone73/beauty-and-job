"use client";

import { Zap, Star, Crown } from "lucide-react";
import Link from "next/link";
import { 플랜, 스타트, 혜택, 비교칸, 시작기간, 원, type PlanId } from "@/lib/companyPlans";

/**
 * 요금제 카드 넉 장. 기업서비스 첫 화면과 요금제 화면이 같은 것을 쓴다.
 *
 * 카드 하나가 곧 그 플랜의 설명서다. 비교표를 따로 세우면 카드에서 고르려던
 * 사람이 표까지 내려가 처음부터 다시 비교하게 된다.
 *
 * 없는 기능은 적지 않는다. 낮은 플랜 것부터 쌓아 적으므로 빠진 줄은 반드시
 * 뒤쪽에만 생기고, 그래서 넉 장의 앞줄이 저절로 가로로 맞는다.
 *
 * 값은 제일 짧은 기간(7일)을 적고 뒤에 「~」를 붙인다. 30일 값을 적어 두면
 * 제일 싼 것이 얼마인지 알려면 눌러 봐야 한다.
 */

const 카드순서: PlanId[] = ["LIGHT", "STANDARD", "PREMIUM"];

/** 파는 물건에만 아이콘을 단다. 스타트는 상품이 아니라 가입하면 놓이는
 *  자리라 아이콘이 없다 — 그 없음이 「이건 사는 것이 아니다」를 말한다.
 *  스탠다드·프리미엄은 메인 채용관 제목에 쓰는 것과 같은 아이콘이다. */
const 아이콘 = { LIGHT: Zap, STANDARD: Star, PREMIUM: Crown } as const;

export function 혜택목록({ 칸 }: { 칸: 0 | 1 | 2 | 3 }) {
  return (
    <ul className="cs-plan-feat">
      {혜택(칸).map((r) => (
        <li key={r.글} className={r.새것 ? "new" : undefined}>{r.글}</li>
      ))}
    </ul>
  );
}

export default function PlanCards() {
  return (
    <>
      <div className="cs-plans">
        <div className="cs-plan">
          <p className="cs-plan-nm">{스타트.name}</p>
          <p className="cs-plan-ln">{스타트.한줄}</p>
          <p className="cs-plan-pr">무료<span className="cs-plan-du free">공고 게재 {스타트.게재일}일</span></p>
          <Link href="/company/signup" className="cs-plan-btn free">시작하기</Link>
          <혜택목록 칸={비교칸.BASIC} />
        </div>

        {카드순서.map((p) => {
          const 것 = 플랜[p];
          return (
            <div key={p} className="cs-plan">
              <p className="cs-plan-nm">
                {(() => { const I = 아이콘[p]; return <I size={17} strokeWidth={2.2} />; })()}
                {것.name}
              </p>
              <p className="cs-plan-ln">{것.한줄}</p>
              <p className="cs-plan-pr">
                {원(것.가격[시작기간]).replace("원", "")}<i>원</i><em>~</em>
                <span className="cs-plan-du">{시작기간}일 기준</span>
              </p>
              {/* 여기서는 고르는 것까지만 한다. 신청은 자세히 보기 안에서 —
                  기간과 값을 보고 나서 누르는 것이 순서다. */}
              <Link href={`/company/plans/${p.toLowerCase()}`}
                className="cs-plan-btn">
                자세히 보기
              </Link>
              <혜택목록 칸={비교칸[p]} />
            </div>
          );
        })}
      </div>
      <p className="cs-vat right">부가세 포함</p>
    </>
  );
}
