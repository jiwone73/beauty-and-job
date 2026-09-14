"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { 플랜, 베이직, 원, type PlanId } from "@/lib/companyPlans";

/**
 * 요금제 카드 넉 장. 기업서비스 첫 화면과 요금제 상세가 같은 것을 쓴다.
 *
 * 카드에는 30일 값과 그 플랜에서 새로 생기는 혜택만 적는다. 기간별 값과
 * 전체 비교는 「자세히 보기」 뒤에 있다 — 첫 화면에 숫자를 다 늘어놓으면
 * 고르기 전에 비교부터 하게 된다.
 */

const 카드순서: PlanId[] = ["LIGHT", "STANDARD", "PREMIUM"];

export default function PlanCards({ 자세히 = true }: { 자세히?: boolean }) {
  // 통신판매업 신고 전에는 결제를 열 수 없다. 그동안은 「문의하기」로 받는다.
  const [팔림, set팔림] = useState(false);
  useEffect(() => {
    fetch("/api/plans").then((r) => r.json())
      .then((r) => set팔림(!!r?.data?.sales)).catch(() => {});
  }, []);

  const 살곳 = (p: PlanId) => (팔림 ? `/company/plans/order?plan=${p}` : "/support");

  return (
    <>
      <div className="cs-plans">
        <div className="cs-plan">
          <p className="cs-plan-flag" />
          <p className="cs-plan-nm">{베이직.name}</p>
          <p className="cs-plan-ln">{베이직.한줄}</p>
          <p className="cs-plan-pr">무료</p>
          <p className="cs-plan-du free">공고 게재 {베이직.게재일}일</p>
          <Link href="/company/signup" className="cs-plan-btn free">시작하기</Link>
          {자세히 && <Link href="/company/plans" className="cs-plan-more">자세히 보기 ›</Link>}
          <ul className="cs-plan-feat">
            {베이직.요약.map((t) => <li key={t}><Check size={15} strokeWidth={2.4} />{t}</li>)}
          </ul>
        </div>

        {카드순서.map((p) => {
          const 것 = 플랜[p];
          const 인기 = p === "STANDARD";
          return (
            <div key={p} className={`cs-plan${인기 ? " on" : ""}`}>
              <p className="cs-plan-flag">{인기 ? "인기 플랜" : ""}</p>
              <p className="cs-plan-nm">{것.name}</p>
              <p className="cs-plan-ln">{것.한줄}</p>
              <p className="cs-plan-pr">{원(것.가격[30]).replace("원", "")}<i>원</i></p>
              <p className="cs-plan-du">30일</p>
              <Link href={살곳(p)} className={`cs-plan-btn${인기 ? " on" : ""}`}>
                {팔림 ? "시작하기" : "문의하기"}
              </Link>
              {자세히 && <Link href="/company/plans" className="cs-plan-more">자세히 보기 ›</Link>}
              <p className="cs-plan-inc">{것.포함}</p>
              <ul className="cs-plan-feat">
                {것.요약.map((t) => <li key={t}><Check size={15} strokeWidth={2.4} />{t}</li>)}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="cs-vat">모든 금액은 부가세 포함입니다</p>
    </>
  );
}
