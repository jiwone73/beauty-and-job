"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { 플랜, 스타트, 기간들, 비교칸, 사양, 언제부터, 원, 준비중, 보관표기, 메인롤링,
         type PlanId, type 기간 } from "@/lib/companyPlans";

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
 *
 * 왼쪽도 잰다. 좌우로 꽉 채웠더니 빨간 상자가 **왼쪽 사이드바(지역·직군 필터)
 * 까지 덮어**, 그 필터도 산 자리인 것처럼 보였다. 캡처에서 카드가 실제로
 * 시작하는 곳이 가로 18.9% 라 그 앞은 비운다.
 */
const 목록왼 = 18.4;
const 목록오 = 2.2;
const 구간: { 칸: 0 | 1 | 2 | 3; 위: number; 높이: number }[] = [
  { 칸: 3, 위: 9.2, 높이: 14.8 },
  { 칸: 2, 위: 24.0, 높이: 29.5 },
  { 칸: 1, 위: 53.5, 높이: 29.6 },
  { 칸: 0, 위: 83.1, 높이: 13.9 },
];

/** 메인 화면(main-full.png)에서 채용관 두 자리. 라이트·스타트는 여기 없다. */
const 채용관: { 칸: 2 | 3; 위: number; 높이: number }[] = [
  { 칸: 3, 위: 33.4, 높이: 37.8 },
  { 칸: 2, 위: 72.2, 높이: 27.8 },
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
  // 온라인 신청이 닫혀 있으면 단추가 고객센터로 간다. 그때는 이름도 같이
  // 바뀌어야 한다 — 「신청하기」를 눌렀는데 문의 화면이 뜨면 누른 사람은
  // 자기가 잘못 누른 줄 안다.
  const 신청 = 팔림 ? `/company/plans/order?plan=${id}&days=${일수}` : "/support";
  const 신청글 = 팔림 ? "신청하기" : "문의하기";
  // 이 상품이 목록에서 누구 사이에 서는가. 맨 위·맨 아래면 한쪽이 없다.
  const 자리 = 칸 === 3
    ? "목록 맨 위에 올라갑니다"
    : `${칸이름[칸 + 1]} 아래, ${칸이름[칸 - 1]} 위에 놓입니다`;
  /** 메인 공고 노출 자리. 없는 상품이면 null 이고 칸이 통째로 「미노출」이 된다. */
  const 메인자리 = 사양[6].값[칸];

  return (
    <div className="pi">
      <div className="pi-hd">
        {이름보임 && <h2 className="pi-nm">{것.name}</h2>}
        <p className="pi-ln">{것.한줄}</p>
      </div>

      <section className="pi-sec">
        <h3 className="pi-st">상품 내용</h3>
        <div className="pi-body">
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

          <div className="pi-side">
            <div className="pi-pick">
              {기간들.map((d) => (
                <label key={d} className={`pi-opt${d === 일수 ? " on" : ""}`}>
                  <input type="radio" name={`pi-days-${id}`} checked={d === 일수}
                         onChange={() => set일수(d)} />
                  <i className="pi-tick"><Check size={12} strokeWidth={3.5} /></i>
                  <span className="pi-opt-d">{d}일{d === 30 && <em>추천</em>}</span>
                  <b className="pi-opt-a">{원(것.가격[d])}</b>
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
                : <Link href={신청} className="pi-btn">{신청글}</Link>}
            </div>
          </div>
        </div>
      </section>

      <section className="pi-sec">
        <h3 className="pi-st">노출 위치</h3>
        <table className="pi-spot">
          <thead>
            <tr><th>메인 페이지</th><th>채용공고 페이지 (검색·목록)</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {/* 안 되는 상품도 빈 칸으로 두지 않는다. 같은 화면을 흐려 놓고
                    「여기 없다」고 적어야, 무엇이 없다는 말인지가 보인다. */}
                <div className={`pi-list${메인자리 ? "" : " off"}`}>
                  <img src="/images/plans/main-full.png" alt="메인 페이지 화면" />
                  {채용관.map((t) => (
                    <div key={t.칸} className={`pi-zone${t.칸 === 칸 ? " on" : ""}`}
                         style={{ top: `${t.위}%`, height: `${t.높이}%` }}>
                      <i className="pi-zl">{칸이름[t.칸]} 채용관</i>
                      {t.칸 === 칸 && <span className="pi-bub">{메인자리}</span>}
                    </div>
                  ))}
                  {!메인자리 && (
                    <span className="pi-x">
                      노출되지 않습니다
                      <i>메인 공고 노출은 {칸이름[2]}부터</i>
                    </span>
                  )}
                </div>
              </td>
              <td>
                <div className="pi-list">
                  <img src="/images/plans/list-full.png" alt="전체 채용공고 목록 화면" />
                  {구간.map((t) => (
                    <div key={t.칸} className={`pi-zone${t.칸 === 칸 ? " on" : ""}`}
                         style={{ top: `${t.위}%`, height: `${t.높이}%`,
                                  left: `${목록왼}%`, right: `${목록오}%` }}>
                      <i className="pi-zl">{칸이름[t.칸]}</i>
                      {t.칸 === 칸 && <span className="pi-bub">{자리}</span>}
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="pi-cap">
          같은 구간 안에서는 <b>마지막으로 로그인한 매장이 먼저</b> 나옵니다.
          자주 들어오실수록 위에 서고, 같은 날이면 차례가 날마다 바뀝니다.
        </p>
      </section>

      {/* 인재 화면은 스탠다드부터 열린다. 상세 절차는 FAQ(지원자·인재 갈래)에
          한 벌만 두고, 여기서는 그리로 안내만 한다. */}
      {플랜[id].인재열람 && (
        <section className="pi-sec">
          <h3 className="pi-st">인재 검색 · 제안 · 채팅</h3>
          <p style={{ fontSize: 14.5, color: "#555", lineHeight: 1.7, margin: "0 0 4px" }}>
            인재풀에서 조건에 맞는 분을 찾아 제안을 보내고, 수락하시면 채팅으로 면접 약속까지 잡으실 수 있습니다.{" "}
            <Link href="/support/faq?누구=기업" style={{ color: "#582681", fontWeight: 600 }}>
              자세히 보기 ›
            </Link>
          </p>
          <div className="pi-flow">
            {[
              { src: "flow-1-propose-btn", alt: "인재 카드의 제안하기 버튼", 말: "인재 카드에서 「제안하기」를 누릅니다" },
              { src: "flow-2-propose-modal", alt: "보낼 공고를 고르고 제안 보내는 화면", 말: "보낼 공고를 고르고 제안을 보냅니다" },
              { src: "flow-3-chat-accepted", alt: "제안을 수락한 뒤 이어지는 채팅 화면", 말: "수락하시면 채팅으로 이어집니다" },
              { src: "flow-4-interview-set", alt: "면접 약속이 잡힌 화면", 말: "채팅에서 면접 약속을 잡습니다" },
            ].map((컷) => (
              <div key={컷.src} className="pi-flow-item">
                <div className="pi-flow-pic">
                  <img src={`/images/plans/${컷.src}.png`} alt={컷.alt} />
                </div>
                <p className="pi-flow-cap">{컷.말}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="pi-sec">
        <h3 className="pi-st">유의사항</h3>
        <ul className="pi-warn">
          <li>무통장입금으로 접수하며, 입금 확인일부터 기산합니다.</li>
          <li>자동 결제·자동 연장은 없습니다. 종료 3일 전 알림을 보내드립니다.</li>
          {메인자리 && (
            <li>
              메인 공고 노출은 정해진 칸을 {메인롤링 / 1000}초마다 교대합니다. 산 곳이 칸 수보다
              많으면 돌아가며 나오고, 덜 노출된 공고가 먼저 앞자리에 옵니다. 내 공고가 몇 번
              떴는지는 「내 이용권」에서 보실 수 있습니다.
            </li>
          )}
          <li>결제하신 이용권은 환불되지 않습니다.</li>
          <li>
            채용이 끝나 공고를 모두 마감하시면 남은 기간을 보관해 두었다가{" "}
            <b>같은 상품</b>을 다시 신청하실 때 쓰실 수 있습니다. 다른 상품에는 쓸 수 없으며,
            보관일부터 {보관표기}이 지나면 자동으로 소멸합니다.
          </li>
          <li>
            이용 중에 다른 상품을 신청하시면 새 상품이 그날부터 시작하고, 쓰던 상품의
            남은 기간은 그 상품으로 보관됩니다. 예를 들어 {플랜.LIGHT.name} 10일이 남은
            상태에서 {플랜.STANDARD.name} 30일을 신청하시면, 그날부터{" "}
            {플랜.STANDARD.name}을 30일 쓰시고 {플랜.LIGHT.name} 10일은 보관됩니다.
          </li>
        </ul>
      </section>

    </div>
  );
}
