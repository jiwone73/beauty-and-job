"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ServiceHeader from "@/components/company/ServiceHeader";
import { 플랜, 기간들, 비교칸, 원, 메인칸, 플랜인가, type PlanId } from "@/lib/companyPlans";
import { 혜택목록 } from "@/components/company/PlanCards";

/**
 * 플랜 하나를 자세히 — 카드의 「자세히 보기」가 닿는 자리.
 *
 * 요금제 화면에는 고를 것만 두고, 여기서 무엇을 사는지 끝까지 보여 준다.
 * 기간별 값과 노출 자리가 여기 있는 까닭은 고른 다음에 정할 것들이기 때문이다.
 * 신청 단추도 여기 있다 — 기간과 값을 보고 나서 누르는 것이 순서다.
 */
export default function PlanDetailPage() {
  const 자리 = String(useParams()?.plan || "").toUpperCase();
  if (!플랜인가(자리)) notFound();
  const id = 자리 as PlanId;
  const 것 = 플랜[id];
  const 칸 = 비교칸[id];

  // 통신판매업 신고 전에는 결제를 열 수 없다. 그동안은 고객센터로 받는다.
  const [팔림, set팔림] = useState(false);
  useEffect(() => {
    fetch("/api/plans").then((r) => r.json())
      .then((r) => set팔림(!!r?.data?.sales)).catch(() => {});
  }, []);

  const 메인 = 것.메인;

  return (
    <div className="cs-page">
      <ServiceHeader />

      <section className="cs-wrap">
        <Link href="/company/plans" className="cs-back"><ArrowLeft size={16} /> 요금제</Link>
        <h2 className="cs-h2">{것.name}</h2>
        <p className="cs-lead">{것.한줄}</p>
      </section>

      <section className="cs-wrap">
        <h3 className="cs-h3">이 플랜이 주는 것</h3>
        <div className="cs-feat-wide">
          <혜택목록 칸={칸} />
        </div>
      </section>

      <section className="cs-band">
        <div className="cs-wrap">
          <h3 className="cs-h3">기간별 요금</h3>
          <div className="cs-tablewrap">
            <table className="cs-per">
              <tbody>
                {기간들.map((d) => (
                  <tr key={d}>
                    <td>{d}일</td>
                    <td>{원(것.가격[d])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cs-vat">모든 금액은 부가세 포함입니다</p>
        </div>
      </section>

      <section className="cs-wrap">
        <h3 className="cs-h3">노출 자리</h3>
        <div className="cs-expo">
          {메인 && (
            <div className="cs-mock">
              <p className="cs-mock-cap">메인 화면</p>
              <p className="cs-mock-lab">
                {것.name} 채용관 · {메인칸[메인].열}칸 × {메인칸[메인].줄}줄
              </p>
              <div className={`cs-cells c${메인칸[메인].열}`}>
                {Array.from({ length: 메인칸[메인].열 }).map((_, i) => (
                  <span key={i} className={`cs-cell ${메인 === "PREMIUM" ? "p" : "s"}`} />
                ))}
              </div>
              <p className="cs-mock-note">5초마다 바뀌며, 덜 노출된 공고가 먼저 앞자리에 섭니다</p>
            </div>
          )}
          <div className="cs-mock">
            <p className="cs-mock-cap">검색 결과</p>
            <div className="cs-slist">
              <span className={`cs-srow p${id === "PREMIUM" ? " me" : ""}`}><i>프리미엄</i>최상단</span>
              <span className={`cs-srow s${id === "STANDARD" ? " me" : ""}`}><i>스탠다드</i>상단</span>
              <span className={`cs-srow${id === "LIGHT" ? " me" : ""}`}>라이트 · 일반</span>
              <span className="cs-srow">스타트 · 일반</span>
            </div>
            <p className="cs-mock-note">굵게 표시된 줄이 이 플랜의 자리입니다</p>
          </div>
        </div>
      </section>

      <section className="cs-wrap cs-center">
        <Link href={팔림 ? `/company/plans/order?plan=${id}` : "/support"} className="cs-btn-fill lg">
          {팔림 ? `${것.name} 신청하기` : "고객센터 문의하기"} <ArrowRight size={15} />
        </Link>
      </section>
    </div>
  );
}
