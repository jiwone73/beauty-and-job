"use client";

import { useState } from "react";
import Link from "next/link";
import ServiceHeader from "@/components/company/ServiceHeader";
import type { 기업이벤트 } from "@/lib/companyEvent.server";
import { useAuthStore } from "@/lib/store/authStore";
import {
  Scissors, FileText, Users, Wallet, Gift, TrendingUp, ArrowRight,
} from "lucide-react";
import { STORE_JOB_GROUPS, OFFICE_JOB_GROUPS, 유형이름 } from "@/lib/data/jobGroups";
import { 서비스안내, 노출계단, 서비스방향 } from "@/lib/serviceGuide";

/** 안내 묶음마다 붙는 그림 */
const 안내아이콘 = { start: Wallet, apply: Users, expose: TrendingUp, pay: FileText } as const;

/**
 * 기업 서비스 소개.
 *
 * 구직자 화면과 달리 여기 오는 사람은 "쓸지 말지"를 정하러 온다. 그래서
 * 무엇을 주는지(직군 범위·대시보드·절차·값)를 위에서 아래로 한 번에 훑을 수
 * 있게 세운다.
 *
 * 클래스는 cs- 로 새로 뗀다. 기존 co- 는 기업 대시보드와 공고 등록 폼이
 * 아직 쓰고 있어 건드리면 그쪽이 깨진다.
 */

/**
 * 다루는 직군 — 실제 목록에서 만든다.
 *
 * 여기 따로 적어 두었더니 화면과 어긋나 있었다. 매장은 열 묶음인데 넷만
 * 적혀 있었고(두피·탈모, 웨딩·이벤트, 뷰티 리테일, 샵 운영·상담, 미용강사,
 * 의료미용이 빠졌다), 오피스는 직무가 아니라 업종(화장품 브랜드·제조·유통·
 * 교육기관)으로 적혀 있었다 — 직무 축으로 바꾸기로 한 것과 반대다.
 */
const 직군묶음 = [
  { 유형: 유형이름.STORE, 것들: STORE_JOB_GROUPS.map((g) => g.group) },
  { 유형: 유형이름.OFFICE, 것들: OFFICE_JOB_GROUPS.map((g) => g.group) },
];

/**
 * 히어로 아래 띠 — 지금 우리가 실제로 하는 것만 적는다.
 *
 * 전에는 「검증된 인재 DB 보유」·「맞춤형 인재추천」·「합리적인 비용」이 적혀
 * 있었다. 우리는 인재를 검증하지 않고, 추천 기능은 아직 돌지 않으며, 값이
 * 싸다는 근거도 없다. 광고 문장은 첫 거짓말이 드러나는 순간 나머지도 같이
 * 못 믿게 만든다.
 *
 * 남긴 넷은 지금 화면에서 그대로 확인되는 것들이다.
 */
const 히어로강점 = [
  { Icon: Scissors, name: "뷰티 채용 전문", sub: "매장부터 브랜드·제조·유통·교육까지" },
  { Icon: FileText, name: "공고 건수 제한 없음", sub: "몇 건을 올리셔도 값이 같습니다" },
  { Icon: Users, name: "지원자는 이용권 없이", sub: "이력서와 연락처를 그대로 봅니다" },
  { Icon: Wallet, name: "자동 결제 없음", sub: "기간이 끝나면 그대로 끝납니다" },
];

/** 이벤트 중에는 넷을 늘어놓지 않는다. 그 줄에서 제일 센 말 하나만 굵게 뽑는다 —
 *  네 개를 같은 크기로 세우면 어느 것도 세지 않다. 이벤트가 끝나면 넷이 돌아온다. */

