"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Settings, ChevronRight, Plus, CheckCircle2, X, Award, Briefcase } from "lucide-react";
import { useSignupStore } from "@/lib/store/signupStore";
import { CAREER_LABELS } from "@/lib/constants";

export default function ProfilePage() {
  const router = useRouter();
  const { name, birth, gender, job, jobCustom, careerYears, isLeader, categories, categoryCustom, countries, countryCustom } = useSignupStore();
  const [activeTab, setActiveTab] = useState<"profile" | "resume">("profile");
  const [bannerClosed, setBannerClosed] = useState(false);

  const jobDisplay = job === "직접입력" ? jobCustom : job || "직군 미설정";
  const allCategories = [...categories.filter((c) => c !== "직접입력"), ...categoryCustom];
  const allCountries = [...countries.filter((c) => c !== "직접입력"), ...countryCustom];
  const birthDisplay = birth ? `${birth.slice(0, 4)}년${gender ? ` (${gender === "남성" ? "남" : "여"})` : ""}` : "정보 없음";
  const careerDisplay = `${CAREER_LABELS[careerYears] || "경력 미설정"}`;

  const handleAddSection = (section: string) => { alert(`${section} 추가 기능은 다음 업데이트에서 구현됩니다.`); };
  const handleStartCareerVerify = () => { alert("경력 인증 모달은 다음 업데이트에서 구현됩니다."); };

  return (
    <main className="profile-page">
      <header className="profile-header"><div className="profile-header-inner">
        <Link href="/" className="profile-logo"><Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} priority /></Link>
        <button className="profile-settings-btn" onClick={() => alert("알림 설정은 다음 업데이트에서 구현됩니다.")} aria-label="설정"><Settings size={22} /></button>
      </div></header>

      <div className="profile-summary">
        <div className="profile-name-row"><h1 className="profile-name">{name || "회원"}</h1></div>
        <button className="profile-job-row" onClick={() => router.push("/")}>
          <span className="profile-job">{jobDisplay}</span><span className="profile-divider">·</span>
          <span className="profile-career">{careerDisplay}</span>
          {isLeader && <span className="profile-leader-badge">팀리더 경험</span>}
          <ChevronRight size={16} className="profile-chevron" />
        </button>
        <div className="profile-tags">
          {allCategories.length > 0 ? allCategories.map((cat) => (<span key={cat} className="profile-tag">{cat}</span>)) : (<span className="profile-tag profile-tag-empty">카테고리 미설정</span>)}
          {allCountries.map((country) => (<span key={country} className="profile-tag">{country}</span>))}
        </div>
        <div className="profile-stats">
          <div className="profile-stat"><div className="profile-stat-value">0</div><div className="profile-stat-label">지원 완료</div></div>
          <div className="profile-stat-divider" />
          <div className="profile-stat"><div className="profile-stat-value">0</div><div className="profile-stat-label">관심 공고</div></div>
          <div className="profile-stat-divider" />
          <div className="profile-stat"><div className="profile-stat-value">0</div><div className="profile-stat-label">관심 브랜드</div></div>
        </div>
      </div>

      {!bannerClosed && (<div className="profile-agent-banner">
        <button className="profile-banner-close" onClick={() => setBannerClosed(true)} aria-label="닫기"><X size={16} /></button>
        <div className="profile-banner-text"><strong>뷰티앤잡 에이전트 제안받기</strong><span>프로필을 채우면 더 많은 커리어 제안을 받아요.</span></div>
      </div>)}

      <div className="profile-tabs">
        <button className={`profile-tab ${activeTab === "profile" ? "active" : ""}`} onClick={() => setActiveTab("profile")}>프로필</button>
        <button className={`profile-tab ${activeTab === "resume" ? "active" : ""}`} onClick={() => setActiveTab("resume")}>이력서</button>
      </div>

      <div className="profile-content">
        {activeTab === "profile" ? (
          <>
            <div className="profile-promo"><div className="profile-promo-icon"><Award size={20} /></div>
              <div className="profile-promo-text"><strong>뷰티 경력직</strong>이라면,<br />맞춤 채용 제안을 받아보세요</div></div>

            <section className="profile-section"><div className="profile-section-head">
              <h2 className="profile-section-title">기본 정보 <CheckCircle2 size={16} className="profile-check" /></h2></div>
              <div className="profile-info-card">
                <InfoRow label="이름" value={name || "정보 없음"} />
                <InfoRow label="인적사항" value={birthDisplay} />
                <InfoRow label="이메일" value="입력하기" isEmpty onClick={() => handleAddSection("이메일")} />
                <InfoRow label="카테고리" value={allCategories.length > 0 ? allCategories.join(", ") : "미설정"} />
                <InfoRow label="담당 국가" value={allCountries.length > 0 ? allCountries.join(", ") : "미설정"} isLast />
              </div>
            </section>

            <section className="profile-section"><div className="profile-section-head">
              <h2 className="profile-section-title">관심 브랜드</h2></div>
              <button className="profile-add-card" onClick={() => handleAddSection("관심 브랜드")}><Plus size={18} /><span>추가하기</span></button>
            </section>

            <section className="profile-section"><div className="profile-section-head">
              <h2 className="profile-section-title">경력 <CheckCircle2 size={16} className="profile-check" /></h2>
              <button className="profile-section-add" onClick={handleStartCareerVerify}><Plus size={14} /> 추가</button></div>
              <div className="profile-career-card">
                <div className="profile-career-row"><span className="profile-career-label">총 경력</span>
                  <span className="profile-career-value">{careerDisplay}{isLeader && <span className="profile-career-leader-tag">팀리더 경험</span>}</span></div>
                <div className="profile-career-row"><span className="profile-career-label">리더 경험</span>
                  <label className="profile-career-checkbox"><input type="checkbox" checked={isLeader} readOnly /><span className="checkbox-visual" />
                    <span className="profile-career-checkbox-text">회사에서 팀을 이끈 경험이 있어요.</span></label></div>
                <button className="profile-career-row profile-career-clickable" onClick={() => handleAddSection("대표 직무")}>
                  <span className="profile-career-label">대표 직무</span>
                  <span className="profile-career-value-row"><span className="profile-career-value">{jobDisplay}</span><ChevronRight size={16} className="profile-chevron" /></span></button>
                <div className="profile-career-warn">⚠️ 세부 직무를 입력해 주세요.</div>
                <button className="profile-career-bring-btn" onClick={handleStartCareerVerify}>경력 한번에 불러오기</button>
              </div>
            </section>

            {["관련 경험 및 기타", "학력", "스킬", "어학", "링크"].map((sec) => (
              <section key={sec} className="profile-section"><div className="profile-section-head">
                <h2 className="profile-section-title">{sec}{(sec === "관련 경험 및 기타" || sec === "학력") && <CheckCircle2 size={16} className="profile-check profile-check-soft" />}</h2></div>
                <button className="profile-add-card" onClick={() => handleAddSection(sec)}><Plus size={18} /><span>추가하기</span></button>
              </section>
            ))}
          </>
        ) : (
          <div className="profile-resume-empty">
            <div className="profile-resume-empty-icon"><Briefcase size={48} /></div>
            <h3 className="profile-resume-empty-title">아직 작성된 이력서가 없어요</h3>
            <p className="profile-resume-empty-desc">프로필을 기반으로 이력서를 만들어보세요.<br />뷰티 채용 담당자에게 어필할 수 있어요.</p>
            <button className="profile-resume-create-btn" onClick={() => handleAddSection("이력서")}>이력서 만들기</button>
          </div>
        )}
      </div>

      <div className="profile-bottom-cta"><button className="profile-resume-btn" onClick={() => handleAddSection("이력서")}>현재 프로필로 이력서 만들기</button></div>
    </main>
  );
}

function InfoRow({ label, value, isEmpty, isLast, onClick }: { label: string; value: string; isEmpty?: boolean; isLast?: boolean; onClick?: () => void }) {
  return (
    <button className={`profile-info-row ${isLast ? "is-last" : ""}`} onClick={onClick} disabled={!onClick}>
      <span className="profile-info-label">{label}</span>
      <span className={`profile-info-value ${isEmpty ? "is-empty" : ""}`}>{value}</span>
      <ChevronRight size={16} className="profile-info-chevron" />
    </button>
  );
}
