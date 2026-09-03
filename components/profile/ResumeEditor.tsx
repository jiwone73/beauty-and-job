"use client";
import { useState, useRef, useEffect } from "react";
import { AlertCircle, Award, Building2, Link as LinkIcon, Check, ChevronDown, FileText, Globe, GraduationCap, Image as ImageIcon, Pencil, Plus, Sparkles, Trash2, Trophy, Upload, X } from "lucide-react";
import { useProfileStore, genId } from "@/lib/store/profileStore";
import { InlineText, InlinePick, InlineYM, InlineSuggest } from "@/components/profile/inline/InlineField";
import { SNS찾기 } from "@/lib/snsPresets";
import { 시험읽기, 시험쓰기 } from "@/lib/languageTest";
import SkillModal from "@/components/profile/SkillModal";
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
  /** 사진을 바꿀 수 없는 화면(지원서 사본)에서 켠다. 사진은 바로 서버로
      올라가 기본 이력서를 바꾸므로, 사본을 고치는 자리에서는 손대지 않는다. */
  portfolioReadOnly?: boolean;
  /** 작성 완료를 누른 뒤 아직 못 채운 곳. 해당 칸·항목 위에 붙는다. */
  흠?: { 어디: string; 누구?: string; 말: string }[];
};

// 고를 것이 정해진 칸들. 적게 하는 대신 고르게 하면 빠르고 표기가 통일된다.
const 살롱직급 = ["인턴", "스탭", "디자이너", "아티스트", "실장", "원장"];
const 졸업상태 = ["졸업", "재학", "휴학", "중퇴", "수료"];
// 원티드 본사 경력은 재직 형태를 필수로 묻는다. 살롱은 직급이 그 자리다.
const 재직형태 = ["정규직", "계약직", "인턴", "프리랜서", "파견직", "아르바이트"];
// 한국어를 맨 앞에 둔다. 살롱에는 외국 국적 종사자가 적지 않고, 그들에게는
// 한국어 수준이 곧 채용 조건이다. 정작 목록에 없어 적을 자리가 없었다.
const 언어들 = ["한국어", "영어", "중국어", "일본어", "베트남어", "태국어", "러시아어", "몽골어", "우즈베크어", "스페인어", "프랑스어"];
const 수준들 = ["능숙하게 소통", "일상 회화 가능", "간단한 표현"];
const 활동종류 = ["수상", "교육", "봉사", "동아리", "기타"];

