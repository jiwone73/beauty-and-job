"use client";

import { useState } from "react";
import Link from "next/link";
import ServiceHeader from "@/components/company/ServiceHeader";
import type { 기업이벤트 } from "@/lib/companyEvent.server";
import { useAuthStore } from "@/lib/store/authStore";
import {
  Scissors, Sparkles, Droplets, Brush, SprayCan, FlaskConical, ShoppingCart, GraduationCap,
  CheckCircle2, ArrowRight,
  UserPlus, FileText, Users, CircleCheck, Wallet, Gift, TrendingUp,
} from "lucide-react";

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

const 직군 = [
  { Icon: Scissors, name: "헤어", sub: "헤어디자이너, 스탭" },
  { Icon: Sparkles, name: "네일", sub: "네일리스트, 스탭" },
  { Icon: Droplets, name: "피부", sub: "피부관리사, 에스테틱" },
  { Icon: Brush, name: "메이크업", sub: "메이크업 아티스트" },
  { Icon: SprayCan, name: "화장품 브랜드", sub: "마케팅, MD, 영업" },
  { Icon: FlaskConical, name: "제조·OEM/ODM", sub: "연구개발, 품질, 생산" },
  { Icon: ShoppingCart, name: "유통·이커머스", sub: "유통, 물류, CS" },
  { Icon: GraduationCap, name: "교육기관", sub: "강사, 교육 운영" },
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

/** 이벤트 중에는 마지막 한 칸을 이벤트 혜택이 쓴다. 지금 이 줄에서 제일 센
 *  말이 「선착순 상단 노출」인데, 그것이 빠진 채로 「자동 결제 없음」이 서
 *  있을 이유가 없다. 이벤트가 끝나면 저절로 돌아간다. */
const 이벤트강점 = { Icon: TrendingUp, name: "메인·검색 상단 노출", sub: "선착순 · 먼저 올리신 순서대로" };

// 대시보드에서 실제로 되는 것. 「성과 분석」·「맞춤 추천」은 없는 기능이었다.
const 대시보드혜택 = [
  "지원자 이력서와 연락처를 바로 확인",
  "열람·면접·합격까지 지원 상태 관리",
  "공고별 지원자 수를 한 화면에서",
  "메인 노출 횟수와 남은 기간 확인",
];

const 절차 = [
  { no: "01", Icon: UserPlus, name: "기업회원 가입", sub: "사업자 정보를 확인하고 가입합니다" },
  { no: "02", Icon: FileText, name: "채용공고 등록", sub: "직무·근무조건·복리후생을 적어 올립니다" },
  { no: "03", Icon: Users, name: "지원자 확인", sub: "이력서와 연락처를 보고 연락합니다" },
  { no: "04", Icon: CircleCheck, name: "면접 및 채용", sub: "면접을 진행하고 지원 상태를 옮깁니다" },
];



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
          <p className="cs-hero-d">
            헤어·네일·피부·메이크업 매장부터 화장품 브랜드, 제조, 유통, 교육기관까지<br />
            뷰티 채용 전문입니다.
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

          <ul className="cs-hero-pts">
            {[...히어로강점.slice(0, 3), 이벤트 ? 이벤트강점 : 히어로강점[3]].map(({ Icon, name, sub }) => (
              <li key={name}>
                <Icon size={22} strokeWidth={1.7} />
                <span><b>{name}</b>{sub}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 다루는 직군 ── */}
      <section className="cs-wrap" id="직군">
        <div className="cs-jobs">
          {직군.map(({ Icon, name, sub }) => (
            <div key={name} className="cs-job">
              <Icon size={26} strokeWidth={1.6} />
              <b>{name}</b>
              <span>{sub}</span>
            </div>
          ))}
        </div>
      </section>


      {/* ── 이용 절차 ── */}
      <section className="cs-wrap">
        <h2 className="cs-h2">이렇게 진행됩니다</h2>
        <div className="cs-steps">
          {절차.map(({ no, Icon, name, sub }, i) => (
            <div key={no} className="cs-step">
              <span className="cs-step-ic"><Icon size={30} strokeWidth={1.5} /></span>
              <span className="cs-step-no">{no}</span>
              <b>{name}</b>
              <span className="cs-step-s">{sub}</span>
              {i < 절차.length - 1 && <ArrowRight className="cs-step-ar" size={18} />}
            </div>
          ))}
        </div>
      </section>




      {/* ── 대시보드 ── */}
      <section className="cs-wrap cs-dash">
        <div className="cs-dash-l">
          <h2 className="cs-h2 left">채용이 쉬워지는<br />기업회원 대시보드</h2>
          <p className="cs-sub left">
            공고를 올린 뒤에 하는 일이 다 여기 있습니다.<br />
            지원자를 보고, 상태를 옮기고, 남은 기간을 확인합니다.
          </p>
          <ul className="cs-checks">
            {대시보드혜택.map((t) => (
              <li key={t}><CheckCircle2 size={17} />{t}</li>
            ))}
          </ul>
          <Link href="/company/signup" className="cs-btn-fill lg">
            대시보드 미리보기 <ArrowRight size={16} />
          </Link>
        </div>

        {/* 실제 화면을 줄여 옮긴 그림. 숫자는 보기용이라 서버에서 받아오지 않는다. */}
        <div className="cs-shot" aria-label="기업회원 대시보드 미리보기">
          <div className="cs-shot-side">
            <span className="cs-shot-brand">뷰티워크</span>
            {["대시보드", "공고 관리", "지원자 관리", "인재 추천", "면접 관리", "분석 리포트", "채용 제안", "계정 관리"].map((m, i) => (
              <span key={m} className={`cs-shot-menu${i === 0 ? " on" : ""}`}>{m}</span>
            ))}
          </div>
          <div className="cs-shot-main">
            <p className="cs-shot-h">대시보드</p>
            <div className="cs-shot-stats">
              {[["진행 중 공고", "12", "건"], ["총 지원자", "248", "명"], ["면접 예정", "18", "명"], ["최종 합격", "7", "명"]].map(([k, v, u]) => (
                <div key={k} className="cs-shot-stat"><span>{k}</span><b>{v}<i>{u}</i></b></div>
              ))}
            </div>
            <div className="cs-shot-row">
              <div className="cs-shot-card">
                <p>지원자 추이</p>
                <svg viewBox="0 0 240 80" preserveAspectRatio="none" className="cs-shot-line">
                  <polyline points="0,62 34,50 68,58 102,34 136,44 170,22 204,26 240,10" />
                </svg>
              </div>
              <div className="cs-shot-card">
                <p>공고 성과 요약</p>
                <div className="cs-shot-donut">
                  <svg viewBox="0 0 42 42">
                    <circle className="bg" cx="21" cy="21" r="16" />
                    <circle className="fg" cx="21" cy="21" r="16" />
                  </svg>
                  <span>73<i>%</i></span>
                </div>
              </div>
            </div>
            <div className="cs-shot-card wide">
              <p>최근 지원자</p>
              {[["강○현", "네일리스트 경력 3년", "서류 검토"], ["이○수", "피부관리사 경력 5년", "면접 예정"], ["박○현", "메이크업 아티스트 경력 4년", "최종 합격"]].map(([n, j, st]) => (
                <div key={n} className="cs-shot-appl">
                  <span className="cs-shot-av" />
                  <span className="cs-shot-n">{n}<i>{j}</i></span>
                  <span className="cs-shot-st">{st}</span>
                </div>
              ))}
            </div>
          </div>
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

      {/* ── 마지막 부르기 ── */}
      <section className="cs-cta">
        <div className="cs-cta-in">
          <div>
            <b>지금 바로 뷰티워크를 시작하세요</b>
            <p>매장과 오피스 채용을 더 쉽고 빠르게</p>
          </div>
          {/* 맨 위 단추와 같은 것이다 — 같은 화면에서 같은 일을 하는 단추가
              위아래에서 다른 이름이면 다른 길로 읽힌다. */}
          <div className="cs-cta-btns">
            <Link href={기업인가 ? "/company/dashboard/jobs/new" : "/company/signup"}
                  className="cs-btn-white">
              {기업인가 ? "공고 등록하기" : "1개월 무료로 시작하기"} <ArrowRight size={16} />
            </Link>
            <Link href="/company/plans" className="cs-btn-white line">
              상품안내 보기 <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
