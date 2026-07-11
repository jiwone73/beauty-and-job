"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, FileText, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useProfileStore } from "@/lib/store/profileStore";
import CareerEditModal from "@/components/profile/CareerEditModal";
import LinkModal from "@/components/profile/LinkModal";
import EducationModal from "@/components/profile/EducationModal";
import LanguageModal from "@/components/profile/LanguageModal";
import ExperienceModal from "@/components/profile/ExperienceModal";
import SkillModal from "@/components/profile/SkillModal";
import CertificateModal from "@/components/profile/CertificateModal";

const MAX_PORTFOLIO_SIZE = 5 * 1024 * 1024;

type Props = {
  resumeType: "office" | "salon";
  emailLocal: string;
  setEmailLocal: (v: string) => void;
  // 포트폴리오 상태/핸들러 (페이지에서 관리, 주입)
  portfolioUrl: string | null;
  portfolioFilename: string | null;
  isUploading: boolean;
  onPortfolioFile: (file: File) => void;
  onPortfolioDelete: () => void;
  // 첨부 이력서 상태/핸들러 (페이지에서 관리, 주입)
  resumeFileName: string | null;
  resumeFileSize: number | null;
  isResumeFileUploading: boolean;
  onResumeFile: (file: File) => void;
  onResumeFileDelete: () => void;
  onResumeFileOpen: () => void;
  resumeFileReadOnly?: boolean;
};

