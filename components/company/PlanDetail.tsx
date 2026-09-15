"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { 플랜, 스타트, 기간들, 비교칸, 사양, 언제부터, 원, 준비중, type PlanId, type 기간 } from "@/lib/companyPlans";

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
const 칸이름 = [스타트.name, 플랜.LIGHT.name, 플랜.STANDARD.name, 플랜.PREMIUM.name];

/**
 * 목록 화면(list-full.png) 위에 그리는 구간 띠.
 *
 * 노출 자리를 말로 적으면 「상단」과 「최상단」이 얼마나 다른지 알 수 없다.
 * 화면을 통째로 찍어 두고 그 위에 구간만 그린다 — 줄여 놓으면 글자는 안
 * 읽히지만, 산 상품이 **화면 어디쯤에** 서는지는 그걸로 다 보인다.
 *
 * 위·높이는 그 캡처에서 실제 카드 줄이 끝나는 자리를 재서 넣은 값(%)이다.
 * 캡처를 다시 찍으면 이 값도 같이 본다.
 */
const 구간: { 칸: 0 | 1 | 2 | 3; 위: number; 높이: number }[] = [
  { 칸: 3, 위: 9.2, 높이: 14.8 },
  { 칸: 2, 위: 24.0, 높이: 29.5 },
  { 칸: 1, 위: 53.5, 높이: 29.6 },
  { 칸: 0, 위: 83.1, 높이: 13.9 },
];

export default function PlanDetail({ id, 이름보임 = true }: { id: PlanId; 이름보임?: boolean }) {
  const 것 = 플랜[id];
  const 칸 = 비교칸[id];

  const [팔림, set팔림] = useState(false);
  const [안엶, set안엶] = useState(false);
  /** 고른 기간. 값도 신청 단추도 이걸 따라간다 — 고르는 자리 없이 값만
   *  적어 두면 「그래서 얼마를 내고 며칠을 쓰나」를 신청 화면에서 다시 정하게 된다. */
  const [일수, set일수] = useState<기간>(30);
  useEffect(() => {
    fetch("/api/plans").then((r) => r.json()).then((r) => {
      set팔림(!!r?.data?.sales);
      set안엶(Array.isArray(r?.data?.open) && !r.data.open.includes(id));
    }).catch(() => {});
  }, [id]);

  const 기본 = 원(것.가격[일수]);
  const 신청 = 팔림 ? `/company/plans/order?plan=${id}&days=${일수}` : "/support";
  // 이 상품이 목록에서 누구 사이에 서는가. 맨 위·맨 아래면 한쪽이 없다.
  // 확대해서 보여 줄 두 줄 — 이 상품 구간과 바로 윗 구간의 경계다.
  // 프리미엄은 위가 없으니 아랫 경계를 본다.
  const 확대: { 칸: 0 | 1 | 2 | 3 }[] = 칸 === 3
    ? [{ 칸: 3 }, { 칸: 2 }]
    : [{ 칸: (칸 + 1) as 1 | 2 | 3 }, { 칸 }];
  const 자리 = 칸 === 3
    ? "목록 맨 위"
    : `${칸이름[칸 + 1]} 구간 아래, ${칸이름[칸 - 1]} 구간 위`;

  return (
    <div className="pi">
      <div className="pi-hd">
        <p className="pi-kind">채용공고 상품</p>
        {이름보임 && <h2 className="pi-nm">{것.name}</h2>}
        <p className="pi-ln">{것.한줄}</p>
      </div>

      <section className="pi-sec">
        <h3 className="pi-st">상품 내용</h3>
        <div className="pi-pick">
          {기간들.map((d) => (
            <label key={d} className={`pi-opt${d === 일수 ? " on" : ""}`}>
              <input type="radio" name={`pi-days-${id}`} checked={d === 일수}
                     onChange={() => set일수(d)} />
              <i className="pi-tick"><Check size={12} strokeWidth={3.5} /></i>
              <span className="pi-opt-d">{d}일{d === 30 && <em>추천</em>}</span>
              <b className="pi-opt-a">{원(것.가격[d])}</b>
              <span className="pi-opt-u">1일 {Math.round(것.가격[d] / d).toLocaleString("ko-KR")}원</span>
            </label>
          ))}
        </div>

        <div className="pi-buy">
          <p className="pi-buy-l">
            {것.name} {일수}일
            <b>{기본}</b>
            <i>부가세 포함</i>
          </p>
          {안엶
            ? <span className="pi-btn off">{준비중}</span>
            : <Link href={신청} className="pi-btn">신청하기</Link>}
        </div>
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
        <h3 className="pi-st">노출 위치</h3>
        <div className="pi-where">
          <div>
            <div className="pi-list">
              <img src="/images/plans/list-full.png" alt="전체 채용공고 목록 화면" />
              <div className="pi-tiers">
                {구간.map((t) => (
                  <div key={t.칸} className={`pi-tier${t.칸 === 칸 ? " on" : ""}`}
                       style={{ top: `${t.위}%`, height: `${t.높이}%` }}>
                    <span>{칸이름[t.칸]} 구간</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="pi-cap">▲ 전체 채용공고 목록</p>
          </div>
          <div>
            <div className="pi-list">
              <img src="/images/plans/list-zoom.png" alt="목록에서 구간이 바뀌는 자리" />
              <div className="pi-tiers">
                {확대.map((t, i) => (
                  <div key={t.칸} className={`pi-tier${t.칸 === 칸 ? " on" : ""}`}
                       style={{ top: `${i * 50}%`, height: "50%" }}>
                    <span>{칸이름[t.칸]} 구간</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="pi-cap">▲ 구간이 바뀌는 자리</p>
            <p className="pi-where-t">
              목록은 상품 순서로 줄을 세웁니다. {것.name} 공고는 <b>{자리}</b>에 서고,
              같은 구간 안에서는 최근 등록 순입니다.
            </p>
          </div>
        </div>

        {사양[6].값[칸] ? (
          <>
            <div className="pi-shot">
              <img src={`/images/plans/main-${것.메인 === "PREMIUM" ? "premium" : "standard"}.png`} alt="메인 채용관 화면" />
            </div>
            <p className="pi-cap">▲ 메인 화면 채용관 — <b>{사양[6].값[칸]}</b></p>
          </>
        ) : (
          <p className="pi-cap">
            메인 화면 채용관에는 노출되지 않습니다 — 메인 노출은 {칸이름[2]}부터입니다.
          </p>
        )}
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

    </div>
  );
}
