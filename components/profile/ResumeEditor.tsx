"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, FileText, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useProfileStore, genId } from "@/lib/store/profileStore";
import CareerEditModal from "@/components/profile/CareerEditModal";
import EducationModal from "@/components/profile/EducationModal";
import LanguageModal from "@/components/profile/LanguageModal";
import ExperienceModal from "@/components/profile/ExperienceModal";
import SkillModal from "@/components/profile/SkillModal";
import CertificateModal from "@/components/profile/CertificateModal";
import { MAX_PHOTOS } from "@/lib/compressImage";
import { linkLabel, normalizeUrl, looksLikeUrl, MAX_LINKS } from "@/lib/linkLabel";

const MAX_PORTFOLIO_SIZE = 5 * 1024 * 1024;

type Props = {
  resumeType: "office" | "salon";
  emailLocal: string;
  setEmailLocal: (v: string) => void;
  // 포트폴리오 상태/핸들러 (페이지에서 관리, 주입)
  portfolioImages: { url: string; w?: number; h?: number }[];
  isUploading: boolean;
  onPortfolioFiles: (files: File[]) => void;
  onPortfolioDelete: (url: string) => void;
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
  portfolioImages,
  isUploading,
  onPortfolioFiles,
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
    setEmail, addLink, removeLink, removeLanguage, removeExperience,
    removeEducation, removeCareer, certificates, removeCertificate,
    isEntryLevel, setIsEntryLevel,
    entryExperience, setEntryExperience,
  } = useProfileStore();

  // 신입 전환 확인 모달(경력이 있는 상태에서 신입으로 바꿀 때)
  const [entryConfirmOpen, setEntryConfirmOpen] = useState(false);

  // 신입 경험 텍스트필드: 내용에 맞춰 높이 자동 확장(반응형)
  const entryRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = entryRef.current;
    if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
  }, [isEntryLevel, entryExperience]);

  const [careerModalOpen, setCareerModalOpen] = useState(false);
  const [editCareer, setEditCareer] = useState<any>(null);
  const [링크입력, set링크입력] = useState("");
  const [링크오류, set링크오류] = useState("");
  const 링크담기 = () => {
    const t = 링크입력.trim();
    if (!t) return;
    if (!looksLikeUrl(t)) { set링크오류("주소가 맞는지 확인해 주세요. 예: instagram.com/내아이디"); return; }
    // 같은 곳을 두 번 걸면 매장은 두 번 눌러 보고 같은 화면을 만난다.
    // 앞에 https 가 붙었는지, 끝에 / 가 있는지 같은 차이는 같은 주소로 본다.
    const 같은주소 = (u: string) => normalizeUrl(u).replace(/\/+$/, "").toLowerCase();
    if (links.some((l) => 같은주소(l.url) === 같은주소(t))) {
      set링크오류("이미 넣은 주소예요."); return;
    }
    // 분류는 묻지 않고 주소에서 알아낸다. 저장은 사용자가 붙여넣은 그대로 두고,
    // 열 때만 https 를 채운다 — 화면에 보이는 값과 저장된 값이 같아야 헷갈리지 않는다.
    addLink({ id: genId(), category: linkLabel(t), url: t });
    set링크입력(""); set링크오류("");
  };
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
    const files = Array.from(e.target.files || []);
    if (files.length) onPortfolioFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) onPortfolioFiles(files);
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
            경력
            <span style={{ color: "#e74c3c", marginLeft: "3px" }}>*</span>
            {!isEntryLevel && totalCareer && (
              <span style={{ marginLeft: "6px", fontSize: "13px", fontWeight: 400, color: "#888" }}>
                ({totalCareer})
              </span>
            )}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: isEntryLevel ? "#5f0080" : "#555", fontWeight: isEntryLevel ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap", border: "none", background: "transparent" }}>
              <input type="checkbox" checked={isEntryLevel}
                onChange={(e) => {
                  if (e.target.checked) {
                    // 경력이 있는데 신입으로 바꾸면 확인 모달, 없으면 바로 적용
                    if (careers.length > 0) setEntryConfirmOpen(true);
                    else setIsEntryLevel(true);
                  } else {
                    setIsEntryLevel(false);
                  }
                }}
                style={{ accentColor: "#5f0080", width: 15, height: 15 }} />
              신입
            </label>
            <button className="resume-icon-btn" aria-label="경력 추가" disabled={isEntryLevel}
              onClick={() => { if (isEntryLevel) return; setEditCareer(null); setCareerModalOpen(true); }}
              style={{ opacity: isEntryLevel ? 0.4 : 1, cursor: isEntryLevel ? "not-allowed" : "pointer" }}>
              <Plus size={18} />
            </button>
          </div>
        </div>
        {isEntryLevel && (
          <textarea
            ref={entryRef}
            value={entryExperience}
            onChange={(e) => setEntryExperience(e.target.value)}
            placeholder="아카데미·실습, 자격증, 대회·아르바이트 등 뷰티 직무와 이어지는 경험을 구체적으로 적어 보세요"
            rows={2}
            style={{
              width: "100%", display: "block", marginTop: 8, padding: "12px 14px", borderRadius: 10,
              border: "1px solid #e5e5e5", fontSize: 14, lineHeight: 1.6, color: "#1a1a1a",
              resize: "none", overflow: "hidden", minHeight: 72,
              boxSizing: "border-box", fontFamily: "inherit",
            }}
          />
        )}
        {isEntryLevel ? null : careers.length === 0 ? null : (
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
          <h2 className="resume-section-title">
            학력
            <span style={{ color: "#e74c3c", marginLeft: "3px" }}>*</span>
          </h2>
          <button className="resume-icon-btn" aria-label="학교 추가" onClick={() => { setEditEdu(null); setEduModalOpen(true); }}>
            <Plus size={18} />
          </button>
        </div>
        {educations.length === 0 ? (
          null
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
            null
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
          null
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
          null
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
          null
        )}
      </section>

      {/* 포트폴리오 */}
      <section id="section-portfolio" className="resume-section">
        <div className="resume-section-head">
          <h2 className="resume-section-title">포트폴리오</h2>
        </div>
        {/* 특정 서비스 이름은 안내문에서 뺐다. 남의 간판을 대신 달아 줄 일이 아니고,
            무엇을 넣으라는 힌트는 아래 입력칸의 예시 글로 충분하다. */}
        <p style={{ fontSize: "13px", color: "#888", marginBottom: "12px" }}>
          작업물을 보여줄 수 있는 것이면 무엇이든 좋아요. 매장이 가장 눈여겨보는 항목입니다.
        </p>
        {portfolioImages.length > 0 && (
          <div className="portfolio-grid">
            {portfolioImages.map((img) => (
              <div key={img.url} className="portfolio-cell">
                {/* 목록은 4:3 로 잘라 보여준다 — 칸 높이가 들쭉날쭉하면 읽기 어렵다.
                    자르는 것은 보여줄 때뿐이고, 저장된 사진은 원본 비율 그대로다. */}
                <img src={img.url} alt="" loading="lazy" />
                <button
                  type="button"
                  className="portfolio-del"
                  aria-label="사진 삭제"
                  onClick={() => onPortfolioDelete(img.url)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {portfolioImages.length < MAX_PHOTOS && (
          <div onClick={() => !isUploading && fileInputRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            style={{ width: "100%", marginTop: portfolioImages.length ? "10px" : 0, padding: "12px 16px", borderRadius: "12px", border: `2px dashed ${isDragOver ? "#5f0080" : "#d0c0e0"}`, background: isDragOver ? "#f3e5f5" : "#fafafa", color: "#5f0080", fontSize: "13px", fontWeight: 400, cursor: isUploading ? "not-allowed" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", transition: "all 0.15s ease", textAlign: "center" }}>
            <Upload size={26} />
            <span>{isUploading ? "올리는 중..." : isDragOver ? "여기에 놓으세요" : "사진을 끌어다 놓거나 눌러서 고르세요"}</span>
            <span style={{ fontSize: "11px", color: "#888", fontWeight: 400 }}>
              최대 {MAX_PHOTOS}장 · 지금 {portfolioImages.length}장 · 올릴 때 자동으로 줄여요
            </span>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: "none" }} />

        {/* 작업물이 있는 곳 주소. 예전엔 ＋ → 모달 → 분류 고르기 → 주소 입력 → 저장으로
            네 단계였다. 매장이 가장 눈여겨보는 항목인데 이력서에서 넣기가 가장 번거로웠다.
            칸에 바로 붙여넣게 한다. 어디인지는 주소를 보고 알아내므로 고를 것이 없다. */}
        <div style={{ marginTop: 14 }}>
          {links.map((link) => (
            <div key={link.id} className="resume-link-item">
              <span className="resume-link-category">{linkLabel(link.url)}</span>
              <a href={normalizeUrl(link.url)} target="_blank" rel="noopener noreferrer" className="resume-link-url">{link.url}</a>
              <button className="resume-icon-btn danger" aria-label="삭제" style={{ marginLeft: "auto" }}
                onClick={() => { if (confirm("이 링크를 지울까요?")) removeLink(link.id); }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {links.length < MAX_LINKS && (
            <>
              {/* '추가' 버튼을 눈에 보이게 둔다. 칸이 조용히 다시 나타나는 것만으로는
                  여러 개 넣을 수 있다는 걸 알아채기 어렵다. */}
              <div style={{ display: "flex", gap: 6, marginTop: links.length ? 8 : 0 }}>
                <input
                  className="cv-input"
                  style={{ flex: 1, minWidth: 0, marginTop: 0 }}
                  placeholder="instagram.com/내아이디 · youtube.com/@내채널"
                  value={링크입력}
                  onChange={(e) => { set링크입력(e.target.value); if (링크오류) set링크오류(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); 링크담기(); } }}
                  inputMode="url"
                />
                <button type="button" className="profile-select-btn accent" style={{ flexShrink: 0 }} onClick={링크담기}>
                  추가
                </button>
              </div>
            </>
          )}
          <p style={{ fontSize: 12, color: 링크오류 ? "#c0392b" : "#aaa", marginTop: 6 }}>
            {링크오류 || `여러 개 넣을 수 있어요 · 최대 ${MAX_LINKS}개${links.length ? ` (지금 ${links.length}개)` : ""}`}
          </p>
        </div>
      </section>

      {/* 첨부 이력서 (본인이 작성한 이력서 파일) — 현재 숨김 처리(에디터·지원 모달 공통) */}
      <section id="section-resume-file" className="resume-section" style={{ display: "none" }}>
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


      {/* 하위 모달들 */}
      <CareerEditModal isOpen={careerModalOpen} onClose={() => { setCareerModalOpen(false); setEditCareer(null); }} editTarget={editCareer} resumeType={resumeType} />
      <EducationModal isOpen={eduModalOpen} onClose={() => { setEduModalOpen(false); setEditEdu(null); }} editTarget={editEdu} />
      <LanguageModal isOpen={langModalOpen} onClose={() => { setLangModalOpen(false); setEditLang(null); }} editTarget={editLang} />
      <ExperienceModal isOpen={expModalOpen} onClose={() => { setExpModalOpen(false); setEditExp(null); }} editTarget={editExp} />
      <SkillModal isOpen={skillModalOpen} onClose={() => setSkillModalOpen(false)} />
      <CertificateModal isOpen={certModalOpen} onClose={() => { setCertModalOpen(false); setEditCert(null); }} editTarget={editCert} />

      {/* 신입 전환 확인 모달 */}
      {entryConfirmOpen && (
        <div
          onClick={() => setEntryConfirmOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 20, padding: "28px 24px 20px", boxShadow: "0 12px 40px rgba(0,0,0,0.18)", textAlign: "center" }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", margin: "0 0 12px" }}>
              신입으로 전환할까요?
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.65, color: "#555", margin: "0 0 22px" }}>
              전환하면 등록한 경력은 기업 담당자에게 보이지 않고, 신입용 <b>직무 관련 경험</b>만 이력서에 노출돼요. 경력 정보는 삭제되지 않으니 언제든 다시 경력으로 되돌릴 수 있어요.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setEntryConfirmOpen(false)}
                style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid #ddd", background: "#fff", color: "#555", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                취소
              </button>
              <button
                onClick={() => { setIsEntryLevel(true); setEntryConfirmOpen(false); }}
                style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "none", background: "#5f0080", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}