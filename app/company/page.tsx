"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2, ChevronDown, ChevronRight, ChevronUp,
  Star, Users, Briefcase, TrendingUp, Zap, Shield,
  Building2, Phone, Mail, ArrowRight,
} from "lucide-react";

/* ===== FAQ 데이터 ===== */
const FAQS = [
  {
    q: "기업회원 가입 비용이 있나요?",
    a: "기업회원 가입은 완전 무료입니다. 가입 후 유료 채용공고 등록이나 성과형 매칭 서비스를 선택하실 수 있으며, 무료 공고 등록도 가능합니다."
  },
  {
    q: "성과형 매칭 수수료는 얼마인가요?",
    a: "채용 성사 시 수수료가 발생하며, 직무·연봉·채용 난이도에 따라 달라집니다. 일반 매장직은 정액형, 경력직·관리자급은 연봉 기준 비율로 산정됩니다. 정확한 조건은 담당자 상담 후 확정됩니다."
  },
  {
    q: "유료 채용공고 기간 중 채용이 완료되면 환불이 되나요?",
    a: "공고 등록 후 채용이 완료되어 조기 마감하는 경우, 남은 기간에 대한 부분 환불 또는 다음 공고로 이월이 가능합니다. 자세한 사항은 고객센터로 문의해 주세요."
  },
  {
    q: "채용공고 노출 위치는 어떻게 되나요?",
    a: "베이직은 일반 목록에, 스탠다드는 카테고리 상단에, 프리미엄은 메인 페이지 추천공고 및 카테고리 최상단에 노출됩니다. 프리미엄은 SNS 홍보도 병행합니다."
  },
  {
    q: "어떤 직무까지 채용 지원이 가능한가요?",
    a: "매장직(뷰티 어드바이저, 판매직), 시술직(에스테티션, 헤어, 네일), 본사직(마케팅, MD, BM, 영업), 교육직, 글로벌·수출입, 콘텐츠·디자인 등 뷰티 산업 전 직무를 지원합니다."
  },
  {
    q: "후보자 추천은 얼마나 걸리나요?",
    a: "채용 조건 확인 후 통상 3~7 영업일 이내에 적합 후보자를 추천드립니다. 긴급 채용의 경우 별도 협의를 통해 더 빠르게 진행 가능합니다."
  },
];

/* ===== 상품 데이터 ===== */
const PRODUCTS = [
  {
    name: "베이직",
    period: "15일",
    badge: null,
    price: "문의",
    features: ["일반 채용공고 노출", "직무 카테고리 목록 등재", "기본 지원자 관리"],
    cta: "시작하기",
    recommended: false,
    color: "var(--color-bg-soft)",
    textColor: "var(--color-text)",
  },
  {
    name: "스탠다드",
    period: "30일",
    badge: "인기",
    price: "문의",
    features: ["카테고리 상단 노출", "직무 카테고리 목록 등재", "지원자 관리 + 필터링", "이메일 알림"],
    cta: "시작하기",
    recommended: true,
    color: "var(--color-primary)",
    textColor: "white",
  },
  {
    name: "프리미엄",
    period: "30일",
    badge: "빠른채용",
    price: "문의",
    features: ["메인 추천공고 노출", "카테고리 최상단 노출", "SNS 홍보 병행", "전담 매니저 배정", "후보자 추천 병행"],
    cta: "상담 신청",
    recommended: false,
    color: "#1f2024",
    textColor: "white",
  },
  {
    name: "긴급 채용",
    period: "7~14일",
    badge: "⚡ 긴급",
    price: "문의",
    features: ["긴급 공고 표시 배지", "즉시 노출 처리", "후보자 우선 추천", "담당자 즉시 배정"],
    cta: "긴급 신청",
    recommended: false,
    color: "#fff3e0",
    textColor: "var(--color-text)",
  },
];

