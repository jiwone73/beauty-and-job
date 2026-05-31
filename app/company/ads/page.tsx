"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

const PRODUCTS = [
  {
    id: "banner",
    emoji: "📢",
    name: "메인 AD 배너",
    tag: "최대 노출",
    tagColor: "#e53935",
    summary: "뷰티앤잡 메인 페이지 상단 풀 배너에 브랜드·서비스를 노출합니다.",
    desc: "사이트 방문자 전원에게 노출되는 가장 효과적인 광고 상품입니다. 히어로 영역 또는 메인 상단에 배치되어 브랜드 인지도 제고에 최적화되어 있습니다.",
    features: [
      "메인 페이지 상단 풀 배너 (PC·모바일 동시 노출)",
      "클릭 시 지정 URL 이동",
      "노출 기간 내 무제한 클릭",
      "소재 제작 가이드 제공 (별도 제작비 없음)",
    ],
    pricing: [
      { label: "7일", price: "200,000원", badge: "" },
      { label: "14일", price: "350,000원", badge: "인기" },
      { label: "30일", price: "600,000원", badge: "추천" },
    ],
    note: "광고 소재(이미지)는 고객사 제공 또는 뷰티앤잡 제작 대행 가능 (제작비 별도 협의)",
  },
  {
    id: "pick",
    emoji: "⭐",
    name: "뷰티앤잡 Pick",
    tag: "선별 노출",
    tagColor: "#7c3aed",
    summary: "프리미엄 상단공고 중 뷰티앤잡이 선별한 공고를 메인 페이지 'Pick' 섹션에 노출합니다.",
    desc: "프리미엄 상단공고를 운영하는 광고주 중에서, 뷰티앤잡이 신뢰도와 공고 완성도를 기준으로 선별해 메인 'Pick' 섹션에 추가 노출합니다. 별도 신청 상품이 아닌, 프리미엄 광고주에게 제공되는 선별 노출 혜택입니다.",
    features: [
      "메인 페이지 Pick 섹션 카드 노출 (최대 6개 슬롯)",
      "프리미엄 상단공고와 동일 가격 (추가 비용 없음)",
      "뷰티앤잡 선별 기준 충족 시 노출",
    ],
    pricing: [
      { label: "7일", price: "50,000원", badge: "" },
      { label: "14일", price: "90,000원", badge: "인기" },
      { label: "30일", price: "150,000원", badge: "추천" },
    ],
    note: "Pick은 프리미엄 상단공고 운영 시 선별을 통해 노출되는 혜택입니다. 노출 여부 및 기간은 뷰티앤잡이 결정합니다.",
  },
  {
    id: "top",
    emoji: "🔝",
    name: "프리미엄 상단공고",
    tag: "채용공고 상단 고정",
    tagColor: "#0ea5e9",
    summary: "채용공고 목록 최상단에 공고를 고정 노출하여 지원자 유입을 극대화합니다.",
    desc: "일반 공고보다 3~5배 높은 조회수가 기대됩니다. 경쟁이 치열한 직군·지역에서 빠른 채용이 필요할 때 효과적입니다.",
    features: [
      "채용공고 목록 최상단 고정 (일반 공고 위)",
      "'프리미엄' 배지 표시로 신뢰도 강화",
      "카테고리·지역 필터 결과에서도 상단 유지",
      "기간 중 공고 내용 수정 가능",
    ],
    pricing: [
      { label: "7일", price: "50,000원", badge: "" },
      { label: "14일", price: "90,000원", badge: "인기" },
      { label: "30일", price: "150,000원", badge: "추천" },
    ],
    note: "1개 공고 기준 가격입니다. 복수 공고 동시 등록 시 10% 할인 적용.",
  },
  {
    id: "service",
    emoji: "🛍️",
    name: "추천 뷰티 서비스",
    tag: "서비스 광고",
    tagColor: "#10b981",
    summary: "메인 페이지 '추천 뷰티 서비스' 섹션에 교육·장비·용품·예약관리 등 뷰티 관련 서비스를 노출합니다.",
    desc: "뷰티 종사자·사업자를 대상으로 한 B2B 광고 상품입니다. 교육기관, 장비·용품 공급사, SaaS 서비스 등 뷰티 산업 내 서비스 제공자에게 최적화된 채널입니다.",
    features: [
      "메인 페이지 추천 서비스 카드 노출",
      "서비스명·설명·회사명 직접 입력",
      "클릭 시 랜딩 URL 연결",
      "타겟: 뷰티 종사자·매장 사업자",
    ],
    pricing: [
      { label: "기본형 (카드 노출)", price: "협의", badge: "" },
      { label: "강조형 (배지 + 상단)", price: "협의", badge: "" },
      { label: "패키지 (Pick + 서비스)", price: "협의", badge: "추천" },
    ],
    note: "서비스 특성에 따라 맞춤 견적을 제공합니다. 하단 문의하기 버튼으로 연락 주세요.",
  },
];

