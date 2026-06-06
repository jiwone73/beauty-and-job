"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronDown, Download, Eye, Plus, X, FileText, Trash2, Upload, Printer, Pencil } from "lucide-react";
import { useSignupStore } from "@/lib/store/signupStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { useAuthStore } from "@/lib/store/authStore";
import ResumePreview from "@/components/profile/ResumePreview";
import CareerEditModal from "@/components/profile/CareerEditModal";
import LinkModal from "@/components/profile/LinkModal";
import EducationModal from "@/components/profile/EducationModal";
import LanguageModal from "@/components/profile/LanguageModal";
import ExperienceModal from "@/components/profile/ExperienceModal";
import SkillModal from "@/components/profile/SkillModal";
import CertificateModal from "@/components/profile/CertificateModal";

const MAX_PORTFOLIO_SIZE = 5 * 1024 * 1024; // 5MB

function ResumePageContent() {
  const router = useRouter();
  const { name: signupName, birth, gender, job, jobCustom, phone, officeJobAreas, skillAreas, workTypePrefer, regionPrefer } = useSignupStore();
  const { userName } = useAuthStore();
  const name = signupName || userName || "";
  const {
    intro, coreCompetencies, educations, careers,
    skills, languages, experiences, links, email,
    setIntro, setCoreCompetencies, setEmail,
    addLink, updateLink, removeLink,
    addSkill, removeSkill,
    addLanguage, updateLanguage, removeLanguage,
    addExperience, updateExperience, removeExperience,
    addEducation, updateEducation, removeEducation,
    addCareer, updateCareer, removeCareer, certificates, removeCertificate, updateCertificate,
  } = useProfileStore();

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [resumeType, setResumeType] = useState<"office" | "salon">("office");
  const [introLocal, setIntroLocal] = useState(intro);
  const [coreLocal, setCoreLocal] = useState(coreCompetencies);
  const [emailLocal, setEmailLocal] = useState(email);
  const [showPreview, setShowPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const [portfolioUrl, setPortfolioUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [portfolioFilename, setPortfolioFilename] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [careerModalOpen, setCareerModalOpen] = useState(false);
  const [editCareer, setEditCareer] = useState<any>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editLink, setEditLink] = useState<any>(null);
  const [eduModalOpen, setEduModalOpen] = useState(false);
  const [editEdu, setEditEdu] = useState<any>(null);
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [editLang, setEditLang] = useState<any>(null);
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [editExp, setEditExp] = useState<any>(null);
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [editCert, setEditCert] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 항목 접기/펴기 (경력·학력·자격증·활동) — 기본 접힘
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    // DB에서 프로필 동기화
    useProfileStore.getState().loadFromServer();
    fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          if (res.data.email) setEmailLocal(res.data.email);
          if (res.data.job_type === "STORE") setResumeType("salon");
          else setResumeType("office");
          if (res.data.portfolio_url) setPortfolioUrl(res.data.portfolio_url);
          if (res.data.avatar_url) setAvatarUrl(res.data.avatar_url);
          if (res.data.portfolio_filename) setPortfolioFilename(res.data.portfolio_filename);
        }
      })
      .catch(console.error);
  }, []);

  const jobDisplay =
    (job === "직접입력" ? jobCustom : job) ||
    officeJobAreas[0] ||
    skillAreas[0] ||
    "직군 미설정";
  const birthDisplay = birth
    ? `${birth.slice(0, 4)}년 (${new Date().getFullYear() - Number(birth.slice(0, 4))}세, ${gender === "남성" ? "남" : "여"})`
    : "";

  // 경력 항목 기간 합산 → 총 경력 (겹치는 기간 중복 제거)
  const calcTotalCareer = () => {
    if (!careers || careers.length === 0) return "";
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
    if (periods.length === 0) return "";
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
    if (years === 0 && months === 0) return "";
    if (years === 0) return `총 ${months}개월`;
    if (months === 0) return `총 ${years}년`;
    return `총 ${years}년 ${months}개월`;
  };
  const totalCareer = calcTotalCareer();

  const handleSave = async () => {
    setIntro(introLocal);
    setCoreCompetencies(coreLocal);
    setEmail(emailLocal);
    try {
      await useProfileStore.getState().syncToDb();
      alert("저장되었습니다.");
    } catch (e) {
      alert("저장에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const processFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      alert("PDF 파일만 업로드 가능합니다.");
      return;
    }
    if (file.size > MAX_PORTFOLIO_SIZE) {
      alert("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/users/me/portfolio", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error?.message || "업로드에 실패했습니다.");
        return;
      }
      setPortfolioUrl(data.data.portfolio_url);
      setPortfolioFilename(data.data.portfolio_filename);
      alert("포트폴리오가 업로드되었습니다.");
    } catch (e) {
      console.error(e);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDeletePortfolio = async () => {
    if (!confirm("포트폴리오를 삭제하시겠어요?")) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch("/api/users/me/portfolio", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) {
        alert("삭제에 실패했습니다.");
        return;
      }
      setPortfolioUrl(null);
      setPortfolioFilename(null);
      alert("포트폴리오가 삭제되었습니다.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      setShowPreview(true);
      await new Promise((r) => setTimeout(r, 600));
      if (!previewRef.current) return;
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      const fileName = name ? `${name}_이력서.pdf` : "이력서.pdf";
      pdf.save(fileName);
      setShowPreview(false);
    } catch (e) {
      alert("다운로드 중 오류가 발생했습니다.");
      setShowPreview(false);
    } finally {
      setIsDownloading(false);
    }
  };
const handlePrint = async () => {
    if (!previewRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      await new Promise((r) => setTimeout(r, 300));
      const canvas = await html2canvas(previewRef.current, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(`<html><head><title>이력서 인쇄</title></head><body style="margin:0"><img src="${imgData}" style="width:100%" onload="window.print();window.close()" /></body></html>`);
      w.document.close();
    } catch (e) {
      alert("인쇄 준비 중 오류가 발생했습니다.");
    }
  };
  // URL ?action=preview 또는 ?action=download 자동 트리거
  const searchParams = useSearchParams();
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "preview") {
      setShowPreview(true);
    } else if (action === "download") {
      setTimeout(() => handleDownload(), 500);
    }
    if (action) {
      window.history.replaceState({}, "", "/profile/resume");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="resume-page">
      <header className="resume-header">
        <div className="resume-header-inner">
          <Link href="/" className="resume-logo">
            <Image src="/images/logo.png" alt="뷰티앤잡" width={110} height={28} priority />
          </Link>
          <div className="resume-header-actions">
            <button className="resume-back-btn" onClick={() => router.push("/profile")}>
              <ChevronLeft size={16} />
              <span>프로필</span>
            </button>
            <button className="resume-action-btn" onClick={() => setShowPreview(true)}>
              <Eye size={16} /><span>미리보기</span>
            </button>
            <button
              className="resume-action-btn"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              <Download size={16} />
              <span>{isDownloading ? "저장 중..." : "다운로드"}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="resume-subheader">
        <h1 className="resume-subheader-title">이력서 편집</h1>
      </div>

      <div className="resume-layout">
        <aside className="resume-sidebar">
          <p className="resume-sidebar-title">섹션 구성</p>
          {(() => {
            const sections = resumeType === "office" ? [
              { id: "basic", label: "기본 정보", done: !!(phone && emailLocal) },
              { id: "intro", label: "소개 · 핵심역량", done: !!(introLocal.trim() && coreLocal.trim()) },
              { id: "career", label: "경력", done: careers.length > 0 },
              { id: "education", label: "학력", done: educations.length > 0 },
              { id: "skill", label: "스킬", done: skills.length > 0 },
              { id: "language", label: "어학", done: languages.length > 0 },
              { id: "certificate", label: "자격증", done: certificates.length > 0 },
              { id: "experience", label: "활동/수상", done: experiences.length > 0 },
              { id: "portfolio", label: "포트폴리오", done: !!portfolioUrl },
              { id: "link", label: "링크", done: links.length > 0 },
            ] : [
              { id: "basic", label: "기본 정보", done: !!(phone && emailLocal) },
              { id: "intro", label: "소개", done: !!introLocal.trim() },
              { id: "career", label: "경력 (근무 매장)", done: careers.length > 0 },
              { id: "education", label: "학력", done: educations.length > 0 },
              { id: "language", label: "어학", done: languages.length > 0 },
              { id: "certificate", label: "자격증", done: certificates.length > 0 },
              { id: "experience", label: "활동/수상", done: experiences.length > 0 },
              { id: "portfolio", label: "포트폴리오", done: !!portfolioUrl },
              { id: "link", label: "링크", done: links.length > 0 },
            ];
            const doneCount = sections.filter((s) => s.done).length;
            const rate = Math.round((doneCount / sections.length) * 100);
            return (
              <>
                <div className="resume-completion">
                  <div className="resume-completion-head">
                    <span>완성도</span>
                    <strong>{rate}%</strong>
                  </div>
                  <div className="resume-completion-bar">
                    <div className="resume-completion-fill" style={{ width: `${rate}%` }} />
                  </div>
                  <p className="resume-completion-text">{doneCount}/{sections.length} 항목 완료</p>
                </div>
                {sections.map((sec) => (
                  <button
                    key={sec.id}
                    className={`resume-sidebar-item ${activeSection === sec.id ? "active" : ""}`}
                    onClick={() => {
                      setActiveSection(sec.id);
                      const el = document.getElementById(`section-${sec.id}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    <span className="resume-sidebar-check">{sec.done ? "✓" : "○"}</span>
                    {sec.label}
                  </button>
                ))}
              </>
            );
          })()}
        </aside>

        <main className="resume-editor">
          <div style={{
            margin: "0 0 16px",
            padding: "16px 18px",
            background: "#fff",
            border: "1px solid #f0e8f8",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}>
            <span style={{ fontSize: "22px" }}>{resumeType === "salon" ? "🏪" : "🏢"}</span>
            <div>
              <p style={{ fontSize: "12px", color: "#888", marginBottom: "2px" }}>작성 중인 이력서 유형</p>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#1a1a1a" }}>
                {resumeType === "salon" ? "매장·기술직 이력서" : "기업·브랜드 이력서"}
              </p>
            </div>
          </div>

          <section id="section-basic" className="resume-section">
            <h2 className="resume-section-title">기본 정보</h2>
            <div className="resume-basic-info">
              <div className="resume-name-block">
                <h3 className="resume-name">{name || "이름"}</h3>
                <p className="resume-job-line">{birthDisplay} {birthDisplay && "·"} {jobDisplay}</p>
                <p className="resume-contact">{phone || ""} {phone && emailLocal ? "·" : ""} {emailLocal}</p>
              </div>
              <div className="resume-field-group">
                <label className="resume-field-label">이메일</label>
                <input
                  className="resume-input"
                  placeholder="이메일을 입력해 주세요."
                  value={emailLocal}
                  onChange={(e) => setEmailLocal(e.target.value)}
                  onBlur={() => setEmail(emailLocal)}
                />
              </div>
            </div>
          </section>

          <section id="section-intro" className="resume-section">
            <div className="resume-section-head">
              <h2 className="resume-section-title">소개 & 핵심역량</h2>
            </div>
            <label className="resume-field-label">소개 <span className="resume-required">* (0/300자)</span></label>
            <textarea
              className="resume-textarea"
              placeholder={resumeType === "office"
                ? `채용 담당자가 가장 먼저 읽게되는 글이에요.\n예시) 소비자 관점과 브랜드 관점을 모두 이해하는 3년차 뷰티 마케터입니다.`
                : `나를 표현하는 한 줄 소개를 작성해보세요.\n예시) 섬세한 손기술과 트렌드 감각을 갖춘 5년 경력 네일 아티스트입니다.`}
              maxLength={300}
              value={introLocal}
              onChange={(e) => setIntroLocal(e.target.value)}
              onBlur={() => setIntro(introLocal)}
            />
            {resumeType === "office" && (
              <>
                <label className="resume-field-label">핵심 역량 <span className="resume-required">* (0/300자)</span></label>
                <textarea
                  className="resume-textarea"
                  placeholder={`핵심역량 3~5가지를 정리해보세요`}
                  maxLength={300}
                  value={coreLocal}
                  onChange={(e) => setCoreLocal(e.target.value)}
                  onBlur={() => setCoreCompetencies(coreLocal)}
                />
              </>
            )}
          </section>

          <section id="section-career" className="resume-section">
            <div className="resume-section-head">
              <h2 className="resume-section-title">
                {resumeType === "office" ? "경력" : "경력 (근무 매장)"}
                {totalCareer && (
                  <span style={{ marginLeft: "8px", fontSize: "14px", fontWeight: 500, color: "#5f0080" }}>
                    · {totalCareer}
                  </span>
                )}
              </h2>
              <button className="resume-icon-btn" aria-label="경력 추가" onClick={() => { setEditCareer(null); setCareerModalOpen(true); }}>
                <Plus size={18} />
              </button>
            </div>
            {careers.length === 0 ? (
              <div className="resume-empty-section">
                <button className="resume-empty-btn" onClick={() => { setEditCareer(null); setCareerModalOpen(true); }}>
                  <Plus size={16} /> 경력 추가하기
                </button>
              </div>
            ) : (
              careers.map((c) => {
                const key = `career-${c.id}`;
                const open = expanded.has(key);
                return (
                  <div key={c.id} className="resume-career-item">
                    <div className="resume-career-head" onClick={() => toggleExpand(key)} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                      <ChevronDown size={16} style={{ flexShrink: 0, marginRight: "6px", color: "#bbb", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                      <strong>{c.company}</strong>
                      {!open && (
                        <span style={{ marginLeft: "8px", fontSize: "13px", fontWeight: 400, color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.startDate} - {c.endDate}
                        </span>
                      )}
                      <span style={{ marginLeft: "auto", display: "flex", gap: "4px", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        <button className="resume-icon-btn" aria-label="수정" onClick={() => { setEditCareer(c); setCareerModalOpen(true); }}>
                          <Pencil size={15} />
                        </button>
                        <button className="resume-icon-btn danger" aria-label="삭제" onClick={() => { if (confirm("이 경력을 삭제할까요?")) removeCareer(c.id); }}>
                          <Trash2 size={15} />
                        </button>
                      </span>
                    </div>
                    {open && (
                      <>
                        <span className="resume-career-period">{c.startDate} - {c.endDate}</span>
                        {c.department && <p className="resume-career-dept">{c.department} · {c.position}</p>}
                        {c.description && <p className="resume-career-dept" style={{ whiteSpace: "pre-line", marginTop: "4px", color: "#555" }}>{c.description}</p>}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </section>

          <section id="section-education" className="resume-section">
            <div className="resume-section-head">
              <h2 className="resume-section-title">학력</h2>
              <button className="resume-icon-btn" aria-label="학교 추가" onClick={() => { setEditEdu(null); setEduModalOpen(true); }}>
                <Plus size={18} />
              </button>
            </div>
            {educations.length === 0 ? (
              <div className="resume-empty-section">
                <button className="resume-empty-btn" onClick={() => { setEditEdu(null); setEduModalOpen(true); }}>
                  <Plus size={16} /> 학력 추가하기
                </button>
              </div>
            ) : (
              educations.map((edu) => {
                const key = `edu-${edu.id}`;
                const open = expanded.has(key);
                return (
                  <div key={edu.id} className="resume-edu-item">
                    <div onClick={() => toggleExpand(key)} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                      <ChevronDown size={16} style={{ flexShrink: 0, marginRight: "6px", color: "#bbb", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                      <strong>{edu.school}</strong>
                      {!open && (
                        <span style={{ marginLeft: "8px", fontSize: "13px", fontWeight: 400, color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {edu.startDate} - {edu.endDate}
                        </span>
                      )}
                      <span style={{ marginLeft: "auto", display: "flex", gap: "4px", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        <button className="resume-icon-btn" aria-label="수정" onClick={() => { setEditEdu(edu); setEduModalOpen(true); }}>
                          <Pencil size={15} />
                        </button>
                        <button className="resume-icon-btn danger" aria-label="삭제" onClick={() => { if (confirm("이 학력을 삭제할까요?")) removeEducation(edu.id); }}>
                          <Trash2 size={15} />
                        </button>
                      </span>
                    </div>
                    {open && (
                      <>
                        <span className="resume-edu-info">{edu.major} · {edu.status}</span>
                        <span className="resume-edu-period">{edu.startDate} - {edu.endDate}</span>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </section>
          {resumeType === "office" && (
          <section id="section-skill" className="resume-section">
            <div className="resume-section-head">
              <h2 className="resume-section-title">스킬</h2>
              <button className="resume-icon-btn" aria-label="스킬 추가" onClick={() => setSkillModalOpen(true)}>
                <Plus size={18} />
              </button>
            </div>
            {skills.length > 0 ? (
              <div className="resume-skill-chips">
                {skills.map((sk) => <span key={sk} className="resume-skill-chip">{sk}</span>)}
              </div>
            ) : (
              <div className="resume-empty-section">
                <button className="resume-empty-btn" onClick={() => setSkillModalOpen(true)}>
                  <Plus size={16} /> 스킬 추가하기
                </button>
              </div>
           )}
          </section>
          )}
          <section id="section-language" className="resume-section">
            <div className="resume-section-head">
              <h2 className="resume-section-title">어학</h2>
              <button className="resume-icon-btn" aria-label="어학 추가" onClick={() => { setEditLang(null); setLangModalOpen(true); }}>
                <Plus size={18} />
              </button>
            </div>
            {languages.length > 0 ? (
              <div className="resume-list">
                {languages.map((lang) => (
                  <div key={lang.id} className="resume-list-item">
                    <p style={{ fontWeight: 600, marginBottom: "4px", display: "flex", alignItems: "center" }}>
                      {lang.language}
                      <span style={{ marginLeft: "12px", fontWeight: 400, color: "#666" }}>{lang.level}</span>
                      <span style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
                        <button className="resume-icon-btn" aria-label="수정" onClick={() => { setEditLang(lang); setLangModalOpen(true); }}>
                          <Pencil size={15} />
                        </button>
                        <button className="resume-icon-btn danger" aria-label="삭제" onClick={() => { if (confirm("이 어학을 삭제할까요?")) removeLanguage(lang.id); }}>
                          <Trash2 size={15} />
                        </button>
                      </span>
                    </p>
                    {lang.test && (
                      <p style={{ color: "#888", fontSize: "13px" }}>{lang.test}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="resume-empty-section">
                <button className="resume-empty-btn" onClick={() => { setEditLang(null); setLangModalOpen(true); }}>
                  <Plus size={16} /> 어학 추가하기
                </button>
              </div>
            )}
          </section>
          <section id="section-certificate" className="resume-section">
            <div className="resume-section-head">
              <h2 className="resume-section-title">자격증</h2>
              <button className="resume-icon-btn" aria-label="자격증 추가" onClick={() => { setEditCert(null); setCertModalOpen(true); }}>
                <Plus size={18} />
              </button>
            </div>
            {certificates.length > 0 ? (
              <div className="resume-list">
                {certificates.map((cert) => {
                  const key = `cert-${cert.id}`;
                  const open = expanded.has(key);
                  return (
                    <div key={cert.id} className="resume-list-item">
                      <p
                        onClick={() => toggleExpand(key)}
                        style={{ fontWeight: 600, marginBottom: open ? "4px" : 0, display: "flex", alignItems: "center", cursor: "pointer" }}
                      >
                        <ChevronDown size={16} style={{ flexShrink: 0, marginRight: "6px", color: "#bbb", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                        {cert.name}
                        {cert.issued_ym && (
                          <span style={{ marginLeft: "12px", fontWeight: 400, color: "#666", fontSize: "13px" }}>{cert.issued_ym}</span>
                        )}
                        <span style={{ marginLeft: "auto", display: "flex", gap: "4px", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                          <button className="resume-icon-btn" aria-label="수정" onClick={() => { setEditCert(cert); setCertModalOpen(true); }}>
                            <Pencil size={15} />
                          </button>
                          <button className="resume-icon-btn danger" aria-label="삭제" onClick={() => { if (confirm("이 자격증을 삭제할까요?")) removeCertificate(cert.id); }}>
                            <Trash2 size={15} />
                          </button>
                        </span>
                      </p>
                      {open && cert.issuer && (
                        <p style={{ color: "#888", fontSize: "13px", paddingLeft: "22px" }}>{cert.issuer}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="resume-empty-section">
                <button className="resume-empty-btn" onClick={() => { setEditCert(null); setCertModalOpen(true); }}>
                  <Plus size={16} /> 자격증 추가하기
                </button>
              </div>
            )}
          </section>

          <section id="section-experience" className="resume-section">
            <div className="resume-section-head">
              <h2 className="resume-section-title">활동/수상</h2>
              <button className="resume-icon-btn" aria-label="활동 추가" onClick={() => { setEditExp(null); setExpModalOpen(true); }}>
              <Plus size={18} />
              </button>
            </div>
            {experiences.length > 0 ? (
              <div className="resume-list">
                {experiences.map((x) => {
                  const key = `exp-${x.id}`;
                  const open = expanded.has(key);
                  return (
                    <div key={x.id} className="resume-list-item">
                      <p
                        onClick={() => toggleExpand(key)}
                        style={{ fontWeight: 600, marginBottom: open ? "4px" : 0, display: "flex", alignItems: "center", cursor: "pointer" }}
                      >
                        <ChevronDown size={16} style={{ flexShrink: 0, marginRight: "6px", color: "#bbb", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                        {x.category && (
                          <span style={{ color: "#5f0080", marginRight: "8px" }}>[{x.category}]</span>
                        )}
                        {x.title}
                        <span style={{ marginLeft: "auto", display: "flex", gap: "4px", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                          <button className="resume-icon-btn" aria-label="수정" onClick={() => { setEditExp(x); setExpModalOpen(true); }}>
                            <Pencil size={15} />
                          </button>
                          <button className="resume-icon-btn danger" aria-label="삭제" onClick={() => { if (confirm("이 활동을 삭제할까요?")) removeExperience(x.id); }}>
                            <Trash2 size={15} />
                          </button>
                        </span>
                      </p>
                      {open && x.description && (
                        <p style={{ color: "#666", fontSize: "14px", paddingLeft: "22px" }}>{x.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="resume-empty-section">
                <button className="resume-empty-btn" onClick={() => { setEditExp(null); setExpModalOpen(true); }}>
                  <Plus size={16} /> 활동 추가하기
                </button>
              </div>
            )}
          </section>
          <section id="section-portfolio" className="resume-section">
            <div className="resume-section-head">
              <h2 className="resume-section-title">포트폴리오</h2>
            </div>
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "12px" }}>
              PDF 파일을 첨부해 주세요 (최대 5MB).
              {resumeType === "salon" && " 시술 사진을 모은 PDF를 추천드려요."}
            </p>

            {portfolioUrl ? (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "16px",
                background: "#f9f5fc",
                border: "1.5px solid #e0d0f0",
                borderRadius: "12px",
              }}>
                <FileText size={32} color="#5f0080" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {portfolioFilename || "포트폴리오.pdf"}
                  </p>
                  
                  
                    href={portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: "12px", color: "#5f0080", textDecoration: "underline" }}
                  >
                    파일 열기
                  </a>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  style={{
                    padding: "8px 14px", borderRadius: "8px", border: "1px solid #5f0080",
                    background: "#fff", color: "#5f0080", fontSize: "13px", fontWeight: 600,
                    cursor: isUploading ? "not-allowed" : "pointer"
                  }}
                >
                  {isUploading ? "업로드 중..." : "교체"}
                </button>
                <button
                  onClick={handleDeletePortfolio}
                  style={{
                    padding: "8px", borderRadius: "8px", border: "1px solid #e74c3c",
                    background: "#fff", color: "#e74c3c", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}
                  aria-label="삭제"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  width: "100%", padding: "40px 16px",
                  borderRadius: "12px",
                  border: `2px dashed ${isDragOver ? "#5f0080" : "#d0c0e0"}`,
                  background: isDragOver ? "#f3e5f5" : "#fafafa",
                  color: "#5f0080",
                  fontSize: "14px", fontWeight: 600,
                  cursor: isUploading ? "not-allowed" : "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
                  transition: "all 0.15s ease",
                  textAlign: "center"
                }}
              >
                <Upload size={32} />
                <span>
                  {isUploading
                    ? "업로드 중..."
                    : isDragOver
                      ? "여기에 놓으세요"
                      : "PDF를 끌어다 놓거나 클릭하여 업로드"}
                </span>
                <span style={{ fontSize: "11px", color: "#888", fontWeight: 400 }}>
                  PDF · 최대 5MB
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </section>

          <section id="section-link" className="resume-section">
            <div className="resume-section-head">
              <h2 className="resume-section-title">링크</h2>
              <button className="resume-icon-btn" aria-label="링크 추가" onClick={() => { setEditLink(null); setLinkModalOpen(true); }}>
                <Plus size={18} />
              </button>
            </div>
            {links.length > 0 ? (
              links.map((link) => (
                <div key={link.id} className="resume-link-item">
                  <span className="resume-link-category">{link.category}</span>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="resume-link-url">{link.url}</a>
                  <span style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
                    <button className="resume-icon-btn" aria-label="수정" onClick={() => { setEditLink(link); setLinkModalOpen(true); }}>
                      <Pencil size={15} />
                    </button>
                    <button className="resume-icon-btn danger" aria-label="삭제" onClick={() => { if (confirm("이 링크를 삭제할까요?")) removeLink(link.id); }}>
                      <Trash2 size={15} />
                    </button>
                  </span>
                </div>
              ))
            ) : (
              <div className="resume-empty-section">
                <button className="resume-empty-btn" onClick={() => { setEditLink(null); setLinkModalOpen(true); }}>
                  <Plus size={16} /> 링크 추가하기
                </button>
              </div>
            )}
          </section>

          <div className="resume-bottom-save">
            <button className="resume-save-btn-full" onClick={handleSave}>저장하기</button>
          </div>
        </main>
      </div>

      {showPreview && (
        <div className="rp-modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rp-modal-header">
              <h2 className="rp-modal-title">이력서 미리보기</h2>
              <div className="rp-modal-actions">
                <button
                  className="resume-action-btn"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  <Download size={16} />
                  <span>{isDownloading ? "저장 중..." : "PDF 다운로드"}</span>
                </button>
                <button className="resume-action-btn" onClick={handlePrint}>
                  <Printer size={16} />
                  <span>인쇄</span>
                </button>
                
                <button className="rp-modal-close" onClick={() => setShowPreview(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="rp-modal-body">
              <ResumePreview
                ref={previewRef}
                name={name}
                birthDisplay={birthDisplay}
                jobDisplay={jobDisplay}
                phone={phone}
                email={emailLocal || email}
                intro={introLocal}
                coreCompetencies={coreLocal}
                careers={careers}
                educations={educations}
                skills={skills}
                languages={languages}
                experiences={experiences}
                links={links}
                portfolioUrl={portfolioUrl}
                portfolioFilename={portfolioFilename}
                avatarUrl={avatarUrl}
                resumeType={resumeType}
                officeJobAreas={officeJobAreas}
                skillAreas={skillAreas}
                certificates={certificates}
                workTypePrefer={workTypePrefer}
                regionPrefer={regionPrefer}
              />
            </div>
          </div>
        </div>
      )}

      <CareerEditModal
        isOpen={careerModalOpen}
        onClose={() => { setCareerModalOpen(false); setEditCareer(null); }}
        editTarget={editCareer}
      />
      <LinkModal
        isOpen={linkModalOpen}
        onClose={() => { setLinkModalOpen(false); setEditLink(null); }}
        editTarget={editLink}
      />
      <EducationModal
        isOpen={eduModalOpen}
        onClose={() => { setEduModalOpen(false); setEditEdu(null); }}
        editTarget={editEdu}
      />
      <LanguageModal
        isOpen={langModalOpen}
        onClose={() => { setLangModalOpen(false); setEditLang(null); }}
        editTarget={editLang}
      />
      <ExperienceModal
        isOpen={expModalOpen}
        onClose={() => { setExpModalOpen(false); setEditExp(null); }}
        editTarget={editExp}
      />
      <SkillModal
        isOpen={skillModalOpen}
        onClose={() => setSkillModalOpen(false)}
      />
      <CertificateModal
        isOpen={certModalOpen}
        onClose={() => { setCertModalOpen(false); setEditCert(null); }}
        editTarget={editCert}
      />
    </div>
  );
}
export default function ResumePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>로딩 중...</div>}>
      <ResumePageContent />
    </Suspense>
  );
}