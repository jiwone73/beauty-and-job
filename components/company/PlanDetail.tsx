"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { 플랜, 기간들, 비교칸, 원, 메인칸, type PlanId } from "@/lib/companyPlans";
import { 혜택목록 } from "@/components/company/PlanCards";

/**
 * 플랜 하나를 자세히 — 무엇을 주는지 · 기간별 얼마인지 · 어디에 뜨는지.
 *
 * 로그인 전(기업서비스)과 로그인 후(기업 대시보드)가 같은 것을 본다. 두 군데에
 * 따로 적으면 값을 고칠 때 한쪽만 바뀐다 — 껍데기만 각자 두르고 알맹이는 하나다.
 */
export default function PlanDetail({ id, 이름보임 = true }: { id: PlanId; 이름보임?: boolean }) {
  const 것 = 플랜[id];
  const 메인 = 것.메인;

  // 통신판매업 신고 전에는 결제를 열 수 없다. 그동안은 고객센터로 받는다.
  const [팔림, set팔림] = useState(false);
  useEffect(() => {
    fetch("/api/plans").then((r) => r.json())
      .then((r) => set팔림(!!r?.data?.sales)).catch(() => {});
  }, []);

  return (
    <>
      {/* 대시보드에서는 머리줄 제목이 이미 플랜 이름을 적고 있어 한 줄만 남긴다. */}
      <section className="cs-wrap">
        {이름보임 && <h2 className="cs-h2">{것.name}</h2>}
        <p className="cs-lead" style={이름보임 ? undefined : { marginTop: 0 }}>{것.한줄}</p>
      </section>

      <section className="cs-wrap">
        <h3 className="cs-h3">이 플랜이 주는 것</h3>
        <div className="cs-feat-wide">
          <혜택목록 칸={비교칸[id]} />
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
    </>
  );
}
