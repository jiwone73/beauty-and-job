"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { 플랜, 베이직, 비교표, 비교칸, 시작기간, 원, type PlanId } from "@/lib/companyPlans";

/**
 * 요금제 카드 넉 장. 기업서비스 첫 화면과 요금제 화면이 같은 것을 쓴다.
 *
 * 비교표를 따로 세우지 않고 카드 안에 녹인다. 표를 밑에 따로 두면 카드에서
 * 고르려던 사람이 표까지 내려가 처음부터 다시 비교하게 되고, 같은 값을 두
 * 군데 적게 되어 언젠가 한쪽만 바뀐다.
 *
 * 값은 제일 짧은 기간(7일)을 적고 뒤에 「~」를 붙인다. 30일 값을 적어 두면
 * 제일 싼 것이 얼마인지 알려면 눌러 봐야 한다. 기간별 값은 자세히 보기에 있다.
 */

const 카드순서: PlanId[] = ["LIGHT", "STANDARD", "PREMIUM"];

function 줄들(칸: 0 | 1 | 2 | 3) {
  return 비교표.map((r) => ({ 항목: r.항목, 값: r.값[칸], 없음: r.값[칸] === "—" }));
}

function 항목목록({ 칸 }: { 칸: 0 | 1 | 2 | 3 }) {
  return (
    <ul className="cs-plan-feat">
      {줄들(칸).map((r) => (
        <li key={r.항목} className={r.없음 ? "off" : undefined}>
          <Check size={15} strokeWidth={2.4} />
          <span className="k">{r.항목}</span>
          <b className="v">{r.없음 ? "제공 안 함" : r.값}</b>
        </li>
      ))}
    </ul>
  );
}

export default function PlanCards() {
  return (
    <>
      <div className="cs-plans">
        <div className="cs-plan">
          <p className="cs-plan-nm">{베이직.name}</p>
          <p className="cs-plan-ln">{베이직.한줄}</p>
          <p className="cs-plan-pr">무료</p>
          <p className="cs-plan-du free">공고 게재 {베이직.게재일}일</p>
          <Link href="/company/signup" className="cs-plan-btn free">시작하기</Link>
          <항목목록 칸={비교칸.BASIC} />
        </div>

        {카드순서.map((p) => {
          const 것 = 플랜[p];
          return (
            <div key={p} className={`cs-plan${p === "STANDARD" ? " on" : ""}`}>
              <p className="cs-plan-nm">{것.name}</p>
              <p className="cs-plan-ln">{것.한줄}</p>
              <p className="cs-plan-pr">{원(것.가격[시작기간]).replace("원", "")}<i>원~</i></p>
              <p className="cs-plan-du">{시작기간}일 기준</p>
              {/* 여기서는 고르는 것까지만 한다. 신청은 자세히 보기 안에서 —
                  기간과 값을 보고 나서 누르는 것이 순서다. */}
              <Link href={`/company/plans/${p.toLowerCase()}`}
                className={`cs-plan-btn${p === "STANDARD" ? " on" : ""}`}>
                자세히 보기
              </Link>
              <p className="cs-plan-inc">{것.포함}</p>
              <항목목록 칸={비교칸[p]} />
            </div>
          );
        })}
      </div>
      <p className="cs-vat">모든 금액은 부가세 포함입니다</p>
    </>
  );
}
