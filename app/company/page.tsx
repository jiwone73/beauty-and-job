"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Scissors, Sparkles, Droplets, Brush, SprayCan, FlaskConical, ShoppingCart, GraduationCap,
  CheckCircle2, ArrowRight, Plus, Minus,
  UserPlus, FileText, Users, CircleCheck,
  Megaphone, Star, TrendingUp, Gift,
  ShieldCheck, Zap, Wallet, RefreshCw, Headphones,
  UserRoundCheck, Crosshair,
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

// 히어로 아래 띠. 무엇을 믿고 맡기라는 것인지 네 마디로 먼저 못 박는다.
const 히어로강점 = [
  { Icon: UserRoundCheck, name: "뷰티 전문 인재 풀", sub: "검증된 인재 DB 보유" },
  { Icon: Crosshair, name: "맞춤형 인재추천", sub: "직군·지역 기반 추천 매칭" },
  { Icon: ShieldCheck, name: "합리적인 비용", sub: "효율적인 채용 프로세스" },
  { Icon: TrendingUp, name: "지속적인 업그레이드", sub: "서비스 기능 지속 강화" },
];

const 대시보드혜택 = [
  "실시간 지원 현황 및 데이터 확인",
  "공고 성과 분석으로 효율적 채용",
  "직군·지역 기반 맞춤 인재 추천",
  "간편한 서류 검토 및 면접 관리",
];

const 절차 = [
  { no: "01", Icon: UserPlus, name: "기업회원 가입", sub: "간단한 정보 입력 후 빠르게 가입" },
  { no: "02", Icon: FileText, name: "채용공고 등록", sub: "직무, 근무조건, 혜택 등 상세 정보 등록" },
  { no: "03", Icon: Users, name: "인재 추천 및 지원", sub: "맞춤 추천 인재 확인 및 지원 접수" },
  { no: "04", Icon: CircleCheck, name: "면접 및 채용", sub: "지원자와 면접 후 진행하고 채용을 완료합니다" },
];

const 광고상품 = [
  { Icon: Megaphone, name: "메인 AD 배너", sub: "메인 상단 배너 노출", price: "20만원 ~" },
  { Icon: Star, name: "뷰티워크 Pick", sub: "공고 상단 노출 및 추천", price: "10만원 ~" },
  { Icon: TrendingUp, name: "프리미엄 상단공고", sub: "검색 결과 상단 고정 노출", price: "5만원 ~" },
  { Icon: Gift, name: "추천 뷰티 서비스", sub: "서비스 제휴 및 배너 노출", price: "별도 협의" },
];

const 이유 = [
  { Icon: Sparkles, name: "뷰티 전문 플랫폼", sub: "뷰티 분야에 특화된 인재 풀과 데이터 보유" },
  { Icon: ShieldCheck, name: "검증된 인재 풀", sub: "경력·자격 검토를 통한 검증된 인재 매칭" },
  { Icon: Zap, name: "빠른 매칭 & 추천", sub: "맞춤 추천으로 채용 기간 단축" },
  { Icon: Wallet, name: "합리적인 비용", sub: "효율적인 채용을 위한 합리적인 광고 비용" },
  { Icon: RefreshCw, name: "지속적인 서비스 개선", sub: "기업의 의견을 반영하여 기능을 자속적으로 업데이트" },
];

const FAQS = [
  { q: "매장과 본사 채용을 동시에 진행할 수 있나요?", a: "네. 가입 시 유형을 고르고, 공고를 만들 때마다 매장·본사 중에서 선택하실 수 있습니다. 한 계정에서 양쪽을 함께 관리합니다." },
  { q: "지원자 매칭은 어떻게 이루어지나요?", a: "직군, 지역, 경력, 고용형태를 견주어 점수를 매기고 높은 순으로 보여드립니다. 지원자가 프로필을 공개한 경우에만 추천됩니다." },
  { q: "광고 상품은 언제든 변경할 수 있나요?", a: "네. 진행 중인 상품은 잔여 기간을 정산해 다른 상품으로 바꾸실 수 있습니다. 자세한 조건은 고객센터로 문의해 주세요." },
  { q: "이용 요금은 어떻게 되나요?", a: "채용공고 등록과 지원자 확인은 무료입니다. 상단 노출·배너 등 노출을 늘리는 상품만 유료로 운영합니다." },
];

