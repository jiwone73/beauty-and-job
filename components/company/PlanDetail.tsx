"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 플랜, 기간들, 비교칸, 사양, 언제부터, 원, 준비중, type PlanId } from "@/lib/companyPlans";

/**
 * 상품 하나를 자세히 — 상품 안내서다.
 *
 * 광고 문장을 쓰지 않는다. 다른 회사 공식 상품 페이지가 그렇듯 **항목과 내용**
 * 으로 적고, 노출 자리는 말 대신 **실제 화면을 찍어** 보여 준다. 사장님이 여기서
 * 확인하려는 것은 「무엇이 되고 무엇이 안 되는가」와 「얼마인가」 둘뿐이다.
 *
 * 안 되는 항목도 지우지 않고 「스탠다드부터」처럼 어디서 되는지까지 적는다 —
 * 없다고만 하면 그럼 어디서 되는지 다시 물어야 한다.
 *
 * 로그인 전(기업서비스)과 로그인 후(대시보드)가 같은 것을 본다.
 */
const 칸이름 = ["스타트", "라이트", "스탠다드", "프리미엄"];

export default function PlanDetail({ id, 이름보임 = true }: { id: PlanId; 이름보임?: boolean }) {
  const 것 = 플랜[id];
  const 칸 = 비교칸[id];

  const [팔림, set팔림] = useState(false);
  const [안엶, set안엶] = useState(false);
  const [이벤트, set이벤트] = useState<{ id: string; title: string } | null>(null);
  useEffect(() => {
    fetch("/api/plans").then((r) => r.json()).then((r) => {
      set팔림(!!r?.data?.sales);
      set안엶(Array.isArray(r?.data?.open) && !r.data.open.includes(id));
    }).catch(() => {});
    fetch("/api/notices?type=event").then((r) => r.json())
      .then((r) => set이벤트(r?.success && r.data?.[0] ? r.data[0] : null)).catch(() => {});
  }, [id]);

  const 기본 = 원(것.가격[30]);

  return (
    <div className="pi">
      {이벤트 && (
        <Link href={`/event?open=${이벤트.id}`} className="pi-evt">
          {이벤트.title}
          <span>자세히 ›</span>
        </Link>
      )}

      <div className="pi-hd">
        <p className="pi-kind">채용공고 상품</p>
        {이름보임 && <h2 className="pi-nm">{것.name}</h2>}
        <p className="pi-ln">{것.한줄}</p>
      </div>

      <div className="pi-sum">
        <div>
          <p className="pi-lbl">30일 기준</p>
          <p className="pi-amt">{기본.replace("원", "")}<i>원</i></p>
          <p className="pi-note">부가세 포함 · 7일 {원(것.가격[7])}부터</p>
        </div>
        {안엶
          ? <span className="pi-btn off">{준비중}</span>
          : <Link href={팔림 ? `/company/plans/order?plan=${id}` : "/support"} className="pi-btn">신청하기</Link>}
      </div>

      <section className="pi-sec">
        <h3 className="pi-st">제공 내역</h3>
        <table className="pi-tb">
          <tbody>
            {사양.map((r) => {
              const v = r.값[칸];
              const 부터 = v ? null : 언제부터(r.값);
              return (
                <tr key={r.항목}>
                  <th>{r.항목}</th>
                  <td className={v ? undefined : "off"}>{v ?? (부터 ? `${부터}부터` : "미제공")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="pi-sec">
        <h3 className="pi-st">이용 요금</h3>
        <table className="pi-tb">
          <tbody>
            {기간들.map((d) => (
              <tr key={d} className={d === 30 ? "on" : undefined}>
                <td>{d}일{d === 30 && <span className="pi-mark">추천</span>}</td>
                <td className="num">{원(것.가격[d])}</td>
                <td className="day">1일 {Math.round(것.가격[d] / d).toLocaleString("ko-KR")}원</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="pi-sec">
        <h3 className="pi-st">노출 위치</h3>
        <div className="pi-shot"><img src="/images/plans/jobs-list.png" alt="채용공고 목록 화면" /></div>
        <p className="pi-cap">
          ▲ 채용공고 목록 — <b>{사양[2].값[칸]}</b>
        </p>
        <div className="pi-shot">
          <img src={`/images/plans/main-${것.메인 === "PREMIUM" ? "premium" : "standard"}.png`} alt="메인 채용관 화면" />
        </div>
        <p className="pi-cap">
          ▲ 메인 채용관 — {사양[6].값[칸]
            ? <b>{사양[6].값[칸]}</b>
            : <>미포함 ({칸이름[2]}부터)</>}
        </p>
      </section>

      <section className="pi-sec">
        <h3 className="pi-st">유의사항</h3>
        <ul className="pi-warn">
          <li>무통장입금으로 접수하며, 입금 확인일부터 기산합니다.</li>
          <li>자동 결제·자동 연장은 없습니다. 종료 3일 전 알림을 보내드립니다.</li>
          <li>미사용 시 7일 이내 전액 환불, 이용 후에는 잔여 기간을 일할 계산해 환불합니다.</li>
          <li>이용 중 상위 상품 신청 시 남은 기간에 이어서 적용됩니다.</li>
        </ul>
      </section>

      <div className="pi-foot">
        <span className="pi-fl">30일 기준<b>{안엶 ? 준비중 : 기본}</b></span>
        {안엶
          ? <span className="pi-btn off">{준비중}</span>
          : <Link href={팔림 ? `/company/plans/order?plan=${id}` : "/support"} className="pi-btn">신청하기</Link>}
      </div>
    </div>
  );
}