/* ===== 인재풀 데이터 ===== */
const TALENT_POOL = [
  { icon: "🛍️", category: "매장 / 판매", roles: ["뷰티 어드바이저", "화장품 판매직", "매장 매니저"] },
  { icon: "💆", category: "시술 / 서비스", roles: ["에스테티션", "헤어디자이너", "네일리스트", "메이크업 아티스트"] },
  { icon: "🏢", category: "브랜드 / 본사", roles: ["마케터", "MD", "BM", "상품기획", "영업관리"] },
  { icon: "📚", category: "교육 / 트레이닝", roles: ["제품 교육강사", "세일즈 트레이너", "아카데미 강사"] },
  { icon: "🌍", category: "글로벌 / 유통", roles: ["해외영업", "수출입", "면세", "리테일 운영"] },
  { icon: "🎨", category: "콘텐츠 / 디자인", roles: ["SNS 마케터", "콘텐츠 기획자", "디자이너", "영상 제작자"] },
];

/* ===== 기업 유형별 추천 ===== */
const COMPANY_TYPES = [
  { type: "신규 매장 오픈", recommend: "긴급 채용 패키지 + 무료 매칭", icon: "🏪" },
  { type: "브랜드 본사 채용", recommend: "프리미엄 공고 + 경력직 매칭", icon: "🏢" },
  { type: "판매직 상시 채용", recommend: "브랜드 채용관", icon: "🔄" },
  { type: "에스테틱샵 채용", recommend: "무료 공고 + 성사형 매칭", icon: "💆" },
  { type: "마케팅 / MD 채용", recommend: "프리미엄 공고 + 후보자 추천", icon: "📊" },
  { type: "관리자급 채용", recommend: "헤드헌팅 전문 상담", icon: "👔" },
];

