"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, ChevronDown, ChevronUp, Building2, Store, Star, Zap, Megaphone, ArrowRight, Layers } from "lucide-react";

const FAQS = [
  { q: "채용공고 등록은 무료인가요?", a: "네, 기본 채용공고 등록은 완전 무료입니다. 상단 노출·프리미엄 배너 등 유료 상품은 선택 사항입니다." },
  { q: "매장도 기업회원으로 가입해야 하나요?", a: "아니요. 헤어샵, 네일샵, 피부관리실 등 매장은 매장회원으로 가입하시면 됩니다. 가입 시 유형을 선택할 수 있습니다." },
  { q: "기업회원과 매장회원은 무엇이 다른가요?", a: "매장회원은 현장직 채용에 최적화되어 있고, 기업회원은 본사 사무직·전문직 채용과 프리미엄 서비스를 이용할 수 있습니다." },
  { q: "광고도 신청할 수 있나요?", a: "네. 메인 AD 배너, 프리미엄 상단공고, 뷰티워크 Pick 등 다양한 광고 상품을 운영 중입니다." },
];

const AD_PRODUCTS = [
  { icon: "📢", title: "메인 AD 배너",     desc: "메인 상단 풀 배너. 최대 노출 효과",        price: "20만 원~" },
  { icon: "⭐", title: "뷰티워크 Pick",    desc: "공고·브랜드 큐레이션 카드 노출",           price: "10만 원~" },
  { icon: "🔝", title: "프리미엄 상단공고", desc: "채용공고 목록 최상단 고정 노출",            price: "5만 원~" },
  { icon: "🛍️", title: "추천 뷰티 서비스", desc: "뷰티 서비스·제품 카드 광고 노출",          price: "별도 협의" },
];

const STEPS = [
  { step: "01", title: "기업회원 가입",  desc: "매장 또는 기업 유형 선택 후 빠르게 가입" },
  { step: "02", title: "채용공고 등록",  desc: "직무·근무조건·급여 등 작성 후 등록" },
  { step: "03", title: "관리자 검수",    desc: "뷰티워크 담당자가 공고를 검토·승인" },
  { step: "04", title: "지원자 확인",    desc: "대시보드에서 지원자 관리 및 연락" },
];