export default function CompanyServiceView({ 이벤트 }: { 이벤트: 기업이벤트 | null }) {
  // 로그인 상태를 보고 단추가 갈 곳을 정한다. 이 화면은 그동안 로그인 여부를
  // 아예 보지 않아, 이미 가입한 사장님도 가입 화면으로 떨어졌다.
  const { isLoggedIn, ownerType } = useAuthStore();
  const 기업인가 = isLoggedIn && ownerType === "company";
  const [열린질문, set열린질문] = useState<number | null>(null);

  return (
    <div className="cs-page">
      {/* ── 헤더 ── */}
      <ServiceHeader />

      {/* ── 히어로 ── */}
      <section className="cs-hero" id="소개">
        {/* 이벤트 중에는 이벤트 그림이 선다. 원래 사진에는 지어낸 숫자
            (지원자 248명·채용 성공률 73%)가 박혀 있어, 이벤트가 끝나면 그
            사진으로 돌아가기 전에 갈아야 한다. */}
        <div className={`cs-hero-photo${이벤트 ? " evt" : ""}`} aria-hidden />
        <div className="cs-hero-in">
          {이벤트 && <p className="cs-hero-eyebrow"><Gift size={15} />뷰티워크 오픈이벤트</p>}
          <h1 className="cs-hero-t">
            {이벤트
              ? <>{이벤트.short_title || 이벤트.title}</>
              : <>뷰티 인재 채용,<br /><b>뷰티워크</b>에서 시작하세요</>}
          </h1>
          {이벤트 && (
            <p className="cs-hero-hit">
              <TrendingUp size={22} />
              <b>선착순 메인·검색 상단 노출</b>
            </p>
          )}
          <p className="cs-hero-d">
            헤어·네일·피부·메이크업 매장부터 화장품 브랜드, 제조, 유통, 교육기관 채용까지<br />
            모두 뷰티워크에서 만나보세요.
          </p>
          <div className="cs-hero-btns">
            <Link href={기업인가 ? "/company/dashboard/jobs/new" : "/company/signup"}
                  className="cs-btn-fill lg">
              {기업인가 ? "공고 등록하기" : "1개월 무료로 시작하기"} <ArrowRight size={16} />
            </Link>
            <Link href={이벤트 ? "/company/plans/event" : "/company/plans"} className="cs-btn-line lg">
              {이벤트 ? "이벤트 자세히 보기" : "상품안내 보기"} <ArrowRight size={16} />
            </Link>
          </div>

          {!이벤트 && (
            <ul className="cs-hero-pts">
              {히어로강점.map(({ Icon, name, sub }) => (
                <li key={name}>
                  <Icon size={22} strokeWidth={1.7} />
                  <span><b>{name}</b>{sub}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── 다루는 직군 ── */}
      <section className="cs-wrap" id="직군">
        <h2 className="cs-h2">다루는 직군</h2>
        <div className="cs-groups">
          {직군묶음.map(({ 유형, 것들 }) => (
            <div key={유형} className="cs-group">
              <b>{유형}</b>
              <div className="cs-group-li">
                {것들.map((g) => <span key={g}>{g}</span>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 서비스 안내 ──
          줄글로 풀면 「내 경우엔 어떤가」를 찾으려 다시 훑어야 한다. 네 덩이로
          끊고, 줄 서는 차례는 막대 길이로 보인다. */}
      <section className="cs-wrap">
        <h2 className="cs-h2">서비스 안내</h2>
        <div className="cs-guide">
          {서비스안내.map((b) => {
            const I = 안내아이콘[b.아이콘];
            return (
              <div key={b.머리} className="cs-guide-card">
                <span className="cs-guide-ic"><I size={22} strokeWidth={1.8} /></span>
                <p className="cs-guide-h">{b.머리}</p>
                <p className="cs-guide-big">{b.큰말}</p>
                <ul>{b.줄.map((l) => <li key={l}>{l}</li>)}</ul>
              </div>
            );
          })}
        </div>

        <div className="cs-ladder">
          <p className="cs-ladder-t">검색 목록에서 줄 서는 차례</p>
          {노출계단.map((r) => (
            <div key={r.이름} className="cs-ladder-row">
              <b>{r.이름}</b>
              <span className="cs-ladder-bar" style={{ width: `${r.길이}%` }} />
              <em>{r.곁}</em>
            </div>
          ))}
        </div>
      </section>

      {/* ── 어디로 가는가 ──
          이미 그렇게 만든 것만 적는다. 화면에서 확인할 수 없는 포부는 자랑이지
          약속이 아니다. */}
      <section className="cs-wrap cs-vision">
        <h2 className="cs-h2">뷰티워크가 지키는 것</h2>
        <div className="cs-vision-list">
          {서비스방향.map((v) => (
            <div key={v.머리}>
              <b>{v.머리}</b>
              <p>{v.글}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 요금제·배너광고·FAQ 를 이 화면에서 들어냈다. 상품안내와 고객센터가
          같은 것을 이미 말하고 있었고, 여기서 또 말하면 값이 갈리는 날 한쪽이
          남는다. 대신 그리로 가는 길만 둔다. */}
      <section className="cs-wrap cs-center">
        <Link href="/company/plans" className="cs-btn-line lg">
          상품과 요금 보기 <ArrowRight size={15} />
        </Link>
      </section>

    </div>
  );
}