const FAQS = [
  { q: "광고 집행 후 효과를 어떻게 확인하나요?", a: "노출 수, 클릭 수, 클릭률(CTR) 데이터를 담당자가 기간 종료 후 리포트로 제공합니다." },
  { q: "광고 소재는 직접 만들어야 하나요?", a: "고객사 제공이 원칙이나, 뷰티앤잡 제작 대행도 가능합니다. 별도 비용은 상담 시 안내드립니다." },
  { q: "결제는 어떻게 하나요?", a: "세금계산서 발행 후 계좌이체로 진행됩니다. 선결제 후 광고가 집행됩니다." },
  { q: "중도 취소나 환불이 되나요?", a: "집행 시작 전 취소 시 전액 환불, 집행 중에는 잔여 기간 비율만큼 환불됩니다." },
  { q: "여러 상품을 동시에 신청할 수 있나요?", a: "네, 패키지 할인도 운영 중입니다. 2개 이상 상품 동시 신청 시 별도 상담을 통해 할인 혜택을 안내드립니다." },
];

export default function AdsLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openProduct, setOpenProduct] = useState<string | null>("banner");

  return (
    <div className="ads-page">
      {/* 헤더 */}
      <header className="ads-header">
        <div className="ads-header-inner">
          <Link href="/company" className="ads-back">
            <ChevronLeft size={18} /> 기업서비스
          </Link>
          <Link href="/">
            <Image src="/images/logo.png" alt="뷰티앤잡" width={110} height={30} />
          </Link>
          <div style={{ width: 80 }} />
        </div>
      </header>

      {/* 히어로 */}
      <section className="ads-hero">
        <span className="ads-hero-badge">광고·노출 상품</span>
        <h1 className="ads-hero-title">
          더 많은 지원자·고객에게<br />
          <span className="ads-hero-point">정확하게 노출</span>하세요
        </h1>
        <p className="ads-hero-desc">
          뷰티앤잡의 광고 상품으로 채용공고·브랜드·서비스를<br />
          뷰티 종사자에게 직접 노출할 수 있습니다.
        </p>
        <div className="ads-hero-stats">
          <div className="ads-stat"><strong>월 12만+</strong><span>페이지뷰</span></div>
          <div className="ads-stat-divider" />
          <div className="ads-stat"><strong>8만+</strong><span>월 방문자</span></div>
          <div className="ads-stat-divider" />
          <div className="ads-stat"><strong>95%</strong><span>뷰티 종사자 비율</span></div>
        </div>
      </section>

      {/* 상품 목록 */}
      <section className="ads-section">
        <div className="ads-inner">
          <h2 className="ads-section-title">광고 상품 안내</h2>
          <p className="ads-section-sub">클릭하면 상세 내용과 가격을 확인할 수 있습니다</p>

          <div className="ads-product-list">
            {PRODUCTS.map((p) => (
              <div key={p.id} className={`ads-product-card ${openProduct === p.id ? "open" : ""}`}>
                {/* 상품 헤더 (클릭으로 토글) */}
                <button
                  type="button"
                  className="ads-product-header"
                  onClick={() => setOpenProduct(openProduct === p.id ? null : p.id)}
                >
                  <div className="ads-product-header-left">
                    <span className="ads-product-emoji">{p.emoji}</span>
                    <div>
                      <div className="ads-product-name-row">
                        <strong className="ads-product-name">{p.name}</strong>
                        <span className="ads-product-tag" style={{ color: p.tagColor, background: p.tagColor + "18" }}>
                          {p.tag}
                        </span>
                      </div>
                      <p className="ads-product-summary">{p.summary}</p>
                    </div>
                  </div>
                  {openProduct === p.id ? <ChevronUp size={20} className="ads-chevron" /> : <ChevronDown size={20} className="ads-chevron" />}
                </button>

                {/* 상세 내용 */}
                {openProduct === p.id && (
                  <div className="ads-product-detail">
                    <p className="ads-product-desc">{p.desc}</p>

                    <div className="ads-detail-grid">
                      {/* 포함 내역 */}
                      <div className="ads-detail-box">
                        <h4 className="ads-detail-box-title">📌 포함 내역</h4>
                        <ul className="ads-feature-list">
                          {p.features.map((f, i) => (
                            <li key={i}>
                              <CheckCircle2 size={14} style={{ color: "#7c3aed", flexShrink: 0 }} />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 가격 */}
                      <div className="ads-detail-box">
                        <h4 className="ads-detail-box-title">💳 가격 안내</h4>
                        <div className="ads-pricing-list">
                          {p.pricing.map((pr, i) => (
                            <div key={i} className={`ads-pricing-row ${pr.badge ? "highlight" : ""}`}>
                              <span className="ads-pricing-label">{pr.label}</span>
                              {pr.badge && <span className="ads-pricing-badge">{pr.badge}</span>}
                              <span className="ads-pricing-price">{pr.price}</span>
                            </div>
                          ))}
                        </div>
                        {p.note && <p className="ads-pricing-note">* {p.note}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* 광고 문의 버튼 */}
      <div className="ads-inner" style={{ textAlign: "center", padding: "8px 0 40px" }}>
        <Link href="/company/ads/inquiry" className="ads-cta-btn">
          📩 광고상품 문의하기
        </Link>
      </div>
      {/* FAQ */}
      <section className="ads-section gray">
        <div className="ads-inner">
          <h2 className="ads-section-title">자주 묻는 질문</h2>
          <div className="ads-faq-list">
            {FAQS.map((faq, i) => (
              <div key={i}
                className={`ads-faq-item ${openFaq === i ? "open" : ""}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="ads-faq-q">
                  <span>Q. {faq.q}</span>
                  {openFaq === i ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                </div>
                {openFaq === i && <p className="ads-faq-a">{faq.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      
    </div>
  );
}
