"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Download, Eye, FileText, Pencil, Plus, Printer, Trash2, Upload, X } from "lucide-react";
import { useSignupStore } from "@/lib/store/signupStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { useAuthStore } from "@/lib/store/authStore";
import ResumePreview from "@/components/profile/ResumePreview";
import ResumeEditor from "@/components/profile/ResumeEditor";

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
  const [sectionsOpen, setSectionsOpen] = useState(true);
  useEffect(() => { setSectionsOpen(window.innerWidth >= 768); }, []);
  const [resumeType, setResumeType] = useState<"office" | "salon">("office");
  const [introLocal, setIntroLocal] = useState(intro);
  const [coreLocal, setCoreLocal] = useState(coreCompetencies);
  const [emailLocal, setEmailLocal] = useState(email);
  const [showPreview, setShowPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const [portfolioUrl, setPortfolioUrl] = useState<string | null>(null);
  const [addressDisplay, setAddressDisplay] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [portfolioFilename, setPortfolioFilename] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [resumeFileSize, setResumeFileSize] = useState<number | null>(null);
  const [isResumeFileUploading, setIsResumeFileUploading] = useState(false);
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
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleExpand = (key: string) =>
    setCollapsed((prev) => {
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
          if (res.data.resume_file_name) setResumeFileName(res.data.resume_file_name);
          if (res.data.resume_file_size) setResumeFileSize(res.data.resume_file_size);
          if (res.data.address_road) {
            setAddressDisplay(res.data.address_road + (res.data.address_detail ? ` ${res.data.address_detail}` : ""));
          }
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

  // 첨부 이력서 파일 업로드
  const processResumeFile = async (file: File) => {
    const token = localStorage.getItem("access_token");
    if (!token) { alert("로그인이 필요합니다."); return; }
    setIsResumeFileUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/users/me/resume-file", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!data.success) { alert(data.error?.message || "업로드에 실패했습니다."); return; }
      setResumeFileName(data.data.resume_file_name);
      setResumeFileSize(data.data.resume_file_size);
      alert("이력서 파일이 업로드되었습니다.");
    } catch (e) {
      console.error(e);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setIsResumeFileUploading(false);
    }
  };

  // 첨부 이력서 파일 삭제
  const handleDeleteResumeFile = async () => {
    if (!confirm("첨부한 이력서 파일을 삭제하시겠어요?")) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const res = await fetch("/api/users/me/resume-file", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) { alert("삭제에 실패했습니다."); return; }
      setResumeFileName(null);
      setResumeFileSize(null);
      alert("첨부 이력서가 삭제되었습니다.");
    } catch (e) {
      console.error(e);
    }
  };

  // 첨부 이력서 파일 열기 (비공개 버킷 -> signed URL)
  const handleOpenResumeFile = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const res = await fetch("/api/users/me/resume-file", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success || !data.data.preview_url) { alert("파일을 불러올 수 없습니다."); return; }
      window.open(data.data.preview_url, "_blank");
    } catch (e) {
      console.error(e);
      alert("파일을 여는 중 오류가 발생했습니다.");
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

  // 모바일 완성도 (사이드바와 동일 기준)
  const progressItems = resumeType === "office"
    ? [true, careers.length > 0, educations.length > 0, skills.length > 0, languages.length > 0, certificates.length > 0, experiences.length > 0, !!portfolioUrl, links.length > 0]
    : [true, careers.length > 0, educations.length > 0, languages.length > 0, certificates.length > 0, experiences.length > 0, !!portfolioUrl, links.length > 0];
  const progressRate = Math.round((progressItems.filter(Boolean).length / progressItems.length) * 100);

  return (
    <div className="resume-page">
      <header className="profile-header">
        <div className="profile-header-inner">
          <Link href="/" className="profile-logo">
            <Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} priority />
          </Link>
          <Link href="/jobs" className="profile-header-nav">채용공고</Link>
          <div className="resume-header-actions" style={{ marginLeft: "auto" }}>
            
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
      <div className="profile-tabs resume-nav">
        <button className="profile-tab" onClick={() => router.push("/profile")}>프로필</button>
        <button className="profile-tab active" onClick={() => router.push("/profile/resume")}>이력서</button>
        <button className="profile-tab" onClick={() => router.push("/profile?tab=applied")}>지원현황</button>
        <button className="profile-tab" onClick={() => router.push("/profile?tab=bookmarks")}>관심공고</button>
      </div>
      <div className="resume-subheader">
        <h1 className="resume-subheader-title">이력서 편집</h1>
      </div>

      <div className="resume-layout">
        <aside className="resume-sidebar">
          <button
            type="button"
            className="resume-sidebar-toggle"
            onClick={() => setSectionsOpen((o) => !o)}
            aria-expanded={sectionsOpen}
          >
            <span className="resume-sidebar-title">섹션 구성</span>
            <ChevronDown size={18} style={{ color: "#888", transform: sectionsOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {(() => {
            const sections = resumeType === "office" ? [
              { id: "basic", label: "기본 정보", done: true },
              { id: "career", label: "경력", done: careers.length > 0 },
              { id: "education", label: "학력", done: educations.length > 0 },
              { id: "skill", label: "스킬", done: skills.length > 0 },
              { id: "language", label: "어학", done: languages.length > 0 },
              { id: "certificate", label: "자격증", done: certificates.length > 0 },
              { id: "experience", label: "활동/수상", done: experiences.length > 0 },
              { id: "portfolio", label: "포트폴리오", done: !!portfolioUrl },
              { id: "link", label: "링크", done: links.length > 0 },
            ] : [
              { id: "basic", label: "기본 정보", done: true },
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
                {sectionsOpen && sections.map((sec) => (
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
          <div className="resume-mobile-progress">
            <div className="rmp-head">
              <span>완성도</span>
              <strong>{progressRate}%</strong>
            </div>
            <div className="rmp-bar">
              <div className="rmp-fill" style={{ width: `${progressRate}%` }} />
            </div>
          </div>
          <div style={{
            margin: "0 0 16px",
            padding: "16px 18px",
            background: "#fff",
            border: "1px solid #e0d0f0",
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
            <div className="resume-basic-info" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
              <div className="resume-name-block" style={{ flex: 1, minWidth: 0 }}>
                <h3 className="resume-name" style={{ fontSize: "15px", fontWeight: 400, marginTop: "16px" }}>{name || "이름"}</h3>
                <p className="resume-job-line">{birthDisplay} {birthDisplay && "·"} {jobDisplay}</p>
                <p className="resume-contact">{phone || ""} {phone && emailLocal ? "·" : ""} {emailLocal}</p>
                {addressDisplay && <p className="resume-contact" style={{ marginTop: "2px" }}>{addressDisplay}</p>}
              </div>
              {avatarUrl && (
                <div style={{ flexShrink: 0, width: "100px", height: "128px", borderRadius: "4px", overflow: "hidden", border: "1px solid #e0e0e0", background: "#f5f5f5", marginTop: "-22px" }}>
                  <img src={avatarUrl} alt="프로필" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
            </div>
          </section>

          

          <ResumeEditor
            resumeType={resumeType}
            emailLocal={emailLocal}
            setEmailLocal={setEmailLocal}
            portfolioUrl={portfolioUrl}
            portfolioFilename={portfolioFilename}
            isUploading={isUploading}
            onPortfolioFile={processFile}
            onPortfolioDelete={handleDeletePortfolio}
            resumeFileName={resumeFileName}
            resumeFileSize={resumeFileSize}
            isResumeFileUploading={isResumeFileUploading}
            onResumeFile={processResumeFile}
            onResumeFileDelete={handleDeleteResumeFile}
            onResumeFileOpen={handleOpenResumeFile}
          />

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
                addressDisplay={addressDisplay}
                jobDisplay={jobDisplay}
                phone={phone}
                email={emailLocal || email}
                intro=""
                coreCompetencies=""
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