// 못 채운 곳을 그 자리에 적는다. 알림창처럼 사라지지 않아 고치는 동안 계속 보인다.
function 흠줄({ 말들 }: { 말들: string[] }) {
  if (!말들.length) return null;
  return (
    <>
      {말들.map((m) => (
        <p key={m} className="if-alert"><AlertCircle size={14} />{m}</p>
      ))}
    </>
  );
}

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
  portfolioReadOnly = false,
  흠 = [],
}: Props) {
  const {
    educations, careers, skills, languages, experiences, links,
    setEmail, addLink, removeLink, removeLanguage, removeExperience,
    removeEducation, removeCareer, certificates, removeCertificate,
    addCareer, updateCareer,
    addEducation, updateEducation,
    addLanguage, updateLanguage,
    addExperience, updateExperience,
    addCertificate, updateCertificate,
    updateLink,
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
  const 링크담기 = (t: string, 이름?: string): string | null => {
    if (!looksLikeUrl(t)) return "주소가 맞는지 확인해 주세요. 예: instagram.com/내아이디";
    const 같은주소 = (u: string) => normalizeUrl(u).replace(/\/+$/, "").toLowerCase();
    if (links.some((l) => 같은주소(l.url) === 같은주소(t))) return "이미 넣은 주소예요.";
    // 이름을 안 적으면 주소에서 알아낸 것을 쓴다(instagram.com → 인스타그램).
    addLink({ id: genId(), category: (이름 || "").trim() || linkLabel(t), url: t });
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
  const 본사냐 = resumeType === "office";
  // 칸 전체에 붙는 흠(항목 없음)과 항목 하나에 붙는 흠을 갈라 뽑는다.
  const 칸흠 = (어디: string) => 흠.filter((h) => h.어디 === 어디 && !h.누구).map((h) => h.말);
  const 항목흠 = (어디: string, 누구: string) => 흠.filter((h) => h.어디 === 어디 && h.누구 === 누구).map((h) => h.말);
  const [더적기, set더적기] = useState(false);
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
    if (files.length && !portfolioReadOnly) onPortfolioFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length && !portfolioReadOnly) onPortfolioFiles(files);
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
            <Building2 size={16} className="resume-section-icon" />
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
              onClick={() => { if (isEntryLevel) return; addCareer({
                  id: genId(), company: "", department: "", position: "",
                  startDate: "", endDate: "", isVerified: false, description: "",
                }); }}
              style={{ opacity: isEntryLevel ? 0.4 : 1, cursor: isEntryLevel ? "not-allowed" : "pointer" }}>
              <Plus size={18} />
            </button>
          </div>
        </div>
        <흠줄 말들={칸흠("career")} />
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
        {/* 칸마다 무엇을 적는지 회색으로 적어 둔다. 누르면 그 칸 하나만 열린다 —
            매장명 하나 고치자고 기간·직급까지 다시 마주할 이유가 없다. */}
        {!isEntryLevel && careers.map((c, i) => (
          <div key={c.id} className="if-row if-row-plain">
            <div className="if-row-body">
              <흠줄 말들={항목흠("career", c.id)} />
              <div className="if-line if-line-head">
                <InlineText value={c.company} placeholder={본사냐 ? "회사명" : "매장명"} wide
                  onSave={(v) => updateCareer(c.id, { ...c, company: v })} />
                {/* 지금 다니는 곳(가장 최근 경력)만 가릴 수 있게 한다. 이 판은
                    좁아서 원장이 인재검색에서 보는 것이 실제 공포다. 끄면
                    미리보기·인재검색에 ○○○ 으로 나가고, 지원한 곳에는 그대로
                    보인다 — 거기는 내가 스스로 문을 연 자리다. */}
                {i === 0 && (
                  <label className="career-open" title={c.companyPublic === false ? "매장 이름을 가리는 중" : "매장 이름을 보이는 중"}>
                    <input type="checkbox" checked={c.companyPublic !== false}
                      onChange={(e) => updateCareer(c.id, { ...c, companyPublic: e.target.checked })} />
                    {c.companyPublic === false ? "비공개" : "공개"}
                  </label>
                )}
                {i === 0 && c.companyPublic === false && (
                  <span className="career-open-note">(지원 시에만 공개)</span>
                )}
              </div>
              <div className="if-line">
                <InlineYM value={c.startDate} required
                  onSave={(v) => updateCareer(c.id, { ...c, startDate: v })} />
                <span className="if-sep">–</span>
                <InlineYM value={c.endDate} placeholder="재직 중"
                  onSave={(v) => updateCareer(c.id, { ...c, endDate: v })} />
                <span className="if-bar">│</span>
                {/* 살롱 직급은 정해져 있어 고르게 하고, 본사 직책은 회사마다
                    달라 적게 둔다. */}
                {본사냐 ? (
                  <>
                    <InlinePick value={c.department} placeholder="근무 형태" required options={재직형태}
                      onSave={(v) => updateCareer(c.id, { ...c, department: v })} />
                    <span className="if-bar">│</span>
                    <InlineText value={c.position} placeholder="맡은 일 · 직책"
                      onSave={(v) => updateCareer(c.id, { ...c, position: v })} />
                  </>
                ) : (
                  <InlinePick value={c.position} placeholder="직급" options={살롱직급}
                    onSave={(v) => updateCareer(c.id, { ...c, position: v })} />
                )}
              </div>
              <div className="if-line">
                {/* 본사 지원서는 성과를 적는 자리가 곧 심사 대상이라 필수다.
                    살롱은 시술 스킬과 사진이 그 몫을 해서 선택으로 둔다. */}
                <InlineText value={c.description} wide 여러줄 required={본사냐}
                  placeholder={본사냐 ? "주요성과" : "어떤 시술을 맡았는지 적어 보세요"}
                  onSave={(v) => updateCareer(c.id, { ...c, description: v })} />
              </div>
            </div>
            <button className="if-row-del" aria-label="삭제"
              onClick={() => { if (confirm("이 경력을 삭제할까요?")) removeCareer(c.id); }}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </section>

      {/* 학력 */}
      <section id="section-education" className="resume-section">
        <div className="resume-section-head">
          <h2 className="resume-section-title">
            <GraduationCap size={16} className="resume-section-icon" />
            학력
            {/* 매장 이력서에서는 학력을 묻지 않는다 — 미용실·네일숍이 보는 것은
                학교가 아니라 경력과 작업물이고, 별표를 붙여 두면 채우지 못한
                사람이 이력서를 미완성으로 여기고 만다. */}
            {resumeType === "office" && (
              <span style={{ color: "#e74c3c", marginLeft: "3px" }}>*</span>
            )}
          </h2>
          <button className="resume-icon-btn" aria-label="학교 추가" onClick={() => addEducation({ id: genId(), level: "", school: "", status: "", startDate: "", endDate: "", major: "", description: "" })}>
            <Plus size={18} />
          </button>
        </div>
        <흠줄 말들={칸흠("education")} />
        {educations.map((e) => (
          <div key={e.id} className="if-row if-row-plain">
            <div className="if-row-body">
              <흠줄 말들={항목흠("education", e.id)} />
              <div className="if-line if-line-head">
                <InlineText value={e.school} placeholder="학교명" required wide
                  onSave={(v) => updateEducation(e.id, { ...e, school: v })} />
              </div>
              <div className="if-line">
                <InlineYM value={e.startDate} onSave={(v) => updateEducation(e.id, { ...e, startDate: v })} />
                <span className="if-sep">–</span>
                <InlineYM value={e.endDate} onSave={(v) => updateEducation(e.id, { ...e, endDate: v })} />
                <span className="if-bar">│</span>
                <InlinePick value={e.status} placeholder="졸업 상태" required options={졸업상태}
                  onSave={(v) => updateEducation(e.id, { ...e, status: v })} />
                <span className="if-bar">│</span>
                <InlineText value={e.major} placeholder={본사냐 ? "전공 · 학위" : "전공"} required={본사냐}
                  onSave={(v) => updateEducation(e.id, { ...e, major: v })} />
              </div>
            </div>
            <button className="if-row-del" aria-label="삭제"
              onClick={() => { if (confirm("이 학력을 삭제할까요?")) removeEducation(e.id); }}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </section>

      {true && (
        <section id="section-skill" className="resume-section">
          <div className="resume-section-head">
            <h2 className="resume-section-title"><Sparkles size={16} className="resume-section-icon" />스킬{!본사냐 && <span style={{ color: "#e74c3c", marginLeft: "3px" }}>*</span>}</h2>
            <button className="resume-icon-btn" aria-label="스킬 추가" onClick={() => setSkillModalOpen(true)}>
              <Plus size={18} />
            </button>
          </div>
        <흠줄 말들={칸흠("skill")} />
          {/* 폼을 열면 그 안에도 담은 스킬이 (지우기와 함께) 서 있다. 둘 다
              두면 같은 것이 한 화면에 두 번 나온다. */}
          {skills.length > 0 && !skillModalOpen && (
            <div className="resume-skill-chips">
              {skills.map((sk) => <span key={sk} className="resume-skill-chip">{sk}</span>)}
            </div>
          )}
          {skillModalOpen && (
            <SkillModal inline isOpen={skillModalOpen} onClose={() => setSkillModalOpen(false)} />
          )}
        </section>
      )}

      {/* 자격증 */}
      <section id="section-certificate" className="resume-section">
        <div className="resume-section-head">
          <h2 className="resume-section-title"><Award size={16} className="resume-section-icon" />자격증</h2>
          <button className="resume-icon-btn" aria-label="자격증 추가" onClick={() => addCertificate({ id: genId(), name: "", issuer: "", issued_ym: "" })}>
            <Plus size={18} />
          </button>
        </div>
        {certificates.map((c) => (
          <div key={c.id} className="if-row if-row-plain">
            <div className="if-row-body">
              <div className="if-line if-line-head">
                <InlineText value={c.name} placeholder="자격증명" required wide
                  onSave={(v) => updateCertificate(c.id, { ...c, name: v })} />
              </div>
              <div className="if-line">
                <InlineYM value={c.issued_ym} placeholder="취득 년월"
                  onSave={(v) => updateCertificate(c.id, { ...c, issued_ym: v })} />
              </div>
            </div>
            <button className="if-row-del" aria-label="삭제"
              onClick={() => { if (confirm("이 자격증을 삭제할까요?")) removeCertificate(c.id); }}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </section>

      {/* 활동/수상 */}
      <section id="section-experience" className="resume-section">
        <div className="resume-section-head">
          <h2 className="resume-section-title"><Trophy size={16} className="resume-section-icon" />활동/수상</h2>
          <button className="resume-icon-btn" aria-label="활동 추가" onClick={() => addExperience({ id: genId(), category: "", title: "", description: "" })}>
            <Plus size={18} />
          </button>
        </div>
        {experiences.map((x) => (
          <div key={x.id} className="if-row if-row-plain">
            <div className="if-row-body">
              <div className="if-line if-line-head">
                <InlineText value={x.title} placeholder="무엇을 했는지" required wide
                  onSave={(v) => updateExperience(x.id, { ...x, title: v })} />
              </div>
              <div className="if-line">
                <InlinePick value={x.category} placeholder="종류" options={활동종류}
                  onSave={(v) => updateExperience(x.id, { ...x, category: v })} />
                <span className="if-bar">│</span>
                <InlineText value={x.description} placeholder="어디서 무엇을 얻었는지" wide
                  onSave={(v) => updateExperience(x.id, { ...x, description: v })} />
              </div>
            </div>
            <button className="if-row-del" aria-label="삭제"
              onClick={() => { if (confirm("이 활동을 삭제할까요?")) removeExperience(x.id); }}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </section>

      <section id="section-language" className="resume-section">
        <div className="resume-section-head">
          {/* 어학에는 별표를 붙이지 않는다. 매장에만 붙어 있었는데(바로 위 스킬
              줄을 그대로 복사한 것으로 보인다) 미용실·네일숍이 외국어를 필수로
              보는 일은 없고, 정작 본사에는 안 붙어 있어 방향도 뒤집혀 있었다.
              학력과 같은 이유다 — 볼 일 없는 칸에 별표를 붙이면 채우지 못한
              사람이 제 이력서를 미완성으로 여기고 만다. */}
          <h2 className="resume-section-title"><Globe size={16} className="resume-section-icon" />어학</h2>
          {(
            <button className="resume-icon-btn" aria-label="어학 추가" onClick={() => addLanguage({ id: genId(), language: "", level: "", test: "" })}>
              <Plus size={18} />
            </button>
          )}
        </div>
        <흠줄 말들={칸흠("language")} />
        {languages.map((l) => {
          const t = 시험읽기(l.test);
          const 담기 = (v: Partial<typeof t>) => updateLanguage(l.id, { ...l, test: 시험쓰기({ ...t, ...v }) });
          return (
            <div key={l.id} className="if-row if-row-plain">
              <div className="if-row-body">
                <흠줄 말들={항목흠("language", l.id)} />
                <div className="if-line">
                  <InlinePick value={l.language} placeholder="언어" required options={언어들}
                    onSave={(v) => updateLanguage(l.id, { ...l, language: v })} />
                  <span className="if-bar">│</span>
                  <InlinePick value={l.level} placeholder="수준" required options={수준들}
                    onSave={(v) => updateLanguage(l.id, { ...l, level: v })} />
                </div>
                {/* 시험 점수는 본사 지원서에만 쓰인다. 살롱은 상·중·하면 끝난다. */}
                {resumeType === "office" && (
                  <div className="if-line">
                    <InlineText value={t.name} placeholder="시험명" onSave={(v) => 담기({ name: v })} />
                    <span className="if-bar">│</span>
                    <InlineText value={t.score} placeholder="점수/등급" onSave={(v) => 담기({ score: v })} />
                    <span className="if-bar">│</span>
                    <InlineYM value={t.ym} placeholder="취득 년월" onSave={(v) => 담기({ ym: v })} />
                  </div>
                )}
              </div>
              <button className="if-row-del" aria-label="삭제"
                onClick={() => { if (confirm("이 어학을 삭제할까요?")) removeLanguage(l.id); }}>
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
      </section>

      <section id="section-portfolio" className="resume-section">
        <div className="resume-section-head" onClick={() => togglePf()} style={{ cursor: "pointer" }}>
          <h2 className="resume-section-title">
            <ImageIcon size={16} className="resume-section-icon" />
            포트폴리오
            {/* 살롱은 시술 사진이 곧 실력 증명이라 채운 사람과 안 채운 사람의
                차이가 크다. 본사 지원에는 그만한 무게가 없어 붙이지 않는다. */}
            {/* 글로 늘어놓던 안내를 뱃지 하나로 줄였다 — 칸 이름 옆에서 한눈에
                읽히고, 채우면 뭐가 좋은지가 여섯 글자로 끝난다. */}
            {resumeType === "salon" && (
              <span className="badge-up"><Sparkles size={11} />취업률 상승</span>
            )}
          </h2>
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
                {portfolioReadOnly ? null : portfolioImages.length === 0 ? (
                  <button className="resume-icon-btn" aria-label="사진 추가" onClick={() => set모달((v) => (v === "photo" ? null : "photo"))}>
                    <Plus size={18} />
                  </button>
                ) : (
                  <>
                    {portfolioImages.length < 9 && (
                      <button className="resume-icon-btn" aria-label="사진 추가" onClick={() => set모달((v) => (v === "photo" ? null : "photo"))}>
                        <Plus size={18} />
                      </button>
                    )}
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
                        {/* 한 장 빼는 일은 사진 위에서 끝난다. 쓰레기통은 전부
                            지우는 것이라 뜻이 다르다. */}
                        {!portfolioReadOnly && (
                          <button type="button" className="pf-del-one" aria-label="이 사진 삭제"
                            onClick={(e) => { e.stopPropagation(); onPortfolioDelete([img.url]); }}>
                            <X size={13} strokeWidth={2.6} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

        {/* 폼은 누른 줄 바로 밑에 선다. 아래에 몰아 두면 사진을 눌렀는데
            SNS 두 줄을 건너뛴 자리에서 열려 무엇이 열렸는지 헷갈린다. */}
        {모달 === "photo" && (
          <PortfolioModal inline isOpen mode="photo" resumeType={resumeType}
            onClose={() => set모달(null)} images={portfolioImages} links={links} isUploading={isUploading}
            onFiles={onPortfolioFiles} onDeletePhotos={onPortfolioDelete} onAddLink={링크담기} onDeleteLink={링크지우기} />
        )}
            {/* ── SNS 줄 ── */}
            <div className="resume-career-head" style={{ display: "flex", alignItems: "center", marginTop: 14 }}>
              <strong style={{ fontWeight: 400 }}>SNS</strong>
              {links.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 13, color: "#888" }}>{links.length}개</span>
              )}
              <span style={{ marginLeft: "auto", display: "flex", gap: 4, flexShrink: 0 }}>
                <button className="resume-icon-btn" aria-label="SNS 추가"
                  onClick={() => addLink({ id: genId(), category: "", url: "" })}>
                  <Plus size={18} />
                </button>
              </span>
            </div>
            {/* 항목이 곧 입력칸이다. 링크명과 주소를 그 자리에서 친다 —
                주소만 넣으면 이름은 주소에서 알아낸다(instagram.com → 인스타그램). */}
            {links.map((l) => (
              <div key={l.id} className="if-row if-row-plain">
                <div className="if-row-body">
                  <div className="if-line">
                    {/* 이름을 고르면 주소 앞부분까지 채워 준다 — 유튜브를 고르면
                        아래 칸이 https://youtube.com/@ 로 시작한 채 기다린다. */}
                    <InlineSuggest value={l.category} placeholder="SNS명 (예: 유튜브)" wide
                      찾기={SNS찾기}
                      onPick={(k) => updateLink(l.id, { ...l, category: k.이름, url: l.url || k.앞부분 })}
                      onSave={(v) => updateLink(l.id, { ...l, category: v })} />
                  </div>
                  <div className="if-line">
                    <InlineText value={l.url} placeholder="https:// 로 시작하는 주소" required wide
                      onSave={(v) => updateLink(l.id, { ...l, url: v, category: l.category || (v ? linkLabel(v) : "") })} />
                  </div>
                </div>
                <button className="if-row-del" aria-label="삭제"
                  onClick={() => { if (confirm("이 링크를 삭제할까요?")) removeLink(l.id); }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </>
        )}
      </section>





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