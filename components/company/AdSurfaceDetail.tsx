"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { 면상품, 면이름, 면설명, 광고기간, type 광고면, type 광고기간 as 기간, type 광고상품 } from "@/lib/adProducts";
import { 원 } from "@/lib/companyPlans";

/**
 * 배너광고 한 화면치 — 채용공고 상품 상세와 같은 틀이다.
 *
 * 상품 내용은 왼쪽, 기간과 값과 신청 단추는 오른쪽. 노출 자리는 말로 적지 않고
 * 실제 화면을 찍어 그 위에 빨간 테두리를 두른다. 광고는 「어디에 뜨는가」가
 * 상품의 전부라 그림이 설명보다 먼저다.
 *
 * 값이 정해지지 않은 자리는 「협의」로 둔다 — 없는 값을 지어내 걸면 그것이 곧
 * 약속이 된다.
 */

/** 캡처에서 배너가 선 자리(%). 캡처를 다시 찍으면 이 값도 같이 본다. */
const 자리표 = {
  "main-banner":       { 그림: "ad-main-slot",        위: 6.9, 높이: 14.5, 이름: "메인 페이지" },
  "jobs-banner":       { 그림: "ad-jobs-slot",        위: 6.1, 높이: 12.0, 이름: "채용공고 목록 (직군 미선택)" },
  "jobs-group-banner": { 그림: "ad-jobs-group-slot",  위: 6.1, 높이: 12.0, 이름: "채용공고 목록 (직군 선택)" },
} as const;

function 상품칸({ 것, 안쪽 }: { 것: 광고상품; 안쪽: boolean }) {
  const [일수, set일수] = useState<기간>(30);
  const 자리 = 자리표[것.id as keyof typeof 자리표];
  const 값 = 것.가격[일수];

  return (
    <section className="pi-sec">
      <h3 className="pi-st">{것.name}</h3>
      <p className="pi-ln" style={{ margin: "0 0 14px" }}>{것.한줄}</p>

      <div className="pi-body">
        <table className="pi-tb">
          <tbody>
            {것.사양.map((r) => (
              <tr key={r.항목}><th>{r.항목}</th><td>{r.값}</td></tr>
            ))}
          </tbody>
        </table>

        <div className="pi-side">
          <div className="pi-pick">
            {광고기간.map((d) => (
              <label key={d} className={`pi-opt${d === 일수 ? " on" : ""}`}>
                <input type="radio" name={`ad-days-${것.id}`} checked={d === 일수}
                       onChange={() => set일수(d)} />
                <i className="pi-tick"><Check size={12} strokeWidth={3.5} /></i>
                <span className="pi-opt-d">{d}일{d === 30 && <em>추천</em>}</span>
                <b className="pi-opt-a">{것.가격[d] === null ? "협의" : 원(것.가격[d]!)}</b>
              </label>
            ))}
          </div>
          <div className="pi-buy">
            <p className="pi-buy-l">
              {것.name} {일수}일
              <b>{값 === null ? "협의" : 원(값)}</b>
              <i>부가세 별도</i>
            </p>
            <Link href={안쪽 ? "/company/dashboard/support" : "/company/ads/inquiry"} className="pi-btn">
              광고 문의하기
            </Link>
          </div>
        </div>
      </div>

      {자리 && (
        <>
          <div className="pi-list" style={{ marginTop: 22 }}>
            <img src={`/images/plans/${자리.그림}.png`} alt={`${자리.이름} 배너 자리`} />
            <div className="pi-zone on" style={{ top: `${자리.위}%`, height: `${자리.높이}%` }}>
              <span className="pi-bub">{것.name} 자리</span>
            </div>
          </div>
          <p className="pi-cap">▲ {자리.이름} — 빨간 테두리가 배너가 서는 자리입니다.</p>
        </>
      )}
    </section>
  );
}

export default function AdSurfaceDetail({ 면, 안쪽 = false }: { 면: 광고면; 안쪽?: boolean }) {
  const 것들 = 면상품(면);
  return (
    <div className="pi">
      <div className="pi-hd">
        <h2 className="pi-nm">{면이름[면]}</h2>
        <p className="pi-ln">{면설명[면]}</p>
      </div>
      {것들.map((것) => <상품칸 key={것.id} 것={것} 안쪽={안쪽} />)}
      <section className="pi-sec">
        <h3 className="pi-st">유의사항</h3>
        <ul className="pi-warn">
          <li>선결제 후 집행합니다. 세금계산서를 발행해 드립니다.</li>
          <li>광고 소재는 고객사에서 주시는 것이 원칙이며, 제작 대행도 됩니다(비용 별도 협의).</li>
          <li>같은 자리에 걸린 광고가 여럿이면 차례로 교대합니다.</li>
          <li>집행 전 취소는 전액 환불, 집행 중에는 남은 기간만큼 환불합니다.</li>
          <li>모든 배너에는 「광고」 표시가 붙습니다.</li>
        </ul>
      </section>
    </div>
  );
}
