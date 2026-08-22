"use client";
import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, FileText, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useProfileStore, genId } from "@/lib/store/profileStore";
import CareerEditModal from "@/components/profile/CareerEditModal";
import EducationModal from "@/components/profile/EducationModal";
import LanguageModal from "@/components/profile/LanguageModal";
import ExperienceModal from "@/components/profile/ExperienceModal";
import SkillModal from "@/components/profile/SkillModal";
import CertificateModal from "@/components/profile/CertificateModal";
import { MAX_PHOTOS } from "@/lib/compressImage";
import { linkLabel, normalizeUrl, looksLikeUrl, MAX_LINKS } from "@/lib/linkLabel";
import PhotoLightbox from "@/components/profile/PhotoLightbox";
import PortfolioModal from "@/components/profile/PortfolioModal";

const MAX_PORTFOLIO_SIZE = 5 * 1024 * 1024;

type Props = {
  resumeType: "office" | "salon";
  emailLocal: string;
  setEmailLocal: (v: string) => void;
  // 포트폴리오 상태/핸들러 (페이지에서 관리, 주입)
  portfolioImages: { url: string; w?: number; h?: number }[];
  isUploading: boolean;
  onPortfolioFiles: (files: File[]) => void;
  onPortfolioDelete: (urls: string[]) => Promise<void>;
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

  const [확대, set확대] = useState<number | null>(null);
  // 펼침은 기본으로 열어 둔다 — 접혀 있으면 무엇을 넣어야 하는지 보이지 않는다.
  const [pf열림, setPf열림] = useState(true);
  const togglePf = () => setPf열림((v) => !v);
  const [모달, set모달] = useState<null | "photo" | "sns">(null);
  const 사진전부지우기 = async () => {
    if (!portfolioImages.length) return;
    if (!confirm(`사진 ${portfolioImages.length}장을 모두 지울까요?`)) return;
    await onPortfolioDelete(portfolioImages.map((i) => i.url));
  };
  const 링크전부지우기 = () => {
    if (!links.length) return;
    if (!confirm(`SNS 주소 ${links.length}개를 모두 지울까요?`)) return;
    links.forEach((l) => removeLink(l.id));
  };
  // 모달이 문제를 물어보고 화면에 알리게 한다 — 편집기가 오류 문구까지 들고 있으면
  // 두 곳에서 같은 상태를 나눠 갖게 된다.
  const 링크담기 = (t: string): string | null => {
    if (!looksLikeUrl(t)) return "주소가 맞는지 확인해 주세요. 예: instagram.com/내아이디";
    const 같은주소 = (u: string) => normalizeUrl(u).replace(/\/+$/, "").toLowerCase();
    if (links.some((l) => 같은주소(l.url) === 같은주소(t))) return "이미 넣은 주소예요.";
    addLink({ id: genId(), category: linkLabel(t), url: t });
    return null;
  };
  const 링크지우기 = (id: string) => {
    const 그것 = links.find((l) => l.id === id);
    if (!그것) return;
    if (!confirm(`${linkLabel(그것.url)} 주소를 지울까요?\n${그것.url}`)) return;
    removeLink(id);
  };
  const [careerModalOpen, setCareerModalOpen] = useState(false);
  const [editCareer, setEditCareer] = useState<any>(null);
  const [eduModalOpen, setEduModalOpen] = useState(false);
  const [editEdu, setEditEdu] = useState<any>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [더적기, set더적기] = useState(false);
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
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: isEntryLevel ? "#582681" : "#555", fontWeight: isEntryLevel ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap", border: "none", background: "transparent" }}>
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
                style={{ accentColor: "#582681", width: 15, height: 15 }} />
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
                <div className="resume-career-head" onClick={() => { setEditCareer(c); setCareerModalOpen(true); }} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
                  <ChevronDown size={16} onClick={(e) => { e.stopPropagation(); toggleExpand(key); }} style={{ cursor: "pointer", flexShrink: 0, marginRight: "6px", color: "#bbb", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                  <strong>{c.company}</strong>
                  {!open && (
                    <span style={{ marginLeft: "8px", fontSize: "13px", fontWeight: 400, color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.startDate} - {c.endDate}
                    </span>
                  )}
                  <span style={{ marginLeft: "auto", display: "flex", gap: "4px", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
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
        {careerModalOpen && (
          <CareerEditModal inline isOpen={careerModalOpen} onClose={() => { setCareerModalOpen(false); setEditCareer(null); }} editTarget={editCareer} resumeType={resumeType} />
        )}
        {!careerModalOpen && careers.length === 0 && !isEntryLevel && (
          <button type="button" className="resume-blank" onClick={() => { setEditCareer(null); setCareerModalOpen(true); }}>
            <span className="resume-blank-fields">매장명 <i>*</i> │ 근무 기간 <i>*</i> │ 직급</span>
          </button>
        )}
      </section>

      {/* 스킬 — 매장도 쓴다. 커트·펌·염색 같은 시술 스킬이 곧 실력이라
          오히려 매장 쪽이 더 중요하다. SkillModal 이 매장직 시술 사전을
          이미 갖고 있는데 이 칸만 본사에 잠겨 있었다. */}
      {true && (
        <section id="section-skill" className="resume-section">
          <div className="resume-section-head">
            <h2 className="resume-section-title">시술 스킬</h2>
            <button className="resume-icon-btn" aria-label="시술 스킬 추가" onClick={() => setSkillModalOpen(true)}>
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
          {skillModalOpen && (
            <SkillModal inline isOpen={skillModalOpen} onClose={() => setSkillModalOpen(false)} />
          )}
          {!skillModalOpen && skills.length === 0 && (
            <button type="button" className="resume-blank" onClick={() => { setSkillModalOpen(true); }}>
              <span className="resume-blank-fields">커트 · 펌 · 염색 · 클리닉 …</span>
            </button>
          )}
        </section>
      )}

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
                  <p className="resume-item-text" onClick={() => { setEditCert(cert); setCertModalOpen(true); }} style={{ fontWeight: 400, marginBottom: open ? "4px" : 0, display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <ChevronDown size={16} onClick={(e) => { e.stopPropagation(); toggleExpand(key); }} style={{ cursor: "pointer", flexShrink: 0, marginRight: "6px", color: "#bbb", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                    {cert.name}
                    {cert.issued_ym && (
                      <span style={{ marginLeft: "12px", fontWeight: 400, color: "#666" }}>{cert.issued_ym}</span>
                    )}
                    <span style={{ marginLeft: "auto", display: "flex", gap: "4px", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
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
        {certModalOpen && (
          <CertificateModal inline isOpen={certModalOpen} onClose={() => { setCertModalOpen(false); setEditCert(null); }} editTarget={editCert} />
        )}
        {!certModalOpen && certificates.length === 0 && (
          <button type="button" className="resume-blank" onClick={() => { setEditCert(null); setCertModalOpen(true); }}>
            <span className="resume-blank-fields">자격증명 <i>*</i> │ 취득 년월 <i>*</i></span>
          </button>
        )}
      </section>

      {/* 어학 — 살롱에서 실제로 보는 칸이다. 외국인 손님 응대가 되는 사람을
          찾는 매장이 많다. 대신 시험명·점수는 받지 않는다. 손님 앞에서 말이
          되느냐가 전부라 상·중·하면 충분하다. */}
      <section id="section-language" className="resume-section">
        <div className="resume-section-head">
          <h2 className="resume-section-title">어학</h2>
          {languages.length > 0 && !langOpen && (
            <button className="resume-icon-btn" aria-label="어학 추가" onClick={() => { setEditLang(null); setLangOpen(true); }}>
              <Plus size={18} />
            </button>
          )}
        </div>
        {languages.length > 0 && (
          <div className="resume-list">
            {languages.map((lang) => (
              <div key={lang.id} className="resume-list-item">
                <p className="resume-item-text" onClick={() => { setEditLang(lang); setLangOpen(true); }}
                  style={{ fontWeight: 400, marginBottom: "4px", display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <span style={{ whiteSpace: "nowrap" }}>{lang.language}</span>
                  <span style={{ marginLeft: "12px", fontWeight: 400, color: "#666" }}>{lang.level}</span>
                  <span style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
                    <button className="resume-icon-btn danger" aria-label="삭제" onClick={() => { if (confirm("이 어학을 삭제할까요?")) removeLanguage(lang.id); }}>
                      <Trash2 size={15} />
                    </button>
                  </span>
                </p>
              </div>
            ))}
          </div>
        )}
        {/* 열지 않아도 무엇을 넣는 칸인지 보이게 빈 자리를 그려 둔다. */}
        {!langOpen && languages.length === 0 && (
          <button type="button" className="resume-blank" onClick={() => { setEditLang(null); setLangOpen(true); }}>
            <span className="resume-blank-fields">언어 <i>*</i> │ 수준 <i>*</i></span>
          </button>
        )}
        {langOpen && (
          <LanguageModal inline isOpen={langOpen} onClose={() => { setLangOpen(false); setEditLang(null); }} editTarget={editLang} />
        )}
      </section>

      {/* 포트폴리오 — 사진과 SNS 를 각각 한 줄로 둔다. 다른 항목(경력·학력)과 같은
          모양이라 손이 같은 자리로 간다. 비어 있으면 ＋, 내용이 있으면 ✎·🗑. */}
      <section id="section-portfolio" className="resume-section">
        <div className="resume-section-head" onClick={() => togglePf()} style={{ cursor: "pointer" }}>
          <h2 className="resume-section-title">포트폴리오</h2>
          <ChevronDown size={18} style={{ color: "#bbb", transform: pf열림 ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </div>
        {pf열림 && (
          <>
            {/* ── 사진 줄 ── */}
            <div className="resume-career-head" style={{ display: "flex", alignItems: "center" }}>
              <strong style={{ fontWeight: 400 }}>사진</strong>
              {portfolioImages.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 13, color: "#888" }}>{portfolioImages.length}장</span>
              )}
              <span style={{ marginLeft: "auto", display: "flex", gap: 4, flexShrink: 0 }}>
                {portfolioImages.length === 0 ? (
                  <button className="resume-icon-btn" aria-label="사진 추가" onClick={() => set모달("photo")}>
                    <Plus size={18} />
                  </button>
                ) : (
                  <>
                    <button className="resume-icon-btn" aria-label="사진 편집" onClick={() => set모달("photo")}>
                      <Pencil size={15} />
                    </button>
                    <button className="resume-icon-btn danger" aria-label="사진 전체 삭제" onClick={사진전부지우기}>
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </span>
            </div>
            {portfolioImages.length > 0 && (
              <>
                <div className="portfolio-grid">
                  {portfolioImages.map((img, idx) => {
                    return (
                      <div key={img.url} className="portfolio-cell">
                        <img src={img.url} alt="" loading="lazy"
                          onClick={() => set확대(idx)} style={{ cursor: "zoom-in" }} />
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── SNS 줄 ── */}
            <div className="resume-career-head" style={{ display: "flex", alignItems: "center", marginTop: 14 }}>
              <strong style={{ fontWeight: 400 }}>SNS</strong>
              {links.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 13, color: "#888" }}>{links.length}개</span>
              )}
              <span style={{ marginLeft: "auto", display: "flex", gap: 4, flexShrink: 0 }}>
                {links.length === 0 ? (
                  <button className="resume-icon-btn" aria-label="SNS 추가" onClick={() => set모달("sns")}>
                    <Plus size={18} />
                  </button>
                ) : (
                  <>
                    <button className="resume-icon-btn" aria-label="SNS 편집" onClick={() => set모달("sns")}>
                      <Pencil size={15} />
                    </button>
                    <button className="resume-icon-btn danger" aria-label="SNS 전체 삭제" onClick={링크전부지우기}>
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </span>
            </div>
            {links.map((link) => (
              <div key={link.id} className="resume-link-item">
                <span className="resume-link-category">{linkLabel(link.url)}</span>
                <a href={normalizeUrl(link.url)} target="_blank" rel="noopener noreferrer" className="resume-link-url">{link.url}</a>
              </div>
            ))}
          </>
        )}
        {모달 !== null && (
          <PortfolioModal inline isOpen mode={모달} resumeType={resumeType}
            onClose={() => set모달(null)} images={portfolioImages} links={links} isUploading={isUploading}
            onFiles={onPortfolioFiles} onDeletePhotos={onPortfolioDelete} onAddLink={링크담기} onDeleteLink={링크지우기} />
        )}
      </section>

      {/* 학력·활동수상은 접어 둔다. 살롱 채용에서 이 둘을 보는 곳은 드문데
          칸이 늘면 쓰다 마는 사람이 생긴다. 이미 채운 사람과 본사 이력서에는
          그대로 펼쳐 둔다. 어학은 접지 않는다 — 외국인 손님 응대 때문에
          실제로 보는 칸이다. */}
      {!더적기 && resumeType !== "office" && educations.length === 0 && experiences.length === 0 ? (
        <button type="button" className="resume-more-open" onClick={() => set더적기(true)}>
          학력 · 활동/수상 더 적기
        </button>
      ) : (
        <>

      {/* 학력 */}
      <section id="section-education" className="resume-section">
        <div className="resume-section-head">
          <h2 className="resume-section-title">
            학력
            {/* 매장 이력서에서는 학력을 묻지 않는다 — 미용실·네일숍이 보는 것은
                학교가 아니라 경력과 작업물이고, 별표를 붙여 두면 채우지 못한
                사람이 이력서를 미완성으로 여기고 만다. */}
            {resumeType === "office" && (
              <span style={{ color: "#e74c3c", marginLeft: "3px" }}>*</span>
            )}
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
                <div className="resume-career-head" onClick={() => { setEditEdu(edu); setEduModalOpen(true); }} style={{ cursor: "pointer" }}>
                  <ChevronDown size={16} onClick={(e) => { e.stopPropagation(); toggleExpand(key); }} style={{ cursor: "pointer", flexShrink: 0, marginRight: "6px", color: "#bbb", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                  <strong>{edu.school}</strong>
                  {!open && (
                    <span style={{ marginLeft: "8px", fontSize: "13px", fontWeight: 400, color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {edu.startDate} - {edu.endDate}
                    </span>
                  )}
                  <span style={{ marginLeft: "auto", display: "flex", gap: "4px", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
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
        {eduModalOpen && (
          <EducationModal inline isOpen={eduModalOpen} onClose={() => { setEduModalOpen(false); setEditEdu(null); }} editTarget={editEdu} />
        )}
        {!eduModalOpen && educations.length === 0 && (
          <button type="button" className="resume-blank" onClick={() => { setEditEdu(null); setEduModalOpen(true); }}>
            <span className="resume-blank-fields">학교명 <i>*</i> │ 전공 │ 졸업 상태 <i>*</i></span>
          </button>
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
                  <p className="resume-item-text" onClick={() => { setEditExp(x); setExpModalOpen(true); }} style={{ fontWeight: 400, marginBottom: open ? "4px" : 0, display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <ChevronDown size={16} onClick={(e) => { e.stopPropagation(); toggleExpand(key); }} style={{ cursor: "pointer", flexShrink: 0, marginRight: "6px", color: "#bbb", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                    {x.category && <span style={{ color: "#582681", marginRight: "8px" }}>[{x.category}]</span>}
                    {x.title}
                    <span style={{ marginLeft: "auto", display: "flex", gap: "4px", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
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
        {expModalOpen && (
          <ExperienceModal inline isOpen={expModalOpen} onClose={() => { setExpModalOpen(false); setEditExp(null); }} editTarget={editExp} />
        )}
        {!expModalOpen && experiences.length === 0 && (
          <button type="button" className="resume-blank" onClick={() => { setEditExp(null); setExpModalOpen(true); }}>
            <span className="resume-blank-fields">활동·수상명 <i>*</i> │ 시기</span>
          </button>
        )}
      </section>

        </>
      )}


      {확대 !== null && (
        <PhotoLightbox images={portfolioImages} startAt={확대} onClose={() => set확대(null)} />
      )}


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
                style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "none", background: "#582681", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
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