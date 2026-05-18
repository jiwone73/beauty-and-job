"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, CheckCircle2, ArrowRight } from "lucide-react";

type WizardStep = 1 | 2 | 3 | 4 | 5;

const MEMBER_TYPES = [
  {
    id: "store",
    icon: "🏪",
    label: "매장회원",
    desc: "뷰티어드바이저, 헤어, 네일, 피부관리 등 현장 매장 채용",
    tag: "무료 공고 등록",
  },
  {
    id: "corp",
    icon: "🏢",
    label: "기업회원",
    desc: "마케팅, MD, HR, 영업, 디자인 등 본사 사무직 채용",
    tag: "프리미엄 서비스",
  },
];

const INDUSTRY_TYPES = [
  "화장품 브랜드", "에스테틱 / 피부관리", "헤어샵 / 헤어 브랜드",
  "네일 / 속눈썹", "스파 / 웰니스", "뷰티 리테일",
  "뷰티 교육기관", "뷰티 제조 / 유통", "병원 / 클리닉", "기타",
];

const SERVICES_STORE = [
  { id: "free-post", icon: "📋", label: "무료 채용공고 등록", desc: "즉시 등록 · 지원자 모집 시작", href: "/company/dashboard/jobs", primary: true },
  { id: "matching", icon: "🤝", label: "성과형 인재 매칭", desc: "채용 성사 시에만 수수료 발생", href: "/company/dashboard", primary: false },
];

const SERVICES_CORP = [
  { id: "free-post", icon: "📋", label: "무료 채용공고 등록", desc: "즉시 시작 · 30일 무료 노출", href: "/company/dashboard/jobs", primary: true },
  { id: "premium", icon: "⭐", label: "프리미엄 공고", desc: "메인 노출 + SNS 홍보 병행", href: "/company/dashboard/jobs", primary: false },
  { id: "headhunting", icon: "🎯", label: "헤드헌팅 매칭", desc: "경력직 · 관리자급 전문 추천", href: "/company/dashboard", primary: false },
];

