"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Settings, ChevronRight, Plus, CheckCircle2, X, Award, Briefcase,
} from "lucide-react";
import { useSignupStore } from "@/lib/store/signupStore";
import { useApplicationStore } from "@/lib/store/applicationStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { CAREER_LABELS } from "@/lib/constants";
import CareerVerifyModal from "@/components/profile/CareerVerifyModal";
import CareerEditModal from "@/components/profile/CareerEditModal";
import EducationModal from "@/components/profile/EducationModal";
import SkillModal from "@/components/profile/SkillModal";
import LanguageModal from "@/components/profile/LanguageModal";
import LinkModal from "@/components/profile/LinkModal";
import ExperienceModal from "@/components/profile/ExperienceModal";
import NotificationModal from "@/components/profile/NotificationModal";
import ResumeTab from "@/components/profile/ResumeTab";

type ModalType =
  | "career" | "careerEdit" | "education" | "skill" | "language"
  | "link" | "experience" | "notification" | "brand"
  | null;

const PRESET_SKILL_AREAS = ["헤어","네일","피부관리","메이크업","속눈썹","왁싱","스파·에스테틱","반영구"];
const PRESET_OFFICE_JOB_AREAS = [
  "브랜드 마케팅",
  "디지털·퍼포먼스 마케팅",
  "콘텐츠·PR·SNS",
  "MD·상품기획",
  "영업·채널영업",
  "글로벌 사업",
  "R&D·연구개발",
  "디자인·VMD",
  "생산·품질",
  "구매·SCM·물류",
  "경영지원",
  "데이터·IT",
];

