"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, CheckCircle2, ArrowRight } from "lucide-react";

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

const HIRE_TYPES = [
  { id: "corp", icon: "🏢", label: "기업 공고", desc: "마케팅, MD, 영업, 디자인, HR 등 본사 사무직" },
  { id: "store", icon: "🏪", label: "매장 공고", desc: "뷰티어드바이저, 헤어, 네일, 피부관리 등 현장직" },
];

const HIRE_METHODS = [
  { id: "post", icon: "📋", label: "직접 공고를 등록하고 싶어요", desc: "유료/무료 공고 등록" },
  { id: "matching", icon: "🤝", label: "후보자를 추천받고 싶어요", desc: "성과형 매칭" },
  { id: "urgent", icon: "⚡", label: "빠르게 채용하고 싶어요", desc: "긴급 채용 패키지" },
  { id: "senior", icon: "👔", label: "경력직을 찾고 있어요", desc: "전문 매칭 상담" },
  { id: "consult", icon: "💬", label: "상담 후 결정하고 싶어요", desc: "담당자 상담" },
];

const INDUSTRY_TYPES = [
  "화장품 브랜드", "에스테틱 / 피부관리", "헤어샵 / 헤어 브랜드",
  "네일 / 속눈썹", "스파 / 웰니스", "뷰티 리테일",
  "뷰티 교육기관", "뷰티 제조 / 유통", "병원 / 클리닉", "기타",
];

const RECOMMEND_MAP: Record<string, { title: string; reason: string; services: string[] }> = {
  "store-post": { title: "스탠다드 공고 + 무료 매칭", reason: "매장직은 지원자 수와 적합도 모두 중요합니다. 공고 노출과 함께 후보자 추천을 받으면 채용 속도를 높일 수 있습니다.", services: ["스탠다드 채용공고 (30일)", "성과형 인재 매칭", "담당자 밀착 지원"] },
  "store-matching": { title: "성과형 인재 매칭", reason: "초기 비용 없이 적합한 매장직 후보자를 추천받을 수 있습니다. 채용 성사 시에만 수수료가 발생합니다.", services: ["무료 채용 의뢰 등록", "뷰티앤잡 후보자 추천", "면접 연결 지원"] },
  "hq-post": { title: "프리미엄 공고 + 후보자 추천", reason: "본사직은 적합한 경력자를 찾는 것이 핵심입니다. 프리미엄 노출과 함께 후보자 추천을 병행하면 효과적입니다.", services: ["프리미엄 채용공고 (30일)", "메인 페이지 노출", "SNS 홍보 병행", "후보자 추천"] },
  "hq-senior": { title: "헤드헌팅 전문 매칭", reason: "경력직·관리자급 본사 채용은 검증된 후보자를 직접 추천받는 헤드헌팅 방식이 가장 효과적입니다.", services: ["전문 매칭 상담", "검증된 경력자 추천", "연봉 협상 지원"] },
  "default": { title: "스탠다드 공고 + 성과형 매칭", reason: "입력하신 조건에 가장 적합한 조합입니다. 공고 노출로 지원자를 확보하고, 동시에 후보자 추천을 받으면 채용 성공률이 높아집니다.", services: ["스탠다드 채용공고", "성과형 인재 매칭", "담당자 상담 지원"] },
};

