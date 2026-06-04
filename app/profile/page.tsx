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
import { CAREER_LABELS, STORE_SKILL_AREAS } from "@/lib/constants";
import CareerVerifyModal from "@/components/profile/CareerVerifyModal";
import CareerEditModal from "@/components/profile/CareerEditModal";
import EducationModal from "@/components/profile/EducationModal";
import SkillModal from "@/components/profile/SkillModal";
import LanguageModal from "@/components/profile/LanguageModal";
import LinkModal from "@/components/profile/LinkModal";
import ExperienceModal from "@/components/profile/ExperienceModal";
import CertificateModal from "@/components/profile/CertificateModal";
import NotificationModal from "@/components/profile/NotificationModal";
import ResumeTab from "@/components/profile/ResumeTab";

type ModalType =
  | "career" | "careerEdit" | "education" | "skill" | "language"
  | "link" | "experience" | "certificate" | "notification" | "brand"
  | null;

const PRESET_SKILL_AREAS: string[] = [...STORE_SKILL_AREAS];
const PRESET_OFFICE_JOB_AREAS = [
  "마케팅",
  "MD·상품기획",
  "영업·글로벌",
  "R&D·연구개발",
  "디자인·VMD",
  "SCM·물류·구매",
  "경영·재무·회계",
  "HR·교육",
  "IT·데이터",
  "CS·고객경험",
  "법무·컴플라이언스",
  "기타",
];