export default function CompanyPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="co-page">
      <header style={{ borderBottom: "1px solid #eee", background: "#fff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <Link href="/">
            <Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} priority />
          </Link>
        </div>
      </header>

      {/* ── 1. 히어로 ── */}
      <section className="co-hero">
        <div className="co-hero-inner">
          <span className="co-hero-badge">기업·매장 서비스</span>
          <h1 className="co-hero-title">
            뷰티 인재 채용,<br />
            <span className="co-hero-point">뷰티워크</span>에서 시작하세요
          </h1>
          <p className="co-hero-desc">
            헤어·네일·피부·메이크업 매장부터 화장품 브랜드, 교육기관까지<br />
            뷰티 분야에 맞는 채용공고와 인재추천 서비스를 제공합니다.
          </p>
        </div>
      </section>

      {/* ── 2. 회원유형 + 이용절차 나란히 ── */}
      <section className="co-section">
        <div className="co-section-inner">
          <div className="co-combined-grid">

            {/* 왼쪽: 회원 유형 카드 */}
            <div className="co-combined-left">
              <h2 className="co-combined-title">하나의 플랫폼에서<br />매장과 기업 채용을 한번에</h2>
              <p className="co-combined-sub">매장, 기업, 기업+매장 — 운영 형태에 맞춰 자유롭게 채용하세요</p>

              <div className="co-type-stack">
                {/* 매장회원 */}
                <div className="co-type-card">
                  <div className="co-type-icon"><Store size={28} /></div>
                  <div className="co-type-body">
                    <h3 className="co-type-name">매장회원</h3>
                    <p className="co-type-desc">헤어·네일·피부·메이크업 등 뷰티 매장 운영자</p>
                    <ul className="co-type-list">
                      <li><CheckCircle2 size={13} /> 채용공고 무료 등록</li>
                      <li><CheckCircle2 size={13} /> 상단 노출로 더 많은 지원자</li>
                      <li><CheckCircle2 size={13} /> 지원자 연락처 무료 확인</li>
                      <li><CheckCircle2 size={13} /> 간편한 현장직 공고 관리</li>
                    </ul>
                  </div>
                </div>

                {/* 기업회원 */}
                <div className="co-type-card">
<div className="co-type-icon"><Building2 size={28} /></div>
                  <div className="co-type-body">
                    <h3 className="co-type-name">기업회원</h3>
                    <p className="co-type-desc">화장품 브랜드·프랜차이즈·교육기관·유통사</p>
                    <ul className="co-type-list">
                      <li><CheckCircle2 size={13} /> 채용공고 무료 등록</li>
                      <li><CheckCircle2 size={13} /> 인재 검색·추천 서비스</li>
                      <li><CheckCircle2 size={13} /> 지원자 연락처 무료 확인</li>
                      <li><CheckCircle2 size={13} /> 프리미엄 상단 노출</li>
                    </ul>
                  </div>
                </div>
                {/* 기업+매장 회원 */}
                <div className="co-type-card">
                  <div className="co-type-icon"><Layers size={28} /></div>
                  <div className="co-type-body">
                    <h3 className="co-type-name">기업 + 매장 회원</h3>
                    <p className="co-type-desc">본사와 직영·가맹 매장을 함께 운영하는 브랜드</p>
                    <ul className="co-type-list">
                      <li><CheckCircle2 size={13} /> 사무직·현장직 무료 등록</li>
                      <li><CheckCircle2 size={13} /> 통합 대시보드로 한번에 관리</li>
                      <li><CheckCircle2 size={13} /> 매장·기업 지원자 통합 관리</li>
                      <li><CheckCircle2 size={13} /> 인재 검색·추천 서비스</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 오른쪽: 이용 절차 세로 */}
            <div className="co-combined-right">
              <h2 className="co-combined-title">이용 절차</h2>
              <p className="co-combined-sub">4단계로 간단하게 시작할 수 있습니다</p>
              <div className="co-steps-vertical">
                {STEPS.map((s, i) => (
                  <div key={i} className="co-step-v">
                    <div className="co-step-v-left">
                      <div className="co-step-v-num">{s.step}</div>
                      {i < STEPS.length - 1 && <div className="co-step-v-line" />}
                    </div>
                    <div className="co-step-v-content">
                      <h3 className="co-step-v-title">{s.title}</h3>
                      <p className="co-step-v-desc">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 가입 CTA ── */}
      <section className="co-section">
        <div className="co-section-inner" style={{ textAlign: "center" }}>
          <h2 className="co-section-title">지금 바로 시작하세요</h2>
          <p className="co-section-sub">매장, 기업, 기업+매장 — 가입 시 유형을 선택할 수 있어요</p>
          <Link href="/company/signup" className="co-btn-primary purple" style={{ marginTop: 24, display: "inline-flex" }}>
            기업회원 가입하기 <ArrowRight size={15} style={{ marginLeft: 6 }} />
          </Link>
        </div>
      </section>

      {/* ── 5. 프리미엄 광고·노출 상품 ── */}
      <section className="co-section gray">
        <div className="co-section-inner">
          <h2 className="co-section-title">프리미엄 광고·노출 상품</h2>
          <p className="co-section-sub">더 많은 지원자·고객에게 노출하고 싶다면</p>
          <div className="co-ad-grid">
            {AD_PRODUCTS.map((p, i) => (
              <div key={i} className="co-ad-card">
                <div className="co-ad-icon">{p.icon}</div>
                <h3 className="co-ad-title">{p.title}</h3>
                <p className="co-ad-desc">{p.desc}</p>
                <span className="co-ad-price">{p.price}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
            <Link href="/company/ads" className="co-cta-product-btn purple">
              📋 광고·노출 상품 보기
            </Link>
          </div>
        </div>
      </section>

      {/* ── 6. FAQ ── */}
      <section className="co-section">
        <div className="co-section-inner">
          <h2 className="co-section-title">자주 묻는 질문</h2>
          <div className="co-faq-list">
            {FAQS.map((faq, i) => (
              <div key={i}
                className={"co-faq-item" + (openFaq === i ? " open" : "")}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="co-faq-q">
                  <span>Q. {faq.q}</span>
                  {openFaq === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
                {openFaq === i && <p className="co-faq-a">{faq.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