export default function ResumeEditor({
  resumeType,
  emailLocal,
  setEmailLocal,
  portfolioUrl,
  portfolioFilename,
  isUploading,
  onPortfolioFile,
  onPortfolioDelete,
  resumeFileName,
  resumeFileSize,
  isResumeFileUploading,
  onResumeFile,
  onResumeFileDelete,
  onResumeFileOpen,
  resumeFileReadOnly = false,
}: Props) {
  const {
    educations, careers, skills, languages, experiences, links,
    setEmail, removeLink, removeLanguage, removeExperience,
    removeEducation, removeCareer, certificates, removeCertificate,
  } = useProfileStore();

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
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isResumeDragOver, setIsResumeDragOver] = useState(false);
  const [showResumeFile, setShowResumeFile] = useState(false);
  useEffect(() => { setShowResumeFile(!!resumeFileName); }, [resumeFileName]);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleExpand = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onPortfolioFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onPortfolioFile(file);
  };

  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onResumeFile(file);
    if (resumeFileInputRef.current) resumeFileInputRef.current.value = "";
  };
  const handleResumeDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsResumeDragOver(true); };
  const handleResumeDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsResumeDragOver(false); };
  const handleResumeDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsResumeDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onResumeFile(file);
  };
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <>
      {/* 경력 */}
      <section id="section-career" className="resume-section">
        <div className="resume-section-head">
          <h2 className="resume-section-title">
            {resumeType === "office" ? "경력" : "경력 (근무 매장)"}
            {totalCareer && (
              <span style={{ marginLeft: "6px", fontSize: "12px", fontWeight: 400, color: "#888" }}>
                ({totalCareer})
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
            const open = !collapsed.has(key);
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

      {/* 학력 */}
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
            const open = !collapsed.has(key);
            return (
              <div key={edu.id} className="resume-edu-item">
                <div className="resume-career-head" onClick={() => toggleExpand(key)} style={{ cursor: "pointer" }}>
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

      {/* 스킬 (office 전용) */}
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

      {/* 어학 */}
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
                <p className="resume-item-text" style={{ fontWeight: 400, marginBottom: "4px", display: "flex", alignItems: "center" }}>
                  <span style={{ whiteSpace: "nowrap" }}>{lang.language}</span>
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
                {lang.test && <p className="resume-item-text" style={{ color: "#888" }}>{lang.test}</p>}
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

      {/* 자격증 */}
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
              const open = !collapsed.has(key);
              return (
                <div key={cert.id} className="resume-list-item">
                  <p className="resume-item-text" onClick={() => toggleExpand(key)} style={{ fontWeight: 400, marginBottom: open ? "4px" : 0, display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <ChevronDown size={16} style={{ flexShrink: 0, marginRight: "6px", color: "#bbb", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                    {cert.name}
                    {cert.issued_ym && (
                      <span style={{ marginLeft: "12px", fontWeight: 400, color: "#666" }}>{cert.issued_ym}</span>
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
                    <p className="resume-item-text" style={{ color: "#888", paddingLeft: "22px" }}>{cert.issuer}</p>
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

      {/* 활동/수상 */}
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
              const open = !collapsed.has(key);
              return (
                <div key={x.id} className="resume-list-item">
                  <p className="resume-item-text" onClick={() => toggleExpand(key)} style={{ fontWeight: 400, marginBottom: open ? "4px" : 0, display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <ChevronDown size={16} style={{ flexShrink: 0, marginRight: "6px", color: "#bbb", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                    {x.category && <span style={{ color: "#5f0080", marginRight: "8px" }}>[{x.category}]</span>}
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
                    <p className="resume-item-text" style={{ color: "#666", paddingLeft: "22px" }}>{x.description}</p>
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

      {/* 포트폴리오 */}
      <section id="section-portfolio" className="resume-section">
        <div className="resume-section-head">
          <h2 className="resume-section-title">포트폴리오</h2>
        </div>
        <p style={{ fontSize: "13px", color: "#888", marginBottom: "12px" }}>
          PDF 파일을 첨부해 주세요 (최대 5MB).
          {resumeType === "salon" && " 시술 사진을 모은 PDF를 추천드려요."}
        </p>
        {portfolioUrl ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "#f9f5fc", border: "1.5px solid #e0d0f0", borderRadius: "12px" }}>
            <FileText size={32} color="#5f0080" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "13px", fontWeight: 400, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {portfolioFilename || "포트폴리오.pdf"}
              </p>
              <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "#5f0080", textDecoration: "underline" }}>
                파일 열기
              </a>
            </div>
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #e0d0f0", background: "#fff", color: "#333", fontSize: "13px", fontWeight: 600, cursor: isUploading ? "not-allowed" : "pointer" }}>
              {isUploading ? "업로드 중..." : "교체"}
            </button>
            <button onClick={onPortfolioDelete} style={{ padding: "8px", borderRadius: "8px", border: "1px solid #e74c3c", background: "#fff", color: "#e74c3c", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="삭제">
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <div onClick={() => !isUploading && fileInputRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: `2px dashed ${isDragOver ? "#5f0080" : "#d0c0e0"}`, background: isDragOver ? "#f3e5f5" : "#fafafa", color: "#5f0080", fontSize: "13px", fontWeight: 400, cursor: isUploading ? "not-allowed" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", transition: "all 0.15s ease", textAlign: "center" }}>
            <Upload size={26} />
            <span>{isUploading ? "업로드 중..." : isDragOver ? "여기에 놓으세요" : "PDF를 끌어다 놓거나 클릭하여 업로드"}</span>
            <span style={{ fontSize: "11px", color: "#888", fontWeight: 400 }}>PDF · 최대 5MB</span>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileChange} style={{ display: "none" }} />
      </section>

      {/* 첨부 이력서 (본인이 작성한 이력서 파일) */}
      <section id="section-resume-file" className="resume-section">
        <div className="resume-section-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 className="resume-section-title" style={{ color: "#999" }}>첨부 이력서</h2>
          {!resumeFileReadOnly && (
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#999", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showResumeFile}
              onChange={(e) => {
                if (e.target.checked) {
                  setShowResumeFile(true);
                } else if (resumeFileName) {
                  onResumeFileDelete();
                } else {
                  setShowResumeFile(false);
                }
              }}
              style={{ accentColor: "#5f0080", width: "15px", height: "15px" }}
            />
            <span>사용</span>
          </label>
          )}
        </div>
        {resumeFileReadOnly ? (
          /* 지원 화면: 프로필에 저장된 파일 읽기 전용 표시 */
          resumeFileName ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "#f9f5fc", border: "1.5px solid #e0d0f0", borderRadius: "12px" }}>
              <FileText size={32} color="#5f0080" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "13px", fontWeight: 400, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {resumeFileName}
                </p>
                <button
                  onClick={onResumeFileOpen}
                  style={{ fontSize: "12px", color: "#5f0080", textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >
                  파일 열기{resumeFileSize ? ` · ${formatFileSize(resumeFileSize)}` : ""}
                </button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: "13px", color: "#aaa", padding: "12px 0" }}>
              첨부한 이력서 파일이 없어요. 프로필 &gt; 이력서에서 등록하면 지원 시 함께 전달돼요.
            </p>
          )
        ) : showResumeFile && (
          <>
        <p style={{ fontSize: "13px", color: "#888", marginBottom: "12px" }}>
          본인이 직접 작성한 이력서 파일을 첨부할 수 있어요 (선택, 최대 5MB). 지원 시 함께 전달돼요.
        </p>
        {resumeFileName ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", background: "#f9f5fc", border: "1.5px solid #e0d0f0", borderRadius: "12px" }}>
            <FileText size={32} color="#5f0080" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "13px", fontWeight: 400, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {resumeFileName}
              </p>
              <button
                onClick={onResumeFileOpen}
                style={{ fontSize: "12px", color: "#5f0080", textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              >
                파일 열기{resumeFileSize ? ` · ${formatFileSize(resumeFileSize)}` : ""}
              </button>
            </div>
            <button onClick={() => resumeFileInputRef.current?.click()} disabled={isResumeFileUploading} style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #e0d0f0", background: "#fff", color: "#333", fontSize: "13px", fontWeight: 600, cursor: isResumeFileUploading ? "not-allowed" : "pointer" }}>
              {isResumeFileUploading ? "업로드 중..." : "교체"}
            </button>
            <button onClick={onResumeFileDelete} style={{ padding: "8px", borderRadius: "8px", border: "1px solid #e74c3c", background: "#fff", color: "#e74c3c", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="삭제">
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <div onClick={() => !isResumeFileUploading && resumeFileInputRef.current?.click()} onDragOver={handleResumeDragOver} onDragLeave={handleResumeDragLeave} onDrop={handleResumeDrop}
            style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: `2px dashed ${isResumeDragOver ? "#5f0080" : "#d0c0e0"}`, background: isResumeDragOver ? "#f3e5f5" : "#fafafa", color: "#5f0080", fontSize: "13px", fontWeight: 400, cursor: isResumeFileUploading ? "not-allowed" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", transition: "all 0.15s ease", textAlign: "center" }}>
            <Upload size={26} />
            <span>{isResumeFileUploading ? "업로드 중..." : isResumeDragOver ? "여기에 놓으세요" : "PDF·DOC·DOCX를 끌어다 놓거나 클릭하여 업로드"}</span>
            <span style={{ fontSize: "11px", color: "#888", fontWeight: 400 }}>PDF, DOC, DOCX · 최대 5MB</span>
          </div>
        )}
        <input ref={resumeFileInputRef} type="file" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleResumeFileChange} style={{ display: "none" }} />
          </>
        )}
      </section>

      {/* 링크 */}
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
          <p style={{ fontSize: "13px", color: "#aaa", margin: "8px 0 0" }}>뷰티 콘텐츠나 운영 채널이 있다면 + 로 추가하세요.</p>
        )}
      </section>

      {/* 하위 모달들 */}
      <CareerEditModal isOpen={careerModalOpen} onClose={() => { setCareerModalOpen(false); setEditCareer(null); }} editTarget={editCareer} resumeType={resumeType} />
      <LinkModal isOpen={linkModalOpen} onClose={() => { setLinkModalOpen(false); setEditLink(null); }} editTarget={editLink} />
      <EducationModal isOpen={eduModalOpen} onClose={() => { setEduModalOpen(false); setEditEdu(null); }} editTarget={editEdu} />
      <LanguageModal isOpen={langModalOpen} onClose={() => { setLangModalOpen(false); setEditLang(null); }} editTarget={editLang} />
      <ExperienceModal isOpen={expModalOpen} onClose={() => { setExpModalOpen(false); setEditExp(null); }} editTarget={editExp} />
      <SkillModal isOpen={skillModalOpen} onClose={() => setSkillModalOpen(false)} />
      <CertificateModal isOpen={certModalOpen} onClose={() => { setCertModalOpen(false); setEditCert(null); }} editTarget={editCert} />
    </>
  );
}