export default function ProfilePage() {
  const router = useRouter();
  const {
    name: signupName, birth, gender, job, jobCustom, careerYears,
    categories, categoryCustom, countries, countryCustom, phone,
    skillAreas, workTypePrefer, regionPrefer, setStoreProfile,
  } = useSignupStore();
  const [officeJobAreas, setOfficeJobAreas] = useState<string[]>([]);
  const { userName, userPhone } = useAuthStore();
  const name = userName || signupName || "";
  const {
    isCareerVerified, verifiedDate, careers, educations, experiences,
    skills, languages, links, setCareerVerified,
    removeCareer, removeEducation, removeSkill, removeLanguage, removeLink, removeExperience, removeCertificate,
    certificates: profileCertificates,
  } = useProfileStore();

  const [activeTab, setActiveTab] = useState<"profile" | "resume" | "applied" | "bookmarks">("profile");
  const [bannerClosed, setBannerClosed] = useState(false);
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [editCareer, setEditCareer] = useState<any>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [birthInput, setBirthInput] = useState("");
  const [emailEditInput, setEmailEditInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJobTemp, setSelectedJobTemp] = useState("");
  const [dbJobType, setDbJobType] = useState<"OFFICE" | "STORE" | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
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
          if (res.data.avatar_url) setAvatarUrl(res.data.avatar_url);
          if (res.data.office_job_areas?.length > 0) {
            setOfficeJobAreas(res.data.office_job_areas);
          }
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
  // 경력 항목들의 기간을 합산하여 총 경력 자동 계산 (겹치는 기간 중복 제거)
  const calcTotalCareer = () => {
    if (!careers || careers.length === 0) return "신입";
    const periods: [number, number][] = [];
    for (const c of careers) {
      const s = String(c.startDate || "").match(/(\d{4})[.\-/]?(\d{1,2})?/);
      if (!s) continue;
      const startM = Number(s[1]) * 12 + (Number(s[2] || "1") - 1);
      let endM: number;
      if (!c.endDate || c.endDate === "재직 중") {
        const now = new Date();
        endM = now.getFullYear() * 12 + now.getMonth();
      } else {
        const e = String(c.endDate).match(/(\d{4})[.\-/]?(\d{1,2})?/);
        if (!e) continue;
        endM = Number(e[1]) * 12 + (Number(e[2] || "1") - 1);
      }
      if (endM >= startM) periods.push([startM, endM]);
    }
    if (periods.length === 0) return "신입";
    // 겹치는 기간 병합
    periods.sort((a, b) => a[0] - b[0]);
    let totalMonths = 0;
    let [curS, curE] = periods[0];
    for (let i = 1; i < periods.length; i++) {
      const [s, e] = periods[i];
      if (s <= curE) { curE = Math.max(curE, e); }
      else { totalMonths += curE - curS; curS = s; curE = e; }
    }
    totalMonths += curE - curS;
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    if (years === 0 && months === 0) return "신입";
    if (years === 0) return `경력 ${months}개월`;
    if (months === 0) return `경력 ${years}년`;
    return `경력 ${years}년 ${months}개월`;
  };
  const careerDisplay = calcTotalCareer();

  const saveOfficeJobAreas = async (newAreas: string[]) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    setOfficeJobAreas(newAreas);
    useAuthStore.getState().login({
      ...useAuthStore.getState(),
      userJobAreas: newAreas,
    });
    await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ office_job_areas: newAreas }),
    });
  };

  // 프로필 사진 업로드
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert("파일 크기는 1MB 이하여야 합니다.");
      return;
    }
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      alert("JPG, PNG, WebP 이미지만 업로드 가능합니다.");
      return;
    }
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setAvatarUrl(data.data.avatar_url);
      } else {
        alert(data.error?.message || "업로드에 실패했습니다.");
      }
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  // 프로필 사진 삭제
  const handleAvatarDelete = async () => {
    if (!confirm("프로필 사진을 삭제하시겠어요?")) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setAvatarUploading(true);
    try {
      const res = await fetch("/api/users/me/avatar", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAvatarUrl(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAvatarUploading(false);
    }
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
                {/* 사진 + 이름 통합 */}
                <div style={{padding:"16px 14px", borderBottom:"1px solid #f0e8f8", display:"flex", alignItems:"center", gap:"14px"}}>
                  <div style={{
                    flexShrink: 0,
                    width:"80px",
                    height:"80px",
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
                      <span style={{fontSize:"30px", color:"#a888c0"}}>👤</span>
                    )}
                    {avatarUploading && (
                      <div style={{position:"absolute", inset:0, background:"rgba(255,255,255,0.8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", color:"#5f0080", fontWeight:600}}>
                        업로드중
                      </div>
                    )}
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <p style={{fontSize:"16px", fontWeight:600, margin:"0 0 6px"}}>{name || "회원"}</p>
                    <div style={{display:"flex", gap:"6px", marginBottom:"4px"}}>
                      <label style={{padding:"3px 10px", borderRadius:"6px", border:"1px solid #5f0080", background:"#fff", color:"#5f0080", fontSize:"11px", fontWeight:600, cursor:"pointer"}}>
                        {avatarUrl ? "변경" : "사진 추가"}
                        <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleAvatarUpload} style={{display:"none"}} />
                      </label>
                      {avatarUrl && (
                        <button onClick={handleAvatarDelete} style={{padding:"3px 10px", borderRadius:"6px", border:"1px solid #e0e0e0", background:"#fff", color:"#888", fontSize:"11px", cursor:"pointer"}}>
                          삭제
                        </button>
                      )}
                    </div>
                    <p style={{fontSize:"10px", color:"#aaa", margin:0}}>JPG/PNG/WebP, 1MB 이하</p>
                  </div>
                </div>
                <InfoRow label="휴대전화" value={userPhone || phone || "정보 없음"} />
                {editField === "birth" ? (
                  <div className="profile-info-row" style={{ cursor: "default" }}>
                    <span className="profile-info-label">생년월일</span>
                    <span style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
                      <input
                        type="text" placeholder="YYYYMMDD" maxLength={8}
                        value={birthInput}
                        onChange={(e) => setBirthInput(e.target.value.replace(/\D/g, ""))}
                        style={{ width: "120px", padding: "6px 10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px" }}
                      />
                      <button
                        style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "14px", border: "none", background: "#5f0080", color: "#fff", cursor: "pointer" }}
                        onClick={async () => {
                          if (!/^\d{8}$/.test(birthInput)) { alert("생년월일을 YYYYMMDD 8자리로 입력해주세요. (예: 19900115)"); return; }
                          try {
                            const token = localStorage.getItem("access_token");
                            const res = await fetch("/api/users/me", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ birth: birthInput }),
                            });
                            const data = await res.json();
                            if (!data.success) { alert(data.error?.message || "저장에 실패했습니다."); return; }
                            useSignupStore.getState().setBasic({ birth: birthInput });
                            setEditField(null);
                          } catch (e) { alert("네트워크 오류가 발생했습니다."); }
                        }}>
                        저장
                      </button>
                      <button onClick={() => setEditField(null)}
                        style={{ padding: "6px 10px", borderRadius: "8px", fontSize: "14px", border: "1px solid #ddd", background: "#fff", color: "#999", cursor: "pointer" }}>취소</button>
                    </span>
                  </div>
                ) : (
                  <InfoRow label="생년월일" value={birth ? `${birth.slice(0,4)}.${birth.slice(4,6) || "00"}.${birth.slice(6,8) || "00"}` : "정보 없음"} isEmpty={!birth} onClick={() => { setBirthInput(birth || ""); setEditField("birth"); }} />
                )}
                {editField === "gender" ? (
                  <div className="profile-info-row is-last" style={{ cursor: "default" }}>
                    <span className="profile-info-label">성별</span>
                    <span style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                      {["남성", "여성"].map((g) => (
                        <button key={g}
                          style={{
                            padding: "6px 16px", borderRadius: "20px", fontSize: "14px", cursor: "pointer",
                            border: gender === g ? "1.5px solid #5f0080" : "1px solid #ddd",
                            background: gender === g ? "#5f0080" : "#fff",
                            color: gender === g ? "#fff" : "#666",
                          }}
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem("access_token");
                              const res = await fetch("/api/users/me", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ gender: g }),
                              });
                              const data = await res.json();
                              if (!data.success) { alert(data.error?.message || "저장에 실패했습니다."); return; }
                              useSignupStore.getState().setBasic({ gender: g as "남성" | "여성" });
                              setEditField(null);
                            } catch (e) { alert("네트워크 오류가 발생했습니다."); }
                          }}>
                          {g}
                        </button>
                      ))}
                      <button onClick={() => setEditField(null)}
                        style={{ padding: "6px 12px", borderRadius: "20px", fontSize: "14px", border: "1px solid #ddd", background: "#fff", color: "#999", cursor: "pointer" }}>
                        취소
                      </button>
                    </span>
                  </div>
                ) : (
                  <InfoRow label="성별" value={gender || "정보 없음"} isEmpty={!gender} onClick={() => setEditField("gender")} />
                )}
                {editField === "email" ? (
                  <div className="profile-info-row is-last" style={{ cursor: "default" }}>
                    <span className="profile-info-label">이메일</span>
                    <span style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
                      <input
                        type="email" placeholder="example@email.com"
                        value={emailEditInput}
                        onChange={(e) => setEmailEditInput(e.target.value)}
                        style={{ width: "200px", padding: "6px 10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px" }}
                      />
                      <button
                        style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "14px", border: "none", background: "#5f0080", color: "#fff", cursor: "pointer" }}
                        onClick={async () => {
                          const val = emailEditInput.trim();
                          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { alert("올바른 이메일 형식을 입력해주세요."); return; }
                          try {
                            const token = localStorage.getItem("access_token");
                            const res = await fetch("/api/users/me", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ email: val }),
                            });
                            const data = await res.json();
                            if (!data.success) { alert(data.error?.message || "저장에 실패했습니다."); return; }
                            setEmailInput(val);
                            setEditField(null);
                          } catch (e) { alert("네트워크 오류가 발생했습니다."); }
                        }}>
                        저장
                      </button>
                      <button onClick={() => setEditField(null)}
                        style={{ padding: "6px 10px", borderRadius: "8px", fontSize: "14px", border: "1px solid #ddd", background: "#fff", color: "#999", cursor: "pointer" }}>취소</button>
                    </span>
                  </div>
                ) : (
                  <InfoRow label="이메일" value={emailInput || "입력하기"} isEmpty={!emailInput} onClick={() => { setEmailEditInput(emailInput || ""); setEditField("email"); }} isLast />
                )}
              </div>
            </section>
            {dbJobType === "OFFICE" && (
              <section className="profile-section">
                <div className="profile-section-head">
                  <h2 className="profile-section-title">직군 영역</h2>
                </div>
                <div className="profile-info-card" style={{padding:"16px"}}>
                  <p style={{fontSize:"13px",color:"#888",marginBottom:"12px"}}>해당하는 직군 영역을 선택해 주세요 (1~3개 권장)</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginBottom:"12px"}}>
                    {PRESET_OFFICE_JOB_AREAS.map((area) => (
                      <button key={area}
                        onClick={() => saveOfficeJobAreas(officeJobAreas.includes(area) ? officeJobAreas.filter(a=>a!==area) : [...officeJobAreas, area])}
                        style={{padding:"6px 14px",borderRadius:"20px",border:`1.5px solid ${officeJobAreas.includes(area)?"#5f0080":"#e0e0e0"}`,background:officeJobAreas.includes(area)?"#f3e5f5":"#fff",color:officeJobAreas.includes(area)?"#5f0080":"#888",fontSize:"13px",fontWeight:officeJobAreas.includes(area)?600:400,cursor:"pointer"}}>
                        {area}
                      </button>
                    ))}
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
                  <p style={{fontSize:"13px",color:"#888",marginBottom:"12px"}}>해당하는 시술 분야를 선택해 주세요</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginBottom:"12px"}}>
                    {PRESET_SKILL_AREAS.map((area) => (
                      <button key={area}
                        onClick={() => setStoreProfile({ skillAreas: skillAreas.includes(area) ? skillAreas.filter(a=>a!==area) : [...skillAreas, area] })}
                        style={{padding:"6px 14px",borderRadius:"20px",border:`1.5px solid ${skillAreas.includes(area)?"#5f0080":"#e0e0e0"}`,background:skillAreas.includes(area)?"#f3e5f5":"#fff",color:skillAreas.includes(area)?"#5f0080":"#888",fontSize:"13px",fontWeight:skillAreas.includes(area)?600:400,cursor:"pointer"}}>
                        {area}
                      </button>
                    ))}
                  </div>

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

      <CareerVerifyModal isOpen={openModal === "career"} onClose={() => setOpenModal(null)} onComplete={handleCareerComplete} userName={name} userBirth={birth} userGender={gender} userPhone={phone} />
      <CareerEditModal
        isOpen={openModal === "careerEdit"}
        onClose={() => { setOpenModal(null); setEditCareer(null); }}
        editTarget={editCareer}
      />
      <EducationModal isOpen={openModal === "education"} onClose={() => setOpenModal(null)} />
      <SkillModal isOpen={openModal === "skill"} onClose={() => setOpenModal(null)} />
      <LanguageModal isOpen={openModal === "language"} onClose={() => setOpenModal(null)} />
      <LinkModal isOpen={openModal === "link"} onClose={() => setOpenModal(null)} />
      <ExperienceModal isOpen={openModal === "experience"} onClose={() => setOpenModal(null)} />
      <CertificateModal isOpen={openModal === "certificate"} onClose={() => setOpenModal(null)} />
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

