"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Settings, ChevronRight, Plus, CheckCircle2, X, Award, Briefcase,
} from "lucide-react";
import { useSignupStore } from "@/lib/store/signupStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { CAREER_LABELS } from "@/lib/constants";
import CareerVerifyModal from "@/components/profile/CareerVerifyModal";
import EducationModal from "@/components/profile/EducationModal";
import SkillModal from "@/components/profile/SkillModal";
import LanguageModal from "@/components/profile/LanguageModal";
import LinkModal from "@/components/profile/LinkModal";
import ExperienceModal from "@/components/profile/ExperienceModal";
import NotificationModal from "@/components/profile/NotificationModal";
import BrandModal from "@/components/profile/BrandModal";

type ModalType =
  | "career" | "education" | "skill" | "language"
  | "link" | "experience" | "notification" | "brand"
  | null;

export default function ProfilePage() {
  const router = useRouter();
  const {
    name, birth, gender, job, jobCustom, careerYears, isLeader,
    categories, categoryCustom, countries, countryCustom, phone,
  } = useSignupStore();
  const {
    isCareerVerified, verifiedDate, careers, educations, experiences,
    skills, languages, links, setCareerVerified,
    removeEducation, removeSkill, removeLanguage, removeLink, removeExperience,
  } = useProfileStore();

  const [activeTab, setActiveTab] = useState<"profile" | "resume">("profile");
  const [bannerClosed, setBannerClosed] = useState(false);
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJobTemp, setSelectedJobTemp] = useState("");

  const jobDisplay = job === "직접입력" ? jobCustom : job || "직군 미설정";
  const allCategories = [...categories.filter((c) => c !== "직접입력"), ...categoryCustom];
  const allCountries = [...countries.filter((c) => c !== "직접입력"), ...countryCustom];
  const birthDisplay = birth
    ? `${birth.slice(0, 4)}년${gender ? ` (${gender === "남성" ? "남" : "여"})` : ""}`
    : "정보 없음";
  const careerDisplay = CAREER_LABELS[careerYears] || "경력 미설정";

  const handleCareerComplete = () => {
    const today = new Date();
    const date = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
    setCareerVerified(true, date);
  };

  return (
    <main className="profile-page">
      {/* 헤더 */}
      <header className="profile-header">
        <div className="profile-header-inner">
          <Link href="/" className="profile-logo">
            <Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} priority />
          </Link>
          <button
            className="profile-settings-btn"
            onClick={() => setOpenModal("notification")}
            aria-label="알림 설정"
          >
            <Settings size={22} />
          </button>
        </div>
      </header>

      {/* 프로필 요약 */}
      <div className="profile-summary">
        <div className="profile-name-row"><h1 className="profile-name">{name || "회원"}</h1></div>
        <button className="profile-job-row" onClick={() => router.push("/")}>
          <span className="profile-job">{jobDisplay}</span>
          <span className="profile-divider">·</span>
          <span className="profile-career">{careerDisplay}</span>
          {isLeader && <span className="profile-leader-badge">팀리더 경험</span>}
          <ChevronRight size={16} className="profile-chevron" />
        </button>
        <div className="profile-tags">
          {allCategories.length > 0
            ? allCategories.map((cat) => <span key={cat} className="profile-tag">{cat}</span>)
            : <span className="profile-tag profile-tag-empty">카테고리 미설정</span>}
          {allCountries.map((country) => <span key={country} className="profile-tag">{country}</span>)}
        </div>
        <div className="profile-stats">
          <div className="profile-stat">
            <div className="profile-stat-value">0</div>
            <div className="profile-stat-label">지원 완료</div>
          </div>
          <div className="profile-stat-divider" />
          <div className="profile-stat">
            <div className="profile-stat-value">0</div>
            <div className="profile-stat-label">관심 공고</div>
          </div>
          <div className="profile-stat-divider" />
          <div className="profile-stat">
            <div className="profile-stat-value">0</div>
            <div className="profile-stat-label">관심 브랜드</div>
          </div>
        </div>
      </div>

      {/* 에이전트 배너 */}
      {!bannerClosed && (
        <div className="profile-agent-banner">
          <button className="profile-banner-close" onClick={() => setBannerClosed(true)} aria-label="닫기">
            <X size={16} />
          </button>
          <div className="profile-banner-text">
            <strong>뷰티앤잡 에이전트 제안받기</strong>
            <span>프로필을 채우면 더 많은 커리어 제안을 받아요.</span>
          </div>
        </div>
      )}

      {/* 탭 */}
      <div className="profile-tabs">
        <button className={`profile-tab ${activeTab === "profile" ? "active" : ""}`} onClick={() => setActiveTab("profile")}>프로필</button>
        <button className={`profile-tab ${activeTab === "resume" ? "active" : ""}`} onClick={() => setActiveTab("resume")}>이력서</button>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="profile-content">
        {activeTab === "profile" ? (
          <>
            {/* 프로모 */}
            <div className="profile-promo">
              <div className="profile-promo-icon"><Award size={20} /></div>
              <div className="profile-promo-text">
                <strong>뷰티 경력직</strong>이라면,<br />맞춤 채용 제안을 받아보세요
              </div>
            </div>

            {/* 기본 정보 */}
            <section className="profile-section">
              <div className="profile-section-head">
                <h2 className="profile-section-title">기본 정보 <CheckCircle2 size={16} className="profile-check" /></h2>
              </div>
              <div className="profile-info-card">
                <InfoRow label="이름" value={name || "정보 없음"} />
                <InfoRow label="인적사항" value={birthDisplay} />
                <InfoRow label="이메일" value="입력하기" isEmpty onClick={() => alert("이메일 입력은 이력서 편집 페이지에서 가능합니다.")} />
                <InfoRow label="카테고리" value={allCategories.length > 0 ? allCategories.join(", ") : "미설정"} />
                <InfoRow label="담당 국가" value={allCountries.length > 0 ? allCountries.join(", ") : "미설정"} isLast />
              </div>
            </section>

            {/* 관심 브랜드 */}
            <section className="profile-section">
              <div className="profile-section-head">
                <h2 className="profile-section-title">관심 브랜드</h2>
              </div>
              <button className="profile-add-card" onClick={() => setOpenModal("brand")}>
                <Plus size={18} /><span>추가하기</span>
              </button>
            </section>

            {/* 경력 */}
            <section className="profile-section">
              <div className="profile-section-head">
                <h2 className="profile-section-title">
                  경력
                  {isCareerVerified && <CheckCircle2 size={16} className="profile-check" />}
                </h2>
                <button className="profile-section-add" onClick={() => setOpenModal("career")}>
                  <Plus size={14} /> 추가
                </button>
              </div>
              <div className="profile-career-card">
                <div className="profile-career-row">
                  <span className="profile-career-label">총 경력</span>
                  <span className="profile-career-value">
                    {careerDisplay}
                    {isLeader && <span className="profile-career-leader-tag">팀리더 경험</span>}
                    {isCareerVerified && <span className="profile-verified-badge">✓ {verifiedDate} 인증</span>}
                  </span>
                </div>
                <div className="profile-career-row">
                  <span className="profile-career-label">리더 경험</span>
                  <label className="profile-career-checkbox">
                    <input type="checkbox" checked={isLeader} readOnly />
                    <span className="checkbox-visual" />
                    <span className="profile-career-checkbox-text">회사에서 팀을 이끈 경험이 있어요.</span>
                  </label>
                </div>
                <button className="profile-career-row profile-career-clickable" onClick={() => { setSelectedJobTemp(jobDisplay || ""); setShowJobModal(true); }}>
                  <span className="profile-career-label">대표 직무</span>
                  <span className="profile-career-value-row">
                    <span className="profile-career-value">{jobDisplay}</span>
                    <ChevronRight size={16} className="profile-chevron" />
                  </span>
                </button>
                <div className="profile-career-warn">⚠️ 세부 직무를 입력해 주세요.</div>
                {careers.map((c) => (
                  <div key={c.id} className="profile-career-entry">
                    <div className="profile-career-entry-head">
                      <strong>{c.company}</strong>
                      {c.isVerified && <span className="profile-verified-badge">✓ 인증</span>}
                    </div>
                    <span className="profile-career-entry-period">{c.startDate} - {c.endDate}</span>
                  </div>
                ))}
                <button className="profile-career-bring-btn" onClick={() => setOpenModal("career")}>
                  경력 한번에 불러오기
                </button>
              </div>
            </section>

            {/* 관련 경험 */}
            <section className="profile-section">
              <div className="profile-section-head">
                <h2 className="profile-section-title">관련 경험 및 기타 <CheckCircle2 size={16} className="profile-check profile-check-soft" /></h2>
              </div>
              {experiences.map((exp) => (
                <div key={exp.id} className="profile-list-item">
                  <div className="profile-list-info">
                    <span className="profile-list-category">{exp.category}</span>
                    <span className="profile-list-title">{exp.title}</span>
                  </div>
                  <button className="profile-list-remove" onClick={() => removeExperience(exp.id)}>×</button>
                </div>
              ))}
              <button className="profile-add-card" onClick={() => setOpenModal("experience")}>
                <Plus size={18} /><span>추가하기</span>
              </button>
            </section>

            {/* 학력 */}
            <section className="profile-section">
              <div className="profile-section-head">
                <h2 className="profile-section-title">학력 <CheckCircle2 size={16} className="profile-check profile-check-soft" /></h2>
              </div>
              {educations.map((edu) => (
                <div key={edu.id} className="profile-list-item">
                  <div className="profile-list-info">
                    <span className="profile-list-title">{edu.school}</span>
                    <span className="profile-list-sub">{edu.major} · {edu.status}</span>
                  </div>
                  <button className="profile-list-remove" onClick={() => removeEducation(edu.id)}>×</button>
                </div>
              ))}
              <button className="profile-add-card" onClick={() => setOpenModal("education")}>
                <Plus size={18} /><span>추가하기</span>
              </button>
            </section>

            {/* 스킬 */}
            <section className="profile-section">
              <div className="profile-section-head">
                <h2 className="profile-section-title">스킬</h2>
              </div>
              {skills.length > 0 && (
                <div className="profile-skill-chips">
                  {skills.map((sk) => (
                    <span key={sk} className="profile-skill-chip">
                      {sk}
                      <button onClick={() => removeSkill(sk)}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <button className="profile-add-card" onClick={() => setOpenModal("skill")}>
                <Plus size={18} /><span>추가하기</span>
              </button>
            </section>

            {/* 어학 */}
            <section className="profile-section">
              <div className="profile-section-head">
                <h2 className="profile-section-title">어학</h2>
              </div>
              {languages.map((lang) => (
                <div key={lang.id} className="profile-list-item">
                  <div className="profile-list-info">
                    <span className="profile-list-title">{lang.language}</span>
                    <span className="profile-list-sub">{lang.level}</span>
                  </div>
                  <button className="profile-list-remove" onClick={() => removeLanguage(lang.id)}>×</button>
                </div>
              ))}
              <button className="profile-add-card" onClick={() => setOpenModal("language")}>
                <Plus size={18} /><span>추가하기</span>
              </button>
            </section>

            {/* 링크 */}
            <section className="profile-section">
              <div className="profile-section-head">
                <h2 className="profile-section-title">링크</h2>
              </div>
              {links.map((link) => (
                <div key={link.id} className="profile-list-item">
                  <div className="profile-list-info">
                    <span className="profile-list-category">{link.category}</span>
                    <span className="profile-list-url">{link.url}</span>
                  </div>
                  <button className="profile-list-remove" onClick={() => removeLink(link.id)}>×</button>
                </div>
              ))}
              <button className="profile-add-card" onClick={() => setOpenModal("link")}>
                <Plus size={18} /><span>추가하기</span>
              </button>
            </section>
          </>
        ) : (
          <div className="profile-resume-empty">
            <div className="profile-resume-empty-icon"><Briefcase size={48} /></div>
            <h3 className="profile-resume-empty-title">아직 작성된 이력서가 없어요</h3>
            <p className="profile-resume-empty-desc">프로필을 기반으로 이력서를 만들어보세요.<br />뷰티 채용 담당자에게 어필할 수 있어요.</p>
            <button className="profile-resume-create-btn" onClick={() => router.push("/profile/resume")}>
              이력서 만들기
            </button>
          </div>
        )}
      </div>

      {/* 하단 CTA */}
      <div className="profile-bottom-cta">
        <button className="profile-resume-btn" onClick={() => router.push("/profile/resume")}>
          현재 프로필로 이력서 만들기
        </button>
      </div>

      {/* 모달들 */}
      <CareerVerifyModal isOpen={openModal === "career"} onClose={() => setOpenModal(null)} onComplete={handleCareerComplete} userName={name} userBirth={birth} userGender={gender} userPhone={phone} />
      <EducationModal isOpen={openModal === "education"} onClose={() => setOpenModal(null)} />
      <SkillModal isOpen={openModal === "skill"} onClose={() => setOpenModal(null)} />
      <LanguageModal isOpen={openModal === "language"} onClose={() => setOpenModal(null)} />
      <LinkModal isOpen={openModal === "link"} onClose={() => setOpenModal(null)} />
      <ExperienceModal isOpen={openModal === "experience"} onClose={() => setOpenModal(null)} />
      <NotificationModal isOpen={openModal === "notification"} onClose={() => setOpenModal(null)} />
      <BrandModal isOpen={openModal === "brand"} onClose={() => setOpenModal(null)} />
    </main>
  );
}

function InfoRow({ label, value, isEmpty, isLast, onClick }: {
  label: string; value: string; isEmpty?: boolean; isLast?: boolean; onClick?: () => void;
}) {
  return (
    <button className={`profile-info-row ${isLast ? "is-last" : ""}`} onClick={onClick} disabled={!onClick}>
      <span className="profile-info-label">{label}</span>
      <span className={`profile-info-value ${isEmpty ? "is-empty" : ""}`}>{value}</span>
      <ChevronRight size={16} className="profile-info-chevron" />
    </button>
  );
}