export default function CompanySignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1
  const [memberType, setMemberType] = useState("");

  // Step 2
  const [authMethod, setAuthMethod] = useState("");
  const [phone, setPhone] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [authSent, setAuthSent] = useState(false);
  const [authVerified, setAuthVerified] = useState(false);

  // Step 3
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [managerName, setManagerName] = useState("");
  const [email, setEmail] = useState("");

  const TOTAL_STEPS = 5;
  const progress = (step / TOTAL_STEPS) * 100;

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep((prev) => (prev + 1) as WizardStep);
  };
  const handleBack = () => {
    if (step > 1) setStep((prev) => (prev - 1) as WizardStep);
  };

  const services = memberType === "corp" ? SERVICES_CORP : SERVICES_STORE;

  return (
    <div className="company-wizard-page">
      {/* 헤더 */}
      <header className="job-detail-header">
        <div className="job-detail-header-inner">
          <button
            className="job-detail-back"
            onClick={step === 1 ? () => router.push("/company") : handleBack}
          >
            <ChevronLeft size={20} />
            <span>{step === 1 ? "기업서비스" : "이전"}</span>
          </button>
          <Link href="/" className="job-detail-logo">
            <Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} />
          </Link>
          <div className="company-wizard-step-indicator">
            {step < TOTAL_STEPS && <span>{step} / {TOTAL_STEPS - 1}</span>}
          </div>
        </div>
        <div className="company-wizard-progress">
          <div className="company-wizard-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className="company-wizard-body">

        {/* ── STEP 1: 회원 유형 선택 ── */}
        {step === 1 && (
          <div className="company-wizard-step">
            <h2 className="company-wizard-title">어떤 채용을 준비 중이신가요?</h2>
            <p className="company-wizard-desc">회원 유형을 선택하시면 맞춤 서비스를 안내해드립니다.</p>
            <div className="company-wizard-cards">
              {MEMBER_TYPES.map((type) => (
                <button
                  key={type.id}
                  className={`company-wizard-card ${memberType === type.id ? "active" : ""}`}
                  onClick={() => setMemberType(type.id)}
                >
                  <span className="company-wizard-card-icon">{type.icon}</span>
                  <div className="company-wizard-card-info">
                    <strong>{type.label}</strong>
                    <span>{type.desc}</span>
                    <em className="company-wizard-card-tag">{type.tag}</em>
                  </div>
                  {memberType === type.id && <CheckCircle2 size={18} className="company-wizard-check" />}
                </button>
              ))}
            </div>
            <button
              className={`cv-btn-primary ${memberType ? "" : "disabled"}`}
              disabled={!memberType}
              onClick={handleNext}
            >
              다음 <ArrowRight size={16} style={{ display: "inline", marginLeft: 4 }} />
            </button>
          </div>
        )}

        {/* ── STEP 2: 계정 설정 (카카오 / 휴대전화) ── */}
        {step === 2 && (
          <div className="company-wizard-step">
            <h2 className="company-wizard-title">계정을 만들어 주세요</h2>
            <p className="company-wizard-desc">카카오 또는 휴대전화로 빠르게 시작하세요.</p>

            {/* 카카오 */}
            <button
              className={`company-wizard-kakao-btn ${authMethod === "kakao" ? "active" : ""}`}
              onClick={() => { setAuthMethod("kakao"); setAuthVerified(true); }}
            >
              <span style={{ fontSize: 20 }}>💬</span>
              카카오로 시작하기
            </button>

            <div className="company-wizard-divider"><span>또는</span></div>

            {/* 휴대전화 인증 */}
            <div
              className={`company-wizard-phone-box ${authMethod === "phone" ? "active" : ""}`}
              onClick={() => !authMethod && setAuthMethod("phone")}
            >
              <label className="cv-field-label cv-required">휴대전화 번호</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="cv-input"
                  placeholder="010-0000-0000"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  className="cv-btn-outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAuthSent(true);
                    setAuthMethod("phone");
                  }}
                  disabled={phone.length < 10}
                  style={{ whiteSpace: "nowrap" }}
                >
                  인증번호 받기
                </button>
              </div>

              {authSent && (
                <>
                  <label className="cv-field-label" style={{ marginTop: 12 }}>인증번호</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="cv-input"
                      placeholder="인증번호 6자리"
                      value={authCode}
                      onChange={(e) => setAuthCode(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="cv-btn-outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (authCode === "123456") setAuthVerified(true);
                      }}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      확인
                    </button>
                  </div>
                  {authVerified && (
                    <p style={{ color: "#7c3aed", fontSize: 13, marginTop: 6 }}>✅ 인증이 완료되었습니다.</p>
                  )}
                  <p style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>테스트 인증번호: 123456</p>
                </>
              )}
            </div>

            <button
              className={`cv-btn-primary ${authVerified ? "" : "disabled"}`}
              disabled={!authVerified}
              onClick={handleNext}
              style={{ marginTop: 24 }}
            >
              다음 <ArrowRight size={16} style={{ display: "inline", marginLeft: 4 }} />
            </button>
          </div>
        )}

        {/* ── STEP 3: 기업 / 매장 정보 입력 ── */}
        {step === 3 && (
          <div className="company-wizard-step">
            <h2 className="company-wizard-title">
              {memberType === "store" ? "매장 정보를 입력해 주세요" : "기업 정보를 입력해 주세요"}
            </h2>
            <p className="company-wizard-desc">가입 후 바로 채용을 시작할 수 있습니다.</p>

            <label className="cv-field-label cv-required">
              {memberType === "store" ? "매장명" : "회사명"}
            </label>
            <input
              className="cv-input"
              placeholder={memberType === "store" ? "매장명을 입력해 주세요." : "회사명을 입력해 주세요."}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />

            <label className="cv-field-label cv-required">업종</label>
            <div className="company-wizard-industry-grid">
              {INDUSTRY_TYPES.map((ind) => (
                <button
                  key={ind}
                  className={`company-wizard-industry-btn ${industry === ind ? "active" : ""}`}
                  onClick={() => setIndustry(ind)}
                >
                  {ind}
                </button>
              ))}
            </div>

            <label className="cv-field-label cv-required">담당자명</label>
            <input
              className="cv-input"
              placeholder="담당자명을 입력해 주세요."
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
            />

            <label className="cv-field-label">이메일 (선택)</label>
            <input
              className="cv-input"
              placeholder="company@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              className={`cv-btn-primary ${(companyName && industry && managerName) ? "" : "disabled"}`}
              disabled={!(companyName && industry && managerName)}
              onClick={handleNext}
            >
              가입 완료하기
            </button>
          </div>
        )}

        {/* ── STEP 4: 가입 완료 + 서비스 선택 ── */}
        {step === 4 && (
          <div className="company-wizard-step company-wizard-done">
            <div className="company-wizard-done-icon">🎉</div>
            <h2 className="company-wizard-done-title">
              {memberType === "store" ? "매장회원" : "기업회원"} 가입이 완료되었습니다!
            </h2>
            <p className="company-wizard-done-desc">
              이제 첫 채용을 시작해보세요.<br />
              담당자가 1 영업일 이내에 연락드립니다.
            </p>

            <div className="company-wizard-service-list">
              <p className="company-wizard-service-list-title">원하시는 서비스를 선택해 주세요</p>
              {services.map((s) => (
                <Link
                  key={s.id}
                  href={s.href}
                  className={`company-wizard-service-item ${s.primary ? "primary" : ""}`}
                >
                  <span className="company-wizard-service-icon">{s.icon}</span>
                  <div className="company-wizard-service-info">
                    <strong>{s.label}</strong>
                    <span>{s.desc}</span>
                  </div>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>

            <button
              className="cv-btn-text-add"
              onClick={() => router.push("/company/dashboard")}
              style={{ marginTop: 16 }}
            >
              나중에 할게요 →
            </button>
          </div>
        )}

        {/* ── STEP 5: 공고 등록 유도 ── */}
        {step === 5 && (
          <div className="company-wizard-step company-wizard-done">
            <div className="company-wizard-done-icon">📋</div>
            <h2 className="company-wizard-done-title">무료 채용공고를 등록해 보세요</h2>
            <p className="company-wizard-done-desc">
              지금 바로 무료로 채용공고를 등록하고<br />
              뷰티 인재를 만나보세요.
            </p>
            <div className="company-wizard-done-actions">
              <Link href="/company/dashboard/jobs" className="company-wizard-done-btn primary">
                📋 지금 바로 공고 등록하기
              </Link>
              <Link href="/company/dashboard" className="company-wizard-done-btn secondary">
                🏠 대시보드 바로가기
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
