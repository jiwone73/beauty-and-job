"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2, ChevronDown, ChevronUp,
  Building2, Store, Megaphone, Users,
  Star, Zap, Gift, ArrowRight
} from "lucide-react";

const FAQS = [
  {
    q: "채용공고 등록은 무료인가요?",
    a: "네, 기본 채용공고 등록은 완전 무료입니다. 상단 노출·프리미엄 배너 등 유료 상품은 선택 사항입니다.",
  },
  {
    q: "매장도 기업회원으로 가입해야 하나요?",
    a: "아니요. 헤어샵, 네일샵, 피부관리실 등 매장은 '매장회원'으로 가입하시면 됩니다. 가입 시 유형을 선택할 수 있습니다.",
  },
  {
    q: "기업회원과 매장회원은 무엇이 다른가요?",
    a: "매장회원은 현장직(헤어디자이너, 네일아티스트 등) 채용에 최적화되어 있고, 기업회원은 본사 사무직·전문직 채용과 프리미엄 서비스를 이용할 수 있습니다.",
  },
  {
    q: "광고도 신청할 수 있나요?",
    a: "네. 메인 AD 배너, 프리미엄 상단공고, 뷰티앤잡 Pick 등 다양한 광고 상품을 운영 중입니다. 하단 문의하기 버튼으로 연락해 주세요.",
  },
  {
    q: "채용성공형 서비스도 가능한가요?",
    a: "네. 채용 성사 시에만 수수료가 발생하는 성과형 인재 매칭 서비스도 운영 중입니다. 별도 상담 후 진행됩니다.",
  },
];

const PRICING = [
  { label: "무료 채용공고", price: "무료", color: "#7c3aed", highlight: true },
  { label: "상단노출 공고", price: "5만 원~", color: "#6d28d9", highlight: false },
  { label: "뷰티앤잡 Pick", price: "10만 원~", color: "#5b21b6", highlight: false },
  { label: "메인 AD 배너", price: "20만 원~", color: "#4c1d95", highlight: false },
  { label: "채용성공형 매칭", price: "별도 협의", color: "#374151", highlight: false },
  { label: "추천 뷰티 서비스 광고", price: "별도 협의", color: "#374151", highlight: false },
];

const SERVICES = [
  {
    icon: <Gift size={26} />,
    title: "무료 채용공고 등록",
    desc: "기업·매장 모두 무료로 등록 가능. 즉시 지원자 모집 시작",
    tag: "FREE",
  },
  {
    icon: <Star size={26} />,
    title: "프리미엄 공고 노출",
    desc: "메인 상단 노출·SNS 홍보로 더 많은 지원자 확보",
    tag: "PREMIUM",
  },
  {
    icon: <Users size={26} />,
    title: "인재추천 상담",
    desc: "경력직·관리자급 전문 매칭. 채용 성사 시 수수료",
    tag: "MATCHING",
  },
  {
    icon: <Megaphone size={26} />,
    title: "추천 뷰티 서비스 광고",
    desc: "교육·장비·용품·예약관리 등 뷰티 서비스 홍보 노출",
    tag: "AD",
  },
];

const AD_PRODUCTS = [
  { icon: "📢", title: "메인 AD 배너", desc: "메인 상단 풀 배너. 최대 노출 효과", price: "20만 원~" },
  { icon: "⭐", title: "뷰티앤잡 Pick", desc: "공고·브랜드 큐레이션 카드 노출", price: "10만 원~" },
  { icon: "🔝", title: "프리미엄 상단공고", desc: "채용공고 목록 최상단 고정 노출", price: "5만 원~" },
  { icon: "🛍️", title: "추천 뷰티 서비스", desc: "뷰티 서비스·제품 카드 광고 노출", price: "별도 협의" },
];

const STEPS = [
  { step: "01", title: "기업회원 가입", desc: "매장 또는 기업 유형 선택 후 빠르게 가입" },
  { step: "02", title: "채용공고 등록", desc: "직무·근무조건·급여 등 작성 후 등록" },
  { step: "03", title: "관리자 검수", desc: "뷰티앤잡 담당자가 공고를 검토·승인" },
  { step: "04", title: "지원자 확인", desc: "대시보드에서 지원자 관리 및 연락" },
];

