"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Minus, ArrowRight } from "lucide-react";
import ServiceHeader from "@/components/company/ServiceHeader";
import PlanCards from "@/components/company/PlanCards";
import { 플랜, 베이직, 기간들, 비교표, 요금제FAQ, 원, 메인칸, 칸수, type PlanId } from "@/lib/companyPlans";

/**
 * 요금제 상세 — 「자세히 보기」가 닿는 자리.
 *
 * 첫 화면(기업서비스)에는 카드 넉 장만 두고, 비교할 것은 전부 여기로 보낸다.
 * 고르기 전에 숫자를 다 늘어놓으면 고르는 대신 비교부터 하게 된다.
 */

const 순서: PlanId[] = ["LIGHT", "STANDARD", "PREMIUM"];

export default function CompanyPlansPage() {
  const [열린질문, set열린질문] = useState<number | null>(null);

  return (
    <div className="cs-page">
      <ServiceHeader />

      <section className="cs-wrap">
        <h2 className="cs-h2">요금제</h2>
        <PlanCards 자세히={false} />
      </section>

      <section className="cs-band">
        <div className="cs-wrap">
          <h2 className="cs-h2">플랜 비교</h2>
          <div className="cs-tablewrap">
            <table className="cs-cmp">
              <thead>
                <tr>
                  <th>　</th>
                  <th>{베이직.name}</th>
                  {순서.map((p) => (
                    <th key={p} className={p === "STANDARD" ? "on" : undefined}>{플랜[p].name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {비교표.map((줄) => (
                  <tr key={줄.항목}>
                    <td>{줄.항목}</td>
                    {줄.값.map((v, i) => (
                      <td key={i} className={v === "—" ? "no" : undefined}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cs-vat">모든 금액은 부가세 포함입니다</p>
        </div>
      </section>

      <section className="cs-wrap">
        <h2 className="cs-h2">기간별 요금</h2>
        <div className="cs-tablewrap">
          <table className="cs-per">
            <thead>
              <tr>
                <th>　</th>
                {순서.map((p) => (
                  <th key={p} className={p === "STANDARD" ? "on" : undefined}>{플랜[p].name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {기간들.map((d) => (
                <tr key={d} className={d === 30 ? "base" : undefined}>
                  <td>{d}일</td>
                  {순서.map((p) => <td key={p}>{원(플랜[p].가격[d])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="cs-vat">모든 금액은 부가세 포함입니다</p>
      </section>

      <section className="cs-band">
        <div className="cs-wrap">
          <h2 className="cs-h2">노출 자리</h2>
          <div className="cs-expo">
            <div className="cs-mock">
              <p className="cs-mock-cap">메인 화면</p>
              <p className="cs-mock-lab">프리미엄 채용관 · {메인칸.PREMIUM.열}칸 × {메인칸.PREMIUM.줄}줄</p>
              <div className="cs-cells c4">
                {Array.from({ length: 메인칸.PREMIUM.열 }).map((_, i) => <span key={i} className="cs-cell p" />)}
              </div>
              <p className="cs-mock-lab">스탠다드 채용관 · {메인칸.STANDARD.열}칸 × {메인칸.STANDARD.줄}줄</p>
              <div className="cs-cells c5">
                {Array.from({ length: 메인칸.STANDARD.열 }).map((_, i) => <span key={i} className="cs-cell s" />)}
              </div>
              <p className="cs-mock-note">5초마다 바뀌며, 덜 노출된 공고가 먼저 앞자리에 섭니다</p>
            </div>
            <div className="cs-mock">
              <p className="cs-mock-cap">검색 결과</p>
              <div className="cs-slist">
                <span className="cs-srow p"><i>프리미엄</i>최상단</span>
                <span className="cs-srow p"><i>프리미엄</i>최상단</span>
                <span className="cs-srow s"><i>스탠다드</i>상단</span>
                <span className="cs-srow s"><i>스탠다드</i>상단</span>
                <span className="cs-srow">라이트 · 일반</span>
                <span className="cs-srow">베이직 · 일반</span>
              </div>
            </div>
          </div>
        </div>
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