export default function ProfilePage() {
  const router = useRouter();
  const {
    name: signupName, birth, gender, job, jobCustom, careerYears,
    categories, categoryCustom, countries, countryCustom, phone,
    skillAreas, certificates, workTypePrefer, regionPrefer, officeJobAreas, setStoreProfile,
  } = useSignupStore();
  const { userName, userPhone } = useAuthStore();
  const name = userName || signupName || "";
  const {
    isCareerVerified, verifiedDate, careers, educations, experiences,
    skills, languages, links, setCareerVerified,
    removeEducation, removeSkill, removeLanguage, removeLink, removeExperience,
  } = useProfileStore();

  const [activeTab, setActiveTab] = useState<"profile" | "resume" | "applied" | "bookmarks">("profile");
  const [bannerClosed, setBannerClosed] = useState(false);
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJobTemp, setSelectedJobTemp] = useState("");
  const [dbJobType, setDbJobType] = useState<"OFFICE" | "STORE" | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [customAreaInput, setCustomAreaInput] = useState("");
  const [customOfficeAreaInput, setCustomOfficeAreaInput] = useState("");
  const [appliedCount, setAppliedCount] = useState(0);
  const [bookmarkCount, setBookmarkCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    // DB에서 프로필 동기화
    useProfileStore.getState().loadFromServer();

    fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          if (res.data.job_type) setDbJobType(res.data.job_type);
          if (res.data.email) setEmailInput(res.data.email);
        }
      })
      .catch(console.error);

    fetch("/api/users/me/applications", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setAppliedCount(res.data?.length || 0);
      })
      .catch(console.error);

    fetch("/api/users/me/bookmarks", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setBookmarkCount(res.data?.length || 0);
      })
      .catch(console.error);

    // bookmarkStore도 동기화
    useBookmarkStore.getState().loadFromServer();
  }, []);

  const jobDisplay = job === "직접입력" ? jobCustom : job || "직군 미설정";
  const allCategories = [...categories.filter((c) => c !== "직접입력"), ...categoryCustom];
  const allCountries = [...countries.filter((c) => c !== "직접입력"), ...countryCustom];
  const birthDisplay = birth
    ? `${birth.slice(0, 4)}년${gender ? ` (${gender === "남성" ? "남" : "여"})` : ""}`
    : "정보 없음";
  const careerDisplay = CAREER_LABELS[careerYears] || "경력 미설정";

  const addCustomArea = () => {
    const v = customAreaInput.trim();
    if (!v) return;
    if (skillAreas.includes(v)) {
      setCustomAreaInput("");
      return;
    }
    setStoreProfile({ skillAreas: [...skillAreas, v] });
    setCustomAreaInput("");
  };

  const customAreas = skillAreas.filter((a) => !PRESET_SKILL_AREAS.includes(a));
  const customOfficeAreas = officeJobAreas.filter((a) => !PRESET_OFFICE_JOB_AREAS.includes(a));
  const addCustomOfficeArea = () => {
    const v = customOfficeAreaInput.trim();
    if (!v) return;
    if (officeJobAreas.includes(v)) {
      setCustomOfficeAreaInput("");
      return;
    }
    setStoreProfile({ officeJobAreas: [...officeJobAreas, v] });
    setCustomOfficeAreaInput("");
  };

  const handleCareerComplete = () => {
    const today = new Date();
    const date = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
    setCareerVerified(true, date);
  };

  return (
    <main className="profile-page">
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
      <div className="profile-summary">
        {/* 프로필 사진 */}
        <div style={{display:"flex", flexDirection:"column", alignItems:"center", marginBottom:"16px"}}>
          <div style={{
            width:"96px",
            height:"96px",
            borderRadius:"50%",
            background:"#f0e8f8",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            overflow:"hidden",
            position:"relative",
            border:"2px solid #ede0f8",
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="프로필" style={{width:"100%", height:"100%", objectFit:"cover"}} />
            ) : (
              <span style={{fontSize:"32px", color:"#a888c0"}}>👤</span>
            )}
            {avatarUploading && (
              <div style={{position:"absolute", inset:0, background:"rgba(255,255,255,0.8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", color:"#5f0080", fontWeight:600}}>
                업로드 중...
              </div>
            )}
          </div>
          <div style={{display:"flex", gap:"8px", marginTop:"8px"}}>
            <label style={{padding:"4px 10px", borderRadius:"6px", border:"1px solid #5f0080", background:"#fff", color:"#5f0080", fontSize:"11px", fontWeight:600, cursor:"pointer"}}>
              {avatarUrl ? "변경" : "사진 추가"}
              <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleAvatarUpload} style={{display:"none"}} />
            </label>
            {avatarUrl && (
              <button onClick={handleAvatarDelete} style={{padding:"4px 10px", borderRadius:"6px", border:"1px solid #e0e0e0", background:"#fff", color:"#888", fontSize:"11px", cursor:"pointer"}}>
                삭제
              </button>
            )}
          </div>
          <p style={{fontSize:"10px", color:"#aaa", marginTop:"4px"}}>JPG/PNG/WebP, 1MB 이하</p>
        </div>
        <div className="profile-name-row"><h1 className="profile-name">{name || "회원"}</h1></div>
        <button className="profile-job-row" onClick={() => router.push("/")}>
          <span className="profile-job">{jobDisplay}</span>
          <span className="profile-divider">·</span>
          <span className="profile-career">{careerDisplay}</span>
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
            <div className="profile-stat-value">{appliedCount}</div>
            <div className="profile-stat-label">지원 완료</div>
          </div>
          <div className="profile-stat-divider" />
          <div className="profile-stat">
            <div className="profile-stat-value">{bookmarkCount}</div>
            <div className="profile-stat-label">관심 공고</div>
          </div>
        </div>
      </div>

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

      <div className="profile-tabs">
        <button className={`profile-tab ${activeTab === "profile" ? "active" : ""}`} onClick={() => setActiveTab("profile")}>프로필</button>
        <button className={`profile-tab ${activeTab === "resume" ? "active" : ""}`} onClick={() => setActiveTab("resume")}>이력서</button>
        <button className={`profile-tab ${activeTab === "applied" ? "active" : ""}`} onClick={() => setActiveTab("applied")}>지원현황</button>
        <button className={`profile-tab ${activeTab === "bookmarks" ? "active" : ""}`} onClick={() => setActiveTab("bookmarks")}>관심공고</button>
      </div>

      <div className="profile-content">
        {activeTab === "applied" ? (
          <AppliedTab />
        ) : activeTab === "bookmarks" ? (
          <BookmarksTab />
        ) : activeTab === "profile" ? (
          <>
            <div className="profile-promo">
              <div className="profile-promo-icon"><Award size={20} /></div>
              <div className="profile-promo-text">
                <strong>뷰티 경력직</strong>이라면,<br />맞춤 채용 제안을 받아보세요
              </div>
            </div>

            {dbJobType && (
              <div style={{margin:"16px 0",padding:"14px 16px",background:"#fff",border:"1px solid #f0e8f8",borderRadius:"12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{fontSize:"20px"}}>{dbJobType === "STORE" ? "🏪" : "🏢"}</span>
                  <div>
                    <p style={{fontSize:"11px",color:"#888",marginBottom:"2px"}}>지금 찾고 있는 채용</p>
                    <p style={{fontSize:"14px",fontWeight:600,color:"#1a1a1a"}}>
                      {dbJobType === "STORE" ? "매장·샵 채용" : "기업·브랜드 채용"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <section className="profile-section">
              <div className="profile-section-head">
                <h2 className="profile-section-title">기본 정보 <CheckCircle2 size={16} className="profile-check" /></h2>
              </div>
              <div className="profile-info-card">
                <InfoRow label="이름" value={name || "정보 없음"} />
                <InfoRow label="휴대전화" value={userPhone || phone || "정보 없음"} />
                <InfoRow label="생년월일" value={birth ? `${birth.slice(0,4)}.${birth.slice(4,6) || "00"}.${birth.slice(6,8) || "00"}` : "정보 없음"} isEmpty={!birth} onClick={() => setEditField("birth")} />
                <InfoRow label="성별" value={gender || "정보 없음"} isEmpty={!gender} onClick={() => setEditField("gender")} />
                <InfoRow label="이메일" value={emailInput || "입력하기"} isEmpty={!emailInput} onClick={() => setEditField("email")} isLast />
              </div>
            </section>
            {dbJobType === "OFFICE" && (
              <section className="profile-section">
                <div className="profile-section-head">
                  <h2 className="profile-section-title">직군 영역</h2>
                </div>
                <div className="profile-info-card" style={{padding:"16px"}}>
                  <p style={{fontSize:"13px",color:"#888",marginBottom:"12px"}}>해당하는 직군 영역을 선택하거나 직접 입력해 주세요 (1~3개 권장)</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginBottom:"12px"}}>
                    {PRESET_OFFICE_JOB_AREAS.map((area) => (
                      <button key={area}
                        onClick={() => setStoreProfile({ officeJobAreas: officeJobAreas.includes(area) ? officeJobAreas.filter(a=>a!==area) : [...officeJobAreas, area] })}
                        style={{padding:"6px 14px",borderRadius:"20px",border:`1.5px solid ${officeJobAreas.includes(area)?"#5f0080":"#e0e0e0"}`,background:officeJobAreas.includes(area)?"#f3e5f5":"#fff",color:officeJobAreas.includes(area)?"#5f0080":"#888",fontSize:"13px",fontWeight:officeJobAreas.includes(area)?600:400,cursor:"pointer"}}>
                        {area}
                      </button>
                    ))}
                    {customOfficeAreas.map((area) => (
                      <button key={area}
                        onClick={() => setStoreProfile({ officeJobAreas: officeJobAreas.filter(a=>a!==area) })}
                        style={{padding:"6px 14px",borderRadius:"20px",border:"1.5px solid #5f0080",background:"#f3e5f5",color:"#5f0080",fontSize:"13px",fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:"4px"}}>
                        {area}
                        <span style={{fontSize:"15px",lineHeight:1,marginLeft:"2px"}}>×</span>
                      </button>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:"6px"}}>
                    <input
                      className="cv-input"
                      placeholder="직접 입력 (예: 사업개발, 법무, 신사업기획 등)"
                      value={customOfficeAreaInput}
                      onChange={(e) => setCustomOfficeAreaInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomOfficeArea(); } }}
                      style={{flex:1,fontSize:"13px"}}
                    />
                    <button
                      onClick={addCustomOfficeArea}
                      disabled={!customOfficeAreaInput.trim()}
                      style={{padding:"0 14px",borderRadius:"8px",border:"none",background: customOfficeAreaInput.trim() ? "#5f0080" : "#e0e0e0",color:"#fff",fontSize:"13px",fontWeight:600,cursor: customOfficeAreaInput.trim() ? "pointer" : "not-allowed"}}
                    >
                      추가
                    </button>
                  </div>
                </div>
              </section>
            )}
            {dbJobType === "STORE" && (
              <section className="profile-section">
                <div className="profile-section-head">
                  <h2 className="profile-section-title">시술 분야 · 전문 영역</h2>
                </div>
                <div className="profile-info-card" style={{padding:"16px"}}>
                  <p style={{fontSize:"13px",color:"#888",marginBottom:"12px"}}>해당하는 시술 분야를 선택하거나 직접 입력해 주세요</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginBottom:"12px"}}>
                    {PRESET_SKILL_AREAS.map((area) => (
                      <button key={area}
                        onClick={() => setStoreProfile({ skillAreas: skillAreas.includes(area) ? skillAreas.filter(a=>a!==area) : [...skillAreas, area] })}
                        style={{padding:"6px 14px",borderRadius:"20px",border:`1.5px solid ${skillAreas.includes(area)?"#5f0080":"#e0e0e0"}`,background:skillAreas.includes(area)?"#f3e5f5":"#fff",color:skillAreas.includes(area)?"#5f0080":"#888",fontSize:"13px",fontWeight:skillAreas.includes(area)?600:400,cursor:"pointer"}}>
                        {area}
                      </button>
                    ))}
                    {customAreas.map((area) => (
                      <button key={area}
                        onClick={() => setStoreProfile({ skillAreas: skillAreas.filter(a=>a!==area) })}
                        style={{padding:"6px 14px",borderRadius:"20px",border:"1.5px solid #5f0080",background:"#f3e5f5",color:"#5f0080",fontSize:"13px",fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:"4px"}}>
                        {area}
                        <span style={{fontSize:"15px",lineHeight:1,marginLeft:"2px"}}>×</span>
                      </button>
                    ))}
                  </div>

                  <div style={{display:"flex",gap:"6px",marginBottom:"20px"}}>
                    <input
                      className="cv-input"
                      placeholder="직접 입력 (예: 두피관리, 타투, 브로우 등)"
                      value={customAreaInput}
                      onChange={(e) => setCustomAreaInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomArea(); } }}
                      style={{flex:1,fontSize:"13px"}}
                    />
                    <button
                      onClick={addCustomArea}
                      disabled={!customAreaInput.trim()}
                      style={{padding:"0 14px",borderRadius:"8px",border:"none",background: customAreaInput.trim() ? "#5f0080" : "#e0e0e0",color:"#fff",fontSize:"13px",fontWeight:600,cursor: customAreaInput.trim() ? "pointer" : "not-allowed"}}
                    >
                      추가
                    </button>
                  </div>

                  <label style={{fontSize:"13px",fontWeight:600,color:"#333",display:"block",marginBottom:"6px"}}>보유 자격증</label>
                  <input className="cv-input" placeholder="예: 미용사(일반), 피부미용사 (쉼표로 구분)"
                    defaultValue={certificates.join(", ")}
                    onBlur={(e) => setStoreProfile({ certificates: e.target.value.split(",").map(s=>s.trim()).filter(Boolean) })}
                    style={{marginBottom:"16px"}} />
                  <label style={{fontSize:"13px",fontWeight:600,color:"#333",display:"block",marginBottom:"6px"}}>희망 근무 형태</label>
                  <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"16px"}}>
                    {["풀타임","파트타임","주말근무 가능","시급"].map((w) => (
                      <button key={w}
                        onClick={() => setStoreProfile({ workTypePrefer: workTypePrefer === w ? "" : w })}
                        style={{padding:"6px 14px",borderRadius:"20px",border:`1.5px solid ${workTypePrefer===w?"#5f0080":"#e0e0e0"}`,background:workTypePrefer===w?"#f3e5f5":"#fff",color:workTypePrefer===w?"#5f0080":"#888",fontSize:"13px",fontWeight:workTypePrefer===w?600:400,cursor:"pointer"}}>
                        {w}
                      </button>
                    ))}
                  </div>
                  <label style={{fontSize:"13px",fontWeight:600,color:"#333",display:"block",marginBottom:"6px"}}>희망 근무 지역</label>
                  <input className="cv-input" placeholder="예: 서울 강남, 서울 홍대"
                    defaultValue={regionPrefer}
                    onBlur={(e) => setStoreProfile({ regionPrefer: e.target.value })} />
                </div>
              </section>
            )}

            <section className="profile-section">
              <div className="profile-section-head">
                <h2 className="profile-section-title">
                  경력
                  {isCareerVerified && <CheckCircle2 size={16} className="profile-check" />}
                </h2>
                <button className="profile-section-add" onClick={() => setOpenModal("careerEdit")}>
                  <Plus size={14} /> 추가
                </button>
              </div>
              <div className="profile-career-card">
                <div className="profile-career-row">
                  <span className="profile-career-label">총 경력</span>
                  <span className="profile-career-value">
                    {careerDisplay}
                    {isCareerVerified && <span className="profile-verified-badge">✓ {verifiedDate} 인증</span>}
                  </span>
                </div>             
                {careers.map((c) => (
                  <div key={c.id} className="profile-career-entry">
                    <div className="profile-career-entry-head">
                      <strong>{c.company}</strong>
                      {c.isVerified && <span className="profile-verified-badge">✓ 인증</span>}
                    </div>
                    <span className="profile-career-entry-period">{c.startDate} - {c.endDate}</span>
                    {(c.department || c.position) && (
                      <p style={{fontSize:"12px",color:"#888",marginTop:"2px"}}>
                        {c.department}{c.department && c.position ? " · " : ""}{c.position}
                      </p>
                    )}
                  </div>
                ))}
                <button className="profile-career-bring-btn" onClick={() => setOpenModal("career")}>
                  경력 한번에 불러오기 (간편인증)
                </button>
              </div>
            </section>

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
             {dbJobType !== "STORE" && (
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
            )}
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
          <ResumeTab />
        )}
      </div>

      <div className="profile-bottom-cta">
        <button className="profile-resume-btn" onClick={() => router.push("/profile/resume")}>
          현재 프로필로 이력서 만들기
        </button>
      </div>

      {editField === "email" && (
        <div className="cv-overlay" onClick={() => setEditField(null)}>
          <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cv-header">
              <div style={{width:36}} />
              <h2 className="cv-title">이메일 입력</h2>
              <button className="cv-close" onClick={() => setEditField(null)}>✕</button>
            </div>
            <div className="cv-body">
              <label className="cv-field-label">이메일 주소</label>
              <input className="cv-input" type="email" placeholder="example@email.com" defaultValue={emailInput} id="email-input" />
              <button className="cv-btn-primary" style={{marginTop:"16px"}} onClick={() => {
                const val = (document.getElementById("birth-input") as HTMLInputElement)?.value;
                if (val) useSignupStore.getState().setBasic({ birth: val });
                setEditField(null);
              }}>저장</button>
            </div>
          </div>
        </div>
      )}
      {editField === "birth" && (
        <div className="cv-overlay" onClick={() => setOpenModal(null)}>
          <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cv-header">
              <div style={{width:36}} />
              <h2 className="cv-title">생년월일 입력</h2>
              <button className="cv-close" onClick={() => setEditField(null)}>✕</button>
            </div>
            <div className="cv-body">
              <label className="cv-field-label">생년월일 (예: 19900115)</label>
              <input className="cv-input" type="text" placeholder="YYYYMMDD" id="birth-input" defaultValue={birth} maxLength={8} />
              <button className="cv-btn-primary" style={{marginTop:"16px"}} onClick={() => {
                const val = (document.getElementById("birth-input") as HTMLInputElement)?.value;
                if (val) useSignupStore.getState().setBasic({ birth: val });
                setEditField(null);
              }}>저장</button>
            </div>
          </div>
        </div>
      )}
      {editField === "gender" && (
        <div className="cv-overlay" onClick={() => setOpenModal(null)}>
          <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cv-header">
              <div style={{width:36}} />
              <h2 className="cv-title">성별 선택</h2>
              <button className="cv-close" onClick={() => setEditField(null)}>✕</button>
            </div>
            <div className="cv-body" style={{display:"flex", gap:"12px"}}>
              {["남성","여성"].map((g) => (
                <button key={g} className={`company-wizard-card ${gender === g ? "active" : ""}`} style={{flex:1, padding:"20px", fontSize:"16px"}}
                  onClick={() => { useSignupStore.getState().setBasic({ gender: g as "남성"|"여성" }); setEditField(null); }}>
                  {g === "남성" ? "👨 남성" : "👩 여성"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <CareerVerifyModal isOpen={openModal === "career"} onClose={() => setOpenModal(null)} onComplete={handleCareerComplete} userName={name} userBirth={birth} userGender={gender} userPhone={phone} />
      <CareerEditModal isOpen={openModal === "careerEdit"} onClose={() => setOpenModal(null)} />
      <EducationModal isOpen={openModal === "education"} onClose={() => setOpenModal(null)} />
      <SkillModal isOpen={openModal === "skill"} onClose={() => setOpenModal(null)} />
      <LanguageModal isOpen={openModal === "language"} onClose={() => setOpenModal(null)} />
      <LinkModal isOpen={openModal === "link"} onClose={() => setOpenModal(null)} />
      <ExperienceModal isOpen={openModal === "experience"} onClose={() => setOpenModal(null)} />
      <NotificationModal isOpen={openModal === "notification"} onClose={() => setOpenModal(null)} />
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

function AppliedTab() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetch("/api/users/me/applications", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setApps(res.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusLabel: Record<string, string> = {
    APPLIED: "서류검토중",
    REVIEWING: "서류검토중",
    PASSED: "합격",
    REJECTED: "불합격",
    INTERVIEW: "면접예정",
  };
  const statusStyle: Record<string, string> = {
    APPLIED: "applied-status-review",
    REVIEWING: "applied-status-review",
    PASSED: "applied-status-pass",
    REJECTED: "applied-status-fail",
    INTERVIEW: "applied-status-interview",
  };

  if (loading) {
    return (
      <div className="profile-empty-tab">
        <p style={{ color: "#888", padding: "40px 0" }}>불러오는 중...</p>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="profile-empty-tab">
        <div className="profile-empty-icon">📋</div>
        <p>아직 지원한 공고가 없어요</p>
        <a href="/jobs" className="profile-empty-btn">채용공고 보러가기</a>
      </div>
    );
  }

  return (
    <div className="profile-tab-content">
      <div className="applied-list">
        {apps.map((app) => {
          const date = new Date(app.applied_at);
          const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
          return (
            <div key={app.id} className="applied-item">
              <div className="applied-item-left">
                <span className="applied-brand">{app.brand_name || app.company_name}</span>
                <h3 className="applied-title">{app.job_title}</h3>
                <span className="applied-date">지원일 {dateStr}</span>
              </div>
              <span className={`applied-status ${statusStyle[app.status] || "applied-status-review"}`}>
                {statusLabel[app.status] || app.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BookmarksTab() {
  const [bookmarkedJobs, setBookmarkedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetch("/api/users/me/bookmarks", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setBookmarkedJobs(res.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return "상시";
    const today = new Date();
    const dl = new Date(deadline);
    const dDay = Math.ceil((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (dDay < 0) return "마감";
    if (dDay === 0) return "오늘 마감";
    return `D-${dDay}`;
  };

  if (loading) {
    return (
      <div className="profile-empty-tab">
        <p style={{ color: "#888", padding: "40px 0" }}>불러오는 중...</p>
      </div>
    );
  }

  if (bookmarkedJobs.length === 0) {
    return (
      <div className="profile-empty-tab">
        <div className="profile-empty-icon">🔖</div>
        <p>저장한 공고가 없어요<br />관심있는 공고를 북마크해보세요</p>
        <a href="/jobs" className="profile-empty-btn">채용공고 보러가기</a>
      </div>
    );
  }

  return (
    <div className="profile-tab-content">
      <div className="bookmark-list">
        {bookmarkedJobs.map((job) => (
          <a key={job.id} href={`/jobs/${job.job_posting_id}`} className="bookmark-item">
            <div className="bookmark-item-left">
              <span className="bookmark-brand">{job.brand_name || job.company_name}</span>
              <h3 className="bookmark-title">{job.title}</h3>
              <span className="bookmark-location">📍 {job.location || "협의"}</span>
            </div>
            <span className="bookmark-deadline">{formatDeadline(job.deadline)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