export default function CompanyServicePage() {
  const [열린질문, set열린질문] = useState<number | null>(null);

  return (
    <div className="cs-page">
      {/* ── 헤더 ── */}
      <header className="cs-header">
        <div className="cs-header-in">
          <Link href="/" className="cs-logo">
            <Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} priority />
          </Link>
          <nav className="cs-nav">
            <a href="#소개">서비스 소개</a>
            <a href="#직군">매장 채용</a>
            <a href="#직군">본사 채용</a>
            <a href="#광고">광고·노출 상품</a>
            <Link href="/support">고객센터</Link>
          </nav>
          <div className="cs-header-btns">
            <Link href="/company/login" className="cs-btn-ghost">로그인</Link>
            <Link href="/company/signup" className="cs-btn-fill">회원가입</Link>
          </div>
        </div>
      </header>

      {/* ── 히어로 ── */}
      <section className="cs-hero" id="소개">
        <div className="cs-hero-photo" aria-hidden />
        <div className="cs-hero-in">
          <h1 className="cs-hero-t">
            뷰티 인재 채용,<br />
            <b>뷰티워크</b>에서 시작하세요
          </h1>
          <p className="cs-hero-d">
            헤어·네일·피부·메이크업 매장부터 화장품 브랜드, 제조, 유통, 교육기관까지<br />
            뷰티 분야 전반에 걸친 폭넓은 인재 풀과 맞춤형 인재추천 서비스를 제공합니다.
          </p>
          <div className="cs-hero-btns">
            <Link href="/company/signup?type=STORE" className="cs-btn-fill lg">
              매장 채용 시작하기 <ArrowRight size={16} />
            </Link>
            <Link href="/company/signup?type=OFFICE" className="cs-btn-line lg">
              본사 채용 시작하기 <ArrowRight size={16} />
            </Link>
          </div>

          <ul className="cs-hero-pts">
            {히어로강점.map(({ Icon, name, sub }) => (
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

      {/* ── 대시보드 ── */}
      <section className="cs-wrap cs-dash">
        <div className="cs-dash-l">
          <h2 className="cs-h2 left">채용이 쉬워지는<br />기업회원 대시보드</h2>
          <p className="cs-sub left">
            직관적인 대시보드로 채용 전 과정을 한눈에 관리하고<br />
            데이터 기반 인사이트로 더 빠르고 정확한 채용을 경험하세요.
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
        <p className="cs-note">※ 실제 서비스 화면은 지속적으로 기능이 추가되며 업그레이드됩니다.</p>
      </section>

      {/* ── 이용 절차 ── */}
      <section className="cs-wrap">
        <h2 className="cs-h2">간단한 4단계로 최적의 인재를 만나보세요</h2>
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

      {/* ── 광고·노출 상품 ── */}
      <section className="cs-band" id="광고">
        <div className="cs-wrap">
          <h2 className="cs-h2">프리미엄 광고 · 노출 상품</h2>
          <p className="cs-sub">더 많은 지원자에게 노출하고 싶다면</p>
          <div className="cs-ads">
            {광고상품.map(({ Icon, name, sub, price }) => (
              <div key={name} className="cs-ad">
                <Icon size={26} strokeWidth={1.6} />
                <b>{name}</b>
                <span>{sub}</span>
                <em>{price}</em>
              </div>
            ))}
          </div>
          <div className="cs-center">
            <Link href="/support" className="cs-btn-fill lg">
              광고·노출 상품 자세히 보기 <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 선택 이유 ── */}
      <section className="cs-wrap">
        <h2 className="cs-h2">뷰티워크를 선택해야 하는 이유</h2>
        <div className="cs-why">
          <div className="cs-why-grid">
            {이유.map(({ Icon, name, sub }) => (
              <div key={name} className="cs-why-c">
                <Icon size={24} strokeWidth={1.6} />
                <b>{name}</b>
                <span>{sub}</span>
              </div>
            ))}
          </div>
          <div className="cs-why-up">
            <b>계속해서 업그레이드 됩니다!</b>
            <p>
              뷰티워크는 고객사의 의견을 반영하여 더 나은 채용 경험을 제공하기 위해
              지속적으로 기능을 추가하고 서비스를 개선해 나가겠습니다.
            </p>
            <TrendingUp size={40} strokeWidth={1.5} />
          </div>
        </div>
      </section>

      {/* ── 자주 묻는 질문 ── */}
      <section className="cs-wrap cs-faq-wrap">
        <div>
          <h2 className="cs-h2 left">자주 묻는 질문</h2>
          <ul className="cs-faq">
            {FAQS.map((f, i) => (
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
        </div>
        <div className="cs-help">
          <Headphones size={34} strokeWidth={1.5} />
          <b>궁금한 점이 있으신가요?</b>
          <p>고객센터로 문의하시면<br />빠르게 답변해 드립니다.</p>
          <Link href="/support" className="cs-btn-line">
            고객센터 문의하기 <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* ── 마지막 부르기 ── */}
      <section className="cs-cta">
        <div className="cs-cta-in">
          <div>
            <b>지금 바로 뷰티워크를 시작하세요</b>
            <p>매장과 본사 채용을 더 쉽고 빠르게</p>
          </div>
          <div className="cs-cta-btns">
            <Link href="/company/signup?type=STORE" className="cs-btn-white">
              매장 채용 시작하기 <ArrowRight size={16} />
            </Link>
            <Link href="/company/signup?type=OFFICE" className="cs-btn-white line">
              본사 채용 시작하기 <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
