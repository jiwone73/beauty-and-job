"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, CheckCircle2, ArrowRight } from "lucide-react";

type WizardStep = 1 | 2 | 3 | 4 | 5;

const MEMBER_TYPES = [
  { id: "store", icon: "🏪", label: "매장회원", desc: "뷰티어드바이저, 헤어, 네일, 피부관리 등 현장 매장 채용", tag: "무료 공고 등록" },
  { id: "corp",  icon: "🏢", label: "기업회원", desc: "마케팅, MD, HR, 영업, 디자인 등 본사 사무직 채용",    tag: "프리미엄 서비스" },
];

const INDUSTRY_TYPES = [
  "화장품 브랜드","에스테틱 / 피부관리","헤어샵 / 헤어 브랜드",
  "네일 / 속눈썹","스파 / 웰니스","뷰티 리테일",
  "뷰티 교육기관","뷰티 제조 / 유통","병원 / 클리닉","기타",
];

const SERVICES_STORE = [
  { id: "free-post", icon: "📋", label: "무료 채용공고 등록", desc: "즉시 등록 · 지원자 모집 시작",   href: "/company/dashboard/jobs", primary: true  },
  { id: "matching",  icon: "🤝", label: "성과형 인재 매칭",   desc: "채용 성사 시에만 수수료 발생",  href: "/company/dashboard",      primary: false },
];

const SERVICES_CORP = [
  { id: "free-post",   icon: "📋", label: "무료 채용공고 등록", desc: "즉시 시작 · 30일 무료 노출",     href: "/company/dashboard/jobs", primary: true  },
  { id: "premium",     icon: "⭐", label: "프리미엄 공고",      desc: "메인 노출 + SNS 홍보 병행",      href: "/company/dashboard/jobs", primary: false },
  { id: "headhunting", icon: "🎯", label: "헤드헌팅 매칭",      desc: "경력직 · 관리자급 전문 추천",    href: "/company/dashboard",      primary: false },
];

function CompanySignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step,       setStep]       = useState<WizardStep>(1);
  const [memberType, setMemberType] = useState("");

  // Step 2: 계정 설정
  const [accountId,        setAccountId]        = useState("");
  const [accountPw,        setAccountPw]        = useState("");
  const [accountPwConfirm, setAccountPwConfirm] = useState("");
  const [showPw,           setShowPw]           = useState(false);

  // Step 3: 기업 정보
  const [companyName,  setCompanyName]  = useState("");
  const [industry,     setIndustry]     = useState("");
  const [managerName,  setManagerName]  = useState("");
  const [email,        setEmail]        = useState("");

  useEffect(() => {
    const type = searchParams.get("type");
    if (type === "store" || type === "corp") {
      setMemberType(type);
      setStep(2);
    }
  }, [searchParams]);

  const TOTAL = 5;
  const progress = (step / TOTAL) * 100;
  const handleNext = () => { if (step < TOTAL) setStep((p) => (p + 1) as WizardStep); };
  const handleBack = () => { if (step > 1)    setStep((p) => (p - 1) as WizardStep); };
  const services = memberType === "corp" ? SERVICES_CORP : SERVICES_STORE;

  const pwValid = accountId.length >= 4 && accountPw.length >= 8 && accountPw === accountPwConfirm;

  return (
    <div className="company-wizard-page">
      <header className="job-detail-header">
        <div className="job-detail-header-inner">
          <button type="button" className="job-detail-back"
            onClick={step === 1 ? () => router.push("/company") : handleBack}>
            <ChevronLeft size={20} />
            <span>{step === 1 ? "기업서비스" : "이전"}</span>
          </button>
          <Link href="/" className="job-detail-logo">
            <Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} />
          </Link>
          <div className="company-wizard-step-indicator">
            {step < TOTAL && <span>{step} / {TOTAL - 1}</span>}
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
              {MEMBER_TYPES.map((t) => (
                <button key={t.id} type="button"
                  className={`company-wizard-card ${memberType === t.id ? "active" : ""}`}
                  onClick={() => setMemberType(t.id)}>
                  <span className="company-wizard-card-icon">{t.icon}</span>
                  <div className="company-wizard-card-info">
                    <strong>{t.label}</strong>
                    <span>{t.desc}</span>
                    <em className="company-wizard-card-tag">{t.tag}</em>
                  </div>
                  {memberType === t.id && <CheckCircle2 size={18} className="company-wizard-check" />}
                </button>
              ))}
            </div>
            <button type="button"
              className={`cv-btn-primary ${memberType ? "" : "disabled"}`}
              disabled={!memberType} onClick={handleNext}>
              다음 <ArrowRight size={16} style={{ display: "inline", marginLeft: 4 }} />
            </button>
          </div>
        )}

        {/* ── STEP 2: 계정 설정 (ID / PW) ── */}
        {step === 2 && (
          <div className="company-wizard-step">
            <h2 className="company-wizard-title">계정을 설정해 주세요</h2>
            <p className="company-wizard-desc">로그인에 사용할 아이디와 비밀번호를 입력해 주세요.</p>

            <label className="cv-field-label cv-required">아이디</label>
            <input className="cv-input" placeholder="영문, 숫자 조합 4~20자"
              value={accountId} onChange={(e) => setAccountId(e.target.value)} />
            <p style={{ fontSize: 13, color: "#888", marginTop: 6, padding: "8px 12px", background: "#f9f5ff", borderRadius: 6 }}>
              💡 회사 또는 매장 영문명을 추천해요 (예: oliveyoung, hairshop01)
            </p>

            <label className="cv-field-label cv-required" style={{ marginTop: 16 }}>비밀번호</label>
            <div style={{ position: "relative" }}>
              <input className="cv-input"
                type={showPw ? "text" : "password"}
                placeholder="8자 이상 영문 + 숫자 조합"
                value={accountPw} onChange={(e) => setAccountPw(e.target.value)} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 13 }}>
                {showPw ? "숨기기" : "보기"}
              </button>
            </div>

            <label className="cv-field-label cv-required" style={{ marginTop: 16 }}>비밀번호 확인</label>
            <input className="cv-input" type="password"
              placeholder="비밀번호를 다시 입력해 주세요"
              value={accountPwConfirm} onChange={(e) => setAccountPwConfirm(e.target.value)} />
            {accountPw && accountPwConfirm && accountPw !== accountPwConfirm && (
              <p style={{ color: "#e53935", fontSize: 13, marginTop: 6 }}>비밀번호가 일치하지 않습니다.</p>
            )}
            {pwValid && (
              <p style={{ color: "#7c3aed", fontSize: 13, marginTop: 6 }}>✅ 사용 가능한 계정입니다.</p>
            )}

            <button type="button"
              className={`cv-btn-primary ${pwValid ? "" : "disabled"}`}
              disabled={!pwValid} onClick={handleNext} style={{ marginTop: 24 }}>
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

            <label className="cv-field-label cv-required">{memberType === "store" ? "매장명" : "회사명"}</label>
            <input className="cv-input"
              placeholder={memberType === "store" ? "매장명을 입력해 주세요." : "회사명을 입력해 주세요."}
              value={companyName} onChange={(e) => setCompanyName(e.target.value)} />

            <label className="cv-field-label cv-required">업종</label>
            <div className="company-wizard-industry-grid">
              {INDUSTRY_TYPES.map((ind) => (
                <button key={ind} type="button"
                  className={`company-wizard-industry-btn ${industry === ind ? "active" : ""}`}
                  onClick={() => setIndustry(ind)}>{ind}</button>
              ))}
            </div>

            <label className="cv-field-label cv-required">담당자명</label>
            <input className="cv-input" placeholder="담당자명을 입력해 주세요."
              value={managerName} onChange={(e) => setManagerName(e.target.value)} />

            <label className="cv-field-label">이메일 (선택)</label>
            <input className="cv-input" placeholder="company@example.com" type="email"
              value={email} onChange={(e) => setEmail(e.target.value)} />

            <button type="button"
              className={`cv-btn-primary ${(companyName && industry && managerName) ? "" : "disabled"}`}
              disabled={!(companyName && industry && managerName)} onClick={handleNext}>
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
                <Link key={s.id} href={s.href}
                  className={`company-wizard-service-item ${s.primary ? "primary" : ""}`}>
                  <span className="company-wizard-service-icon">{s.icon}</span>
                  <div className="company-wizard-service-info">
                    <strong>{s.label}</strong>
                    <span>{s.desc}</span>
                  </div>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
            <button type="button" className="cv-btn-text-add"
              onClick={() => router.push("/company/dashboard")} style={{ marginTop: 16 }}>
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
              지금 바로 무료로 채용공고를 등록하고<br />뷰티 인재를 만나보세요.
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

export default function CompanySignupPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#888" }}>
        로딩 중...
      </div>
    }>
      <CompanySignupInner />
    </Suspense>
  );
}