export default function CompanyPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="co-page">

      {/* ── 1. 히어로 ── */}
      <section className="co-hero">
        <div className="co-hero-inner">
          <span className="co-hero-badge">기업·매장 서비스</span>
          <h1 className="co-hero-title">
            뷰티 인재 채용,<br />
            <span className="co-hero-point">뷰티앤잡</span>에서 시작하세요
          </h1>
          <p className="co-hero-desc">
            헤어·네일·피부·메이크업 매장부터 화장품 브랜드, 병원·클리닉, 교육기관까지<br />
            뷰티 분야에 맞는 채용공고와 인재추천 서비스를 제공합니다.
          </p>
        </div>
      </section>

      {/* ── 2. 회원 유형 선택 ── */}
      <section className="co-section">
        <div className="co-section-inner">
          <h2 className="co-section-title">어떤 유형으로 시작하시나요?</h2>
          <p className="co-section-sub">가입 유형에 따라 맞춤 서비스를 제공합니다</p>
          <div className="co-type-grid">
            <div className="co-type-card">
              <div className="co-type-icon"><Store size={32} /></div>
              <h3 className="co-type-name">매장회원</h3>
              <p className="co-type-desc">
                헤어샵·네일샵·피부관리실<br />
                에스테틱·왁싱샵·속눈썹샵<br />
                메이크업샵 운영자
              </p>
              <ul className="co-type-list">
                <li><CheckCircle2 size={14} /> 무료 채용공고 등록</li>
                <li><CheckCircle2 size={14} /> 현장직 지원자 매칭</li>
                <li><CheckCircle2 size={14} /> 간편 가입 (1분 완료)</li>
              </ul>
              <Link href="/company/signup?type=store" className="co-type-btn">
              매장회원 시작하기 <ArrowRight size={15} />
              </Link>
            </div>

            <div className="co-type-card featured">
              <span className="co-type-featured-badge">기업 추천</span>
              <div className="co-type-icon"><Building2 size={32} /></div>
              <h3 className="co-type-name">기업회원</h3>
              <p className="co-type-desc">
                화장품 브랜드·프랜차이즈<br />
                병원·클리닉·교육기관<br />
                용품·장비업체·유통사
              </p>
              <ul className="co-type-list">
                <li><CheckCircle2 size={14} /> 무료 공고 + 프리미엄 서비스</li>
                <li><CheckCircle2 size={14} /> 경력직·관리자급 인재추천</li>
                <li><CheckCircle2 size={14} /> 광고·노출 상품 이용 가능</li>
              </ul>
              <Link href="/company/signup?type=corp" className="co-type-btn primary">
                기업회원 시작하기 <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. 주요 서비스 4종 ── */}
      <section className="co-section gray">
        <div className="co-section-inner">
          <h2 className="co-section-title">주요 서비스</h2>
          <p className="co-section-sub">기업·매장 규모에 맞게 선택해 사용하세요</p>
          <div className="co-service-grid">
            {SERVICES.map((s, i) => (
              <div key={i} className="co-service-card">
                <div className="co-service-icon">{s.icon}</div>
                <span className="co-service-tag">{s.tag}</span>
                <h3 className="co-service-title">{s.title}</h3>
                <p className="co-service-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. 매장 채용 서비스 ── */}
      <section className="co-section">
        <div className="co-section-inner co-split">
          <div className="co-split-text">
            <span className="co-label-tag">매장·샵 채용</span>
            <h2 className="co-split-title">현장직 채용,<br />지금 바로 시작하세요</h2>
            <p className="co-split-desc">
              헤어·네일·피부·메이크업 매장의 현장직 채용을<br />
              쉽고 빠르게 시작할 수 있습니다.
            </p>
            <div className="co-tag-wrap">
              {["헤어디자이너","네일아티스트","피부관리사","에스테틱","속눈썹","왁싱","메이크업","매장관리자"].map((t) => (
                <span key={t} className="co-job-tag">{t}</span>
              ))}
            </div>
            <Link href="/company/signup" className="co-btn-primary" style={{marginTop: "24px", display: "inline-flex"}}>
              매장 채용공고 등록하기 <ArrowRight size={15} style={{marginLeft: 6}} />
            </Link>
          </div>
          <div className="co-split-visual store">
            <div className="co-split-emoji">🏪</div>
            <p>매장 맞춤 채용</p>
          </div>
        </div>
      </section>

      {/* ── 5. 기업·브랜드 채용 서비스 ── */}
      <section className="co-section gray">
        <div className="co-section-inner co-split reverse">
          <div className="co-split-visual corp">
            <div className="co-split-emoji">🏢</div>
            <p>기업 맞춤 채용</p>
          </div>
          <div className="co-split-text">
            <span className="co-label-tag purple">기업·브랜드 채용</span>
            <h2 className="co-split-title">본사직·전문직 채용,<br />전문적으로 진행하세요</h2>
            <p className="co-split-desc">
              화장품 브랜드, 프랜차이즈, 병원·클리닉, 교육기관 등<br />
              뷰티 관련 기업의 전문직 채용을 지원합니다.
            </p>
            <div className="co-tag-wrap">
              {["뷰티MD","브랜드마케터","BA","영업관리","교육강사","상품기획","콘텐츠마케터","병원 코디네이터"].map((t) => (
                <span key={t} className="co-job-tag purple">{t}</span>
              ))}
            </div>
            <Link href="/company/signup" className="co-btn-primary purple" style={{marginTop: "24px", display: "inline-flex"}}>
              기업 채용공고 등록하기 <ArrowRight size={15} style={{marginLeft: 6}} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 6. 프리미엄 광고·노출 상품 ── */}
      <section className="co-section">
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
          <div style={{textAlign: "center", marginTop: 32}}>
            <Link href="/company/ads" className="co-btn-outline">
              📋 광고·노출 상품 보기
            </Link>
          </div>
        </div>
      </section>

      {/* ── 7. 이용 절차 ── */}
      <section className="co-section gray">
        <div className="co-section-inner">
          <h2 className="co-section-title">이용 절차</h2>
          <p className="co-section-sub">4단계로 간단하게 시작할 수 있습니다</p>
          <div className="co-steps">
            {STEPS.map((s, i) => (
              <div key={i} className="co-step-item">
                <div className="co-step-num">{s.step}</div>
                <div className="co-step-connector" />
                <h3 className="co-step-title">{s.title}</h3>
                <p className="co-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. 요금 안내 ── */}
      <section className="co-section">
        <div className="co-section-inner">
          <h2 className="co-section-title">요금 안내</h2>
          <p className="co-section-sub">기본 채용공고는 무료, 추가 노출만 선택 결제</p>
          <div className="co-pricing-grid">
            {PRICING.map((p, i) => (
              <div key={i} className={`co-pricing-card ${p.highlight ? "highlight" : ""}`}>
                <p className="co-pricing-label">{p.label}</p>
                <p className="co-pricing-price" style={{ color: p.highlight ? "#7c3aed" : "#111" }}>
                  {p.price}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. FAQ ── */}
      <section className="co-section gray">
        <div className="co-section-inner">
          <h2 className="co-section-title">자주 묻는 질문</h2>
          <div className="co-faq-list">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className={`co-faq-item ${openFaq === i ? "open" : ""}`}
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