export default function CompanyPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <div className="company-page">
      {/* ===== GNB ===== */}
      <header className="company-header">
        <div className="company-header-inner">
          <Link href="/" className="company-logo">
            <Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} priority />
          </Link>
          <nav className="company-gnb">
            <a href="#service" className="company-gnb-item">서비스 소개</a>
            <a href="#products" className="company-gnb-item">상품 안내</a>
            <a href="#matching" className="company-gnb-item">무료 매칭</a>
            <a href="#talent" className="company-gnb-item">인재풀</a>
            <a href="#faq" className="company-gnb-item">FAQ</a>
          </nav>
          <div className="company-header-right">
            <button className="company-consult-btn" onClick={() => setShowContactModal(true)}>
              도입 문의
            </button>
            <Link href="/company/signup" className="company-start-btn">
              기업회원 시작하기
            </Link>
          </div>
        </div>
      </header>

      {/* ===== 1. HERO ===== */}
      <section className="company-hero">
        <div className="company-hero-inner">
          <div className="company-hero-left">
            <span className="company-hero-badge">뷰티 기업을 위한 전문 채용 플랫폼</span>
            <h1 className="company-hero-title">
              화장품·에스테틱·헤어·네일·스파<br />
              뷰티 인재를 가장 빠르게<br />
              <span className="company-hero-point">만나는 방법</span>
            </h1>
            <p className="company-hero-desc">
              뷰티앤잡은 일반 구인구직 사이트가 아니라<br />
              뷰티 산업 직무와 현장을 이해하는 전문 채용 플랫폼입니다.<br />
              채용공고 등록부터 인재 매칭, 면접 연결, 채용 성사까지<br />
              기업의 채용 과정을 함께 지원합니다.
            </p>
            <div className="company-hero-cta">
              <Link href="/company/signup" className="company-btn-primary">
                기업회원 무료 시작하기
                <ArrowRight size={18} />
              </Link>
              <a href="#matching" className="company-btn-outline">
                무료 매칭 의뢰하기
              </a>
            </div>
            <div className="company-hero-trust">
              {["뷰티 전문 인재풀 기반", "유료 공고 등록 가능", "채용 성사형 매칭 서비스", "기업 규모별 맞춤 상품"].map((item) => (
                <div key={item} className="company-trust-item">
                  <CheckCircle2 size={15} className="company-trust-icon" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="company-hero-right">
            {/* 채용 흐름 카드 UI */}
            <div className="company-flow-card">
              <div className="company-flow-title">채용 시작 → 성사까지</div>
              {[
                { step: "01", label: "기업회원 가입", desc: "무료, 3분 완료", icon: "✅" },
                { step: "02", label: "채용 목적 선택", desc: "공고 등록 / 매칭 의뢰", icon: "🎯" },
                { step: "03", label: "추천 서비스 확인", desc: "직무·규모에 맞춤 제안", icon: "💡" },
                { step: "04", label: "후보자 매칭", desc: "뷰티 전문 인재 연결", icon: "🤝" },
                { step: "05", label: "채용 성사", desc: "면접 → 최종 합격", icon: "🎉" },
              ].map((item, i) => (
                <div key={i} className="company-flow-step">
                  <div className="company-flow-step-num">{item.step}</div>
                  <div className="company-flow-step-info">
                    <strong>{item.label}</strong>
                    <span>{item.desc}</span>
                  </div>
                  <div className="company-flow-step-icon">{item.icon}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== 2. 문제 제기 ===== */}
      <section className="company-section" id="service">
        <div className="company-container">
          <div className="company-section-head">
            <span className="company-section-badge">문제 인식</span>
            <h2 className="company-section-title">
              뷰티 인재 채용,<br />
              일반 채용 플랫폼만으로 충분하셨나요?
            </h2>
            <p className="company-section-desc">
              뷰티 채용은 단순히 사람을 뽑는 일이 아닙니다.<br />
              브랜드 이미지, 고객 응대력, 제품 이해도, 현장 경험, 감각까지 함께 봐야 합니다.
            </p>
          </div>

          <div className="company-problem-grid">
            {[
              { problem: "지원자는 많은데 실제 적합자가 적음", solution: "뷰티 직무 기반 인재풀 매칭" },
              { problem: "경력과 포트폴리오 검증이 어려움", solution: "직무·경력·브랜드 경험 중심 확인" },
              { problem: "매장직, 마케팅직 채용 방식이 달라 복잡", solution: "직무별 공고 템플릿 제공" },
              { problem: "단기 채용과 상시 채용을 함께 운영해야 함", solution: "유료 공고와 매칭 의뢰 병행 가능" },
              { problem: "뷰티 산업을 모르는 채용대행사는 답답함", solution: "뷰티 업종 이해 기반 상담 지원" },
              { problem: "지방 매장 채용은 지원자 자체가 부족", solution: "지역 타겟 공고 + 매칭 서비스" },
            ].map((item, i) => (
              <div key={i} className="company-problem-card">
                <div className="company-problem-top">
                  <span className="company-problem-icon">😤</span>
                  <p className="company-problem-text">{item.problem}</p>
                </div>
                <div className="company-problem-arrow">↓</div>
                <div className="company-problem-solution">
                  <CheckCircle2 size={14} />
                  <span>{item.solution}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 3. 강점 ===== */}
      <section className="company-section company-section-gray">
        <div className="company-container">
          <div className="company-section-head">
            <span className="company-section-badge">핵심 강점</span>
            <h2 className="company-section-title">왜 기업들은 뷰티앤잡을 선택해야 할까요?</h2>
          </div>

          <div className="company-strength-grid">
            <div className="company-strength-card">
              <div className="company-strength-icon"><Users size={28} /></div>
              <h3>뷰티 산업에 특화된 인재풀</h3>
              <p>화장품 브랜드, 피부관리, 헤어, 네일, 메이크업, 스파, 뷰티 리테일, 교육강사 등 뷰티 업계 직무에 관심 있는 구직자를 중심으로 인재 DB를 구축합니다.</p>
            </div>
            <div className="company-strength-card">
              <div className="company-strength-icon"><Briefcase size={28} /></div>
              <h3>직무별 채용 니즈를 이해</h3>
              <p>뷰티 어드바이저, 에스테티션, 헤어디자이너, 브랜드 마케터 등 직무마다 다른 채용 기준을 이해하고 그에 맞는 인재를 연결합니다.</p>
              <div className="company-strength-table">
                {[["뷰티 어드바이저", "고객 응대, 제품 설명, 매장 경험"],["에스테티션", "피부관리 경력, 자격, 고객 관리"],["브랜드 마케터", "콘텐츠 기획, SNS, 브랜드 이해도"]].map(([role, point]) => (
                  <div key={role} className="company-strength-row">
                    <span className="company-strength-role">{role}</span>
                    <span className="company-strength-point">{point}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="company-strength-card">
              <div className="company-strength-icon"><TrendingUp size={28} /></div>
              <h3>공고 등록과 매칭을 동시에</h3>
              <p>기업 상황에 따라 유료 채용공고, 무료 공고, 성과형 매칭, 헤드헌팅 중 선택하거나 병행할 수 있습니다.</p>
              <div className="company-strength-tags">
                {["유료 채용공고", "무료 공고", "성과형 매칭", "헤드헌팅"].map((tag) => (
                  <span key={tag} className="company-tag">{tag}</span>
                ))}
              </div>
            </div>
            <div className="company-strength-card">
              <div className="company-strength-icon"><Zap size={28} /></div>
              <h3>채용 시작 장벽을 낮춘 Wizard</h3>
              <p>기업회원 가입 후 채용 목적 선택 → 추천 서비스 확인 → 공고 등록 또는 매칭 의뢰까지 단계별 질문 방식으로 쉽게 진행합니다.</p>
              <Link href="/company/signup" className="company-strength-cta">
                3분 만에 시작하기 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 4. 서비스 유형 ===== */}
      <section className="company-section">
        <div className="company-container">
          <div className="company-section-head">
            <span className="company-section-badge">서비스 선택</span>
            <h2 className="company-section-title">기업 상황에 맞는 채용 방식을 선택하세요</h2>
          </div>

          <div className="company-service-grid">
            {[
              {
                icon: "📋",
                title: "유료 채용공고",
                desc: "직접 지원자를 받고 싶은 기업",
                features: ["원하는 기간 공고 노출", "직무별 지원자 관리", "상단/메인 노출 선택"],
                cta: "공고 등록하기",
                href: "/company/signup",
                color: "var(--color-primary-pale)",
              },
              {
                icon: "🎁",
                title: "무료 공고 등록",
                desc: "비용 부담 없이 먼저 시작하고 싶은 기업",
                features: ["채용공고 무료 등록", "기본 목록 노출", "지원자 직접 관리"],
                cta: "무료로 시작",
                href: "/company/signup",
                color: "#e8f5e9",
              },
              {
                icon: "🤝",
                title: "성과형 인재 매칭",
                desc: "채용 성사 시에만 수수료 발생",
                features: ["초기 비용 없음", "후보자 직접 추천", "담당자 밀착 지원", "채용 성사 시 수수료"],
                cta: "매칭 의뢰하기",
                href: "#matching",
                color: "#fff3e0",
                highlight: true,
              },
              {
                icon: "👑",
                title: "헤드헌팅 전문 매칭",
                desc: "경력직·관리자급 채용이 필요한 기업",
                features: ["검증된 경력자 추천", "포지션별 맞춤 서치", "연봉 협상 지원", "별도 협의"],
                cta: "상담 신청",
                href: "#contact",
                color: "#ede7f6",
              },
            ].map((item) => (
              <div key={item.title} className={`company-service-card ${item.highlight ? "highlight" : ""}`} style={{ background: item.color }}>
                <div className="company-service-icon">{item.icon}</div>
                <h3 className="company-service-title">{item.title}</h3>
                <p className="company-service-desc">{item.desc}</p>
                <ul className="company-service-features">
                  {item.features.map((f) => (
                    <li key={f}>
                      <CheckCircle2 size={13} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href={item.href} className="company-service-cta">{item.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 5. 상품 안내 ===== */}
      <section className="company-section company-section-gray" id="products">
        <div className="company-container">
          <div className="company-section-head">
            <span className="company-section-badge">상품 안내</span>
            <h2 className="company-section-title">기업 상황에 맞게 선택하는 채용공고 상품</h2>
          </div>

          <div className="company-product-grid">
            {PRODUCTS.map((product) => (
              <div
                key={product.name}
                className={`company-product-card ${product.recommended ? "recommended" : ""}`}
                style={{ background: product.color, color: product.textColor }}
              >
                {product.badge && (
                  <span className="company-product-badge">{product.badge}</span>
                )}
                <h3 className="company-product-name">{product.name}</h3>
                <div className="company-product-period">{product.period}</div>
                <div className="company-product-price">
                  <span>가격</span>
                  <strong>{product.price}</strong>
                </div>
                <ul className="company-product-features">
                  {product.features.map((f) => (
                    <li key={f}>
                      <CheckCircle2 size={13} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className="company-product-cta"
                  onClick={() => setShowContactModal(true)}
                  style={{
                    background: product.recommended ? "white" : "var(--color-primary)",
                    color: product.recommended ? "var(--color-primary)" : "white",
                  }}
                >
                  {product.cta}
                </button>
              </div>
            ))}
          </div>

          <div className="company-product-note">
            💡 모든 유료 상품에는 <strong>무료 매칭 의뢰 1회</strong>가 함께 제공됩니다.
            정확한 가격은 담당자 상담 후 안내드립니다.
          </div>
        </div>
      </section>

      {/* ===== 6. 무료 매칭 안내 ===== */}
      <section className="company-section" id="matching">
        <div className="company-container">
          <div className="company-matching-box">
            <div className="company-matching-left">
              <span className="company-section-badge" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>성과형 매칭 서비스</span>
              <h2 className="company-matching-title">
                초기 비용 없이 시작하는<br />
                성과형 인재 매칭
              </h2>
              <p className="company-matching-desc">
                채용공고 등록은 무료로 시작하고,<br />
                뷰티앤잡을 통해 연결된 인재가 최종 채용될 경우에만<br />
                약정된 채용 수수료가 발생하는 서비스입니다.
              </p>
              <div className="company-matching-fee">
                <div className="company-matching-fee-row">
                  <span>일반 매장직</span>
                  <span>정액형 또는 월급 기준</span>
                </div>
                <div className="company-matching-fee-row">
                  <span>경력직 / 관리자</span>
                  <span>연봉 기준 일정 비율</span>
                </div>
                <div className="company-matching-fee-row">
                  <span>본사 전문직</span>
                  <span>포지션 난이도별 협의</span>
                </div>
              </div>
              <Link href="/company/signup" className="company-matching-cta">
                무료로 매칭 의뢰하기 →
              </Link>
            </div>

            <div className="company-matching-right">
              <div className="company-matching-steps">
                <h4 className="company-matching-steps-title">진행 방식</h4>
                {[
                  "기업회원 가입",
                  "무료 채용 의뢰 등록",
                  "뷰티앤잡 담당자 조건 확인",
                  "적합 후보자 추천 (3~7 영업일)",
                  "기업 면접 진행",
                  "최종 채용 확정",
                  "채용 성사 수수료 정산",
                ].map((step, i) => (
                  <div key={i} className="company-matching-step">
                    <div className="company-matching-step-num">{i + 1}</div>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 7. 인재풀 ===== */}
      <section className="company-section company-section-gray" id="talent">
        <div className="company-container">
          <div className="company-section-head">
            <span className="company-section-badge">인재풀</span>
            <h2 className="company-section-title">뷰티앤잡은 뷰티 산업에 관심 있는 인재를 모읍니다</h2>
            <p className="company-section-desc">
              뷰티앤잡은 단순 구직자가 아니라<br />
              뷰티 산업에서 일하고 싶은 사람, 뷰티 경력을 이어가고 싶은 사람,<br />
              브랜드와 현장을 이해하는 사람을 연결합니다.
            </p>
          </div>
          <div className="company-talent-grid">
            {TALENT_POOL.map((pool) => (
              <div key={pool.category} className="company-talent-card">
                <div className="company-talent-icon">{pool.icon}</div>
                <h3 className="company-talent-category">{pool.category}</h3>
                <div className="company-talent-roles">
                  {pool.roles.map((role) => (
                    <span key={role} className="company-talent-role">{role}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 8. 기업 유형별 추천 ===== */}
      <section className="company-section">
        <div className="company-container">
          <div className="company-section-head">
            <span className="company-section-badge">맞춤 추천</span>
            <h2 className="company-section-title">기업 상황에 맞는 채용 방식을 제안합니다</h2>
          </div>
          <div className="company-recommend-grid">
            {COMPANY_TYPES.map((item) => (
              <div key={item.type} className="company-recommend-card">
                <span className="company-recommend-icon">{item.icon}</span>
                <div className="company-recommend-info">
                  <strong>{item.type}</strong>
                  <span>{item.recommend}</span>
                </div>
                <ChevronRight size={16} className="company-recommend-arrow" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 9. FAQ ===== */}
      <section className="company-section company-section-gray" id="faq">
        <div className="company-container">
          <div className="company-section-head">
            <span className="company-section-badge">FAQ</span>
            <h2 className="company-section-title">자주 묻는 질문</h2>
          </div>
          <div className="company-faq-list">
            {FAQS.map((faq, i) => (
              <div key={i} className="company-faq-item">
                <button
                  className="company-faq-q"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span>Q. {faq.q}</span>
                  {openFaq === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {openFaq === i && (
                  <div className="company-faq-a">A. {faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 10. 최종 CTA ===== */}
      <section className="company-final-cta">
        <div className="company-container">
          <h2 className="company-final-title">뷰티 인재 채용, 지금 시작해보세요</h2>
          <p className="company-final-desc">
            기업 상황에 맞게 공고 등록, 무료 매칭, 전문 상담 중 선택할 수 있습니다.
          </p>
          <div className="company-final-buttons">
            <Link href="/company/signup" className="company-btn-primary">
              기업회원 무료 시작하기
              <ArrowRight size={18} />
            </Link>
            <Link href="/company/signup" className="company-btn-white">
              무료 매칭 의뢰하기
            </Link>
            <button className="company-btn-outline-white" onClick={() => setShowContactModal(true)}>
              상품 상담 신청하기
            </button>
          </div>
        </div>
      </section>

      {/* ===== 하단 고정 CTA (모바일) ===== */}
      <div className="company-sticky-cta">
        <Link href="/company/signup" className="company-sticky-btn-primary">기업회원 시작</Link>
        <Link href="/company/signup" className="company-sticky-btn-secondary">무료 매칭</Link>
      </div>

      {/* ===== 상담 문의 모달 ===== */}
      {showContactModal && (
        <div className="cv-overlay" onClick={() => setShowContactModal(false)}>
          <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cv-header">
              <div style={{ width: 36 }} />
              <h2 className="cv-title">도입 문의 / 상담 신청</h2>
              <button className="cv-close" onClick={() => setShowContactModal(false)}>✕</button>
            </div>
            <div className="cv-body">
              <p className="cv-desc">아래 정보를 입력하시면 담당자가 1 영업일 이내에 연락드립니다.</p>
              <label className="cv-field-label cv-required">회사명</label>
              <input className="cv-input" placeholder="회사명을 입력해 주세요." />
              <label className="cv-field-label cv-required">담당자명</label>
              <input className="cv-input" placeholder="담당자명을 입력해 주세요." />
              <label className="cv-field-label cv-required">연락처</label>
              <input className="cv-input" placeholder="010-0000-0000" type="tel" />
              <label className="cv-field-label">문의 내용</label>
              <textarea className="cv-textarea" placeholder="채용 직무, 채용 규모, 궁금한 점 등을 입력해 주세요." />
              <button className="cv-btn-primary" onClick={() => {
                alert("상담 신청이 완료되었습니다.\n담당자가 1 영업일 이내에 연락드립니다.");
                setShowContactModal(false);
              }}>
                상담 신청하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