export default function CompanySignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [hireType, setHireType] = useState("");
  const [hireMethod, setHireMethod] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [managerName, setManagerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accountPw, setAccountPw] = useState("");
  const [accountPwConfirm, setAccountPwConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const progress = (step / 6) * 100;

  const getRecommend = () => {
    const key = `${hireType}-${hireMethod}`;
    return RECOMMEND_MAP[key] || RECOMMEND_MAP["default"];
  };

  const handleNext = () => {
    if (step < 6) setStep((prev) => (prev + 1) as WizardStep);
  };
  const handleBack = () => {
    if (step > 1) setStep((prev) => (prev - 1) as WizardStep);
  };

  const handleComplete = () => {
    alert("기업회원 가입이 완료되었습니다!\n담당자가 1 영업일 이내에 연락드립니다.");
    router.push("/company");
  };

  return (
    <div className="company-wizard-page">
      {/* 헤더 */}
      <header className="job-detail-header">
        <div className="job-detail-header-inner">
          <button className="job-detail-back" onClick={step === 1 ? () => router.push("/company") : handleBack}>
            <ChevronLeft size={20} />
            <span>{step === 1 ? "기업회원 페이지" : "이전"}</span>
          </button>
          <Link href="/" className="job-detail-logo">
            <Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} />
          </Link>
          <div className="company-wizard-step-indicator">
            {step < 6 && <span>{step} / 5</span>}
          </div>
        </div>
        {/* 진행 바 */}
        <div className="company-wizard-progress">
          <div className="company-wizard-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className="company-wizard-body">
        {/* STEP 1: 채용 유형 선택 */}
        {step === 2 && (
          <div className="company-wizard-step">
            <h2 className="company-wizard-title">어떤 채용을 준비 중이신가요?</h2>
            <p className="company-wizard-desc">선택하신 조건에 맞는 채용 방식을 추천해드립니다.</p>
            <div className="company-wizard-cards">
              {HIRE_TYPES.map((type) => (
                <button
                  key={type.id}
                  className={`company-wizard-card ${hireType === type.id ? "active" : ""}`}
                  onClick={() => setHireType(type.id)}
                >
                  <span className="company-wizard-card-icon">{type.icon}</span>
                  <div className="company-wizard-card-info">
                    <strong>{type.label}</strong>
                    <span>{type.desc}</span>
                  </div>
                  {hireType === type.id && <CheckCircle2 size={18} className="company-wizard-check" />}
                </button>
              ))}
            </div>
            <button className={`cv-btn-primary ${hireType ? "" : "disabled"}`} disabled={!hireType} onClick={handleNext}>
              다음 <ArrowRight size={16} style={{ display: "inline", marginLeft: 4 }} />
            </button>
          </div>
        )}

        {/* STEP 1: 계정 설정 */}
        {step === 1 && (
          <div className="company-wizard-step">
            <h2 className="company-wizard-title">계정을 설정해 주세요</h2>
            <p className="company-wizard-desc">로그인에 사용할 아이디와 비밀번호를 입력해 주세요.</p>
            <label className="cv-field-label cv-required">아이디</label>
            <input className="cv-input" placeholder="영문, 숫자 조합 4~20자" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
            <p style={{fontSize:"13px",color:"#888",marginTop:"6px",padding:"8px 12px",background:"#f9f5ff",borderRadius:"6px"}}>
              💡 계정은 주로 회사의 영문명을 사용해요 (예: oliveyoung, amorepacific)
            </p>
            <p style={{fontSize:"12px",color:"#bbb",marginTop:"8px"}}>
              테스트 계정: oliveyoung / olive1234 · amore / amore1234 · lgbeauty / lg1234
            </p>
            <label className="cv-field-label cv-required" style={{marginTop:"16px"}}>비밀번호</label>
            <div style={{position:"relative"}}>
              <input className="cv-input" type={showPw ? "text" : "password"} placeholder="8자 이상 영문+숫자 조합" value={accountPw} onChange={(e) => setAccountPw(e.target.value)} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:"13px"}}>
                {showPw ? "숨기기" : "보기"}
              </button>
            </div>
            <label className="cv-field-label cv-required" style={{marginTop:"16px"}}>비밀번호 확인</label>
            <input className="cv-input" type="password" placeholder="비밀번호를 다시 입력해 주세요" value={accountPwConfirm} onChange={(e) => setAccountPwConfirm(e.target.value)} />
            {accountPw && accountPwConfirm && accountPw !== accountPwConfirm && (
              <p style={{color:"#e53935",fontSize:"13px",marginTop:"6px"}}>비밀번호가 일치하지 않습니다.</p>
            )}
            <button
              className={`cv-btn-primary ${(accountId.length >= 4 && accountPw.length >= 8 && accountPw === accountPwConfirm) ? "" : "disabled"}`}
              disabled={!(accountId.length >= 4 && accountPw.length >= 8 && accountPw === accountPwConfirm)}
              onClick={handleNext}
              style={{marginTop:"24px"}}
            >
              다음 →
            </button>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"16px",marginTop:"16px"}}>
              <a href="/company/login" style={{fontSize:"13px",color:"#888",textDecoration:"none"}}>아이디 찾기</a>
              <span style={{width:"1px",height:"12px",background:"#ddd",display:"inline-block"}} />
              <a href="/company/login" style={{fontSize:"13px",color:"#888",textDecoration:"none"}}>비밀번호 찾기</a>
            </div>
          </div>
        )}

        {/* STEP 2: 채용 방식 선택 */}
        {step === 3 && (
          <div className="company-wizard-step">
            <h2 className="company-wizard-title">채용 방식은 어떻게 진행하고 싶으신가요?</h2>
            <p className="company-wizard-desc">기업 상황에 맞는 방식을 선택해 주세요.</p>
            <div className="company-wizard-cards">
              {HIRE_METHODS.map((method) => (
                <button
                  key={method.id}
                  className={`company-wizard-card ${hireMethod === method.id ? "active" : ""}`}
                  onClick={() => setHireMethod(method.id)}
                >
                  <span className="company-wizard-card-icon">{method.icon}</span>
                  <div className="company-wizard-card-info">
                    <strong>{method.label}</strong>
                    <span>{method.desc}</span>
                  </div>
                  {hireMethod === method.id && <CheckCircle2 size={18} className="company-wizard-check" />}
                </button>
              ))}
            </div>
            <button className={`cv-btn-primary ${hireMethod ? "" : "disabled"}`} disabled={!hireMethod} onClick={handleNext}>
              다음 <ArrowRight size={16} style={{ display: "inline", marginLeft: 4 }} />
            </button>
          </div>
        )}

        {/* STEP 3: 추천 서비스 확인 */}
        {step === 4 && (
          <div className="company-wizard-step">
            <h2 className="company-wizard-title">입력하신 조건에 맞는 서비스를 추천드립니다</h2>
            <div className="company-wizard-recommend">
              <div className="company-wizard-recommend-title">
                ✨ 추천: <strong>{getRecommend().title}</strong>
              </div>
              <p className="company-wizard-recommend-reason">{getRecommend().reason}</p>
              <div className="company-wizard-recommend-services">
                {getRecommend().services.map((s) => (
                  <div key={s} className="company-wizard-recommend-service">
                    <CheckCircle2 size={15} />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="company-wizard-recommend-actions">
              <button className="cv-btn-primary" onClick={handleNext}>
                이 방식으로 시작하기
              </button>
              <button className="cv-btn-text-add" onClick={() => setStep(2)}>
                다시 선택하기
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: 기업 정보 입력 */}
        {step === 5 && (
          <div className="company-wizard-step">
            <h2 className="company-wizard-title">기업 정보를 입력해 주세요</h2>
            <p className="company-wizard-desc">가입 후 바로 채용을 시작할 수 있습니다.</p>

            <label className="cv-field-label cv-required">회사명</label>
            <input className="cv-input" placeholder="회사명을 입력해 주세요." value={companyName} onChange={(e) => setCompanyName(e.target.value)} />

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
            <input className="cv-input" placeholder="담당자명을 입력해 주세요." value={managerName} onChange={(e) => setManagerName(e.target.value)} />

            <label className="cv-field-label cv-required">연락처</label>
            <input className="cv-input" placeholder="010-0000-0000" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />

            <label className="cv-field-label cv-required">이메일</label>
            <input className="cv-input" placeholder="company@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

            <button
              className={`cv-btn-primary ${(companyName && industry && managerName && phone && email) ? "" : "disabled"}`}
              disabled={!(companyName && industry && managerName && phone && email)}
              onClick={handleNext}
            >
              가입 완료하기
            </button>
          </div>
        )}

        {/* STEP 6: 가입 완료 + 다음 행동 유도 */}
        {step === 6 && (
          <div className="company-wizard-step company-wizard-done">
            <div className="company-wizard-done-icon">🎉</div>
            <h2 className="company-wizard-done-title">
              기업회원 가입이 완료되었습니다!
            </h2>
            <p className="company-wizard-done-desc">
              이제 첫 채용을 시작해보세요.<br />
              담당자가 1 영업일 이내에 연락드립니다.
            </p>

            <div className="company-wizard-done-actions">
              <Link href="/jobs" className="company-wizard-done-btn primary">
                📋 채용공고 등록하기
              </Link>
              <Link href="/company" className="company-wizard-done-btn secondary">
                🤝 무료 매칭 의뢰하기
              </Link>
              <button className="company-wizard-done-btn outline" onClick={handleComplete}>
                💬 상품 상담 신청하기
              </button>
              <button className="company-wizard-done-btn ghost" onClick={handleComplete}>
                기업정보 먼저 등록하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
