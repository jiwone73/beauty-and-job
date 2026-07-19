"use client";
import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, Pencil, Trash2 } from "lucide-react";
import { shortRegion } from "@/lib/regionShort";
import JobPreview from "@/components/jobs/JobPreview";
import JobGroupField from "@/components/JobGroupField";
import RegionSelectModal from "@/components/RegionSelectModal";

const CAREER_OPTIONS = ["신입", "1년 이상", "2년 이상", "3년 이상", "5년 이상", "경력 무관"];
const EMPLOYMENT_TYPES = ["정규직", "계약직", "인턴", "아르바이트", "프리랜서"];
const BENEFIT_OPTIONS: Record<string, string[]> = {
  매장: ["기숙사 제공", "교육비 지원", "인센티브", "4대보험", "주말·공휴일 휴무", "정규직 전환", "식대 지원", "주차 가능"],
  기업: ["4대보험", "인센티브", "정규직 전환", "재택근무", "유연근무", "자기계발비", "식대 지원", "주차 가능"],
};
const PRESET_PROCESS: Record<string, string[]> = {
  기업: ["서류전형", "전화면접", "1차 면접", "2차 면접", "과제전형", "최종합격"],
  매장: ["서류전형", "전화면접", "대면면접", "시술테스트", "최종합격"],
};

type Company = { id: string; company_name: string; brand_name: string | null };

type TextKey = "benefits" | "description" | "requirements" | "preferred";

export interface JobPostFormProps {
  mode: "company" | "admin";
  editId?: string | null;
  listHref: string;
  companyType?: "OFFICE" | "STORE" | "BOTH" | null;
  companies?: Company[];
  uploadImage: (file: File) => Promise<{ success: boolean; url?: string; name?: string; error?: string }>;
  onSubmit: (payload: any, status: "draft" | "publish", company: { companyId: string | null; newCompany: { company_name: string; brand_name: string } | null }) => Promise<{ success: boolean; error?: string }>;
  loadEditData?: (editId: string) => Promise<any | null>;
}

export default function JobPostForm({
  mode, editId = null, listHref, companyType = null, companies = [],
  uploadImage, onSubmit, loadEditData,
}: JobPostFormProps) {
  const router = useRouter();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [showCompanyList, setShowCompanyList] = useState(false);
  const [nonMember, setNonMember] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [jobGroupType, setJobGroupType] = useState<"기업" | "매장">("기업");
  const [categories, setCategories] = useState<string[]>([]);
  const [regionList, setRegionList] = useState<string[]>([]);
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", career: "",
    type: "정규직", deadline: "", salary: "", description: "",
    requirements: "", preferred: "", benefits: "",
  });
  const [saved, setSaved] = useState(false);
  const [alwaysOpen, setAlwaysOpen] = useState(false);
  const [detailImages, setDetailImages] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hiringProcess, setHiringProcess] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [benefitTags, setBenefitTags] = useState<string[]>([]);
  const [salaryNego, setSalaryNego] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // ── 모달 상태 ──────────────────────────────
  const [textModalKey, setTextModalKey] = useState<TextKey | null>(null);
  const [textModalValue, setTextModalValue] = useState("");
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [processDraft, setProcessDraft] = useState<string[]>([]);
  const [processCustom, setProcessCustom] = useState("");
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesModalValue, setNotesModalValue] = useState("");

  useEffect(() => {
    if (companyType === "BOTH") setJobGroupType("기업");
    else if (companyType === "STORE") setJobGroupType("매장");
    else if (companyType === "OFFICE") setJobGroupType("기업");
  }, [companyType]);

  useEffect(() => {
    if (!editId || !loadEditData) return;
    loadEditData(editId).then((j) => {
      if (!j) return;
      const career = j.experience_level === "NEW" ? "신입"
        : j.experience_level === "EXPERIENCED" ? "2년 이상" : "경력 무관";
      const type = j.employment_type
        || (j.work_type === "PART_TIME" ? "파트타임"
          : j.work_type === "CONTRACT" ? "계약직" : "정규직");
      const salary = j.salary_min ? String(j.salary_min / 10000) : "";
      setForm({
        title: j.title || "", career, type,
        deadline: j.deadline ? String(j.deadline).slice(0, 10) : "",
        salary, description: j.description || "", requirements: j.requirements || "",
        preferred: j.preferred_qualifications || "", benefits: j.benefits || "",
      });
      setAlwaysOpen(!j.deadline);
      setCategories(j.categories || []);
      setRegionList(j.location ? String(j.location).split(",").map((s: string) => s.trim()).filter(Boolean) : []);
      setDetailImages(j.detail_images || []);
      setHiringProcess(j.hiring_process || []);
      setNotes(j.notes || "");
      setBenefitTags(j.benefit_tags || []);
      setSalaryNego(!j.salary_min);
      if (j.job_type) setJobGroupType(j.job_type === "STORE" ? "매장" : "기업");
      if (j.company_id) setCompanyId(j.company_id);
    }).catch(console.error);
  }, [editId, loadEditData]);

  const showTypeToggle = mode === "admin" || companyType === "BOTH";

  // ── 텍스트 모달 핸들러 ─────────────────────
  const openTextModal = (key: TextKey) => {
    setTextModalKey(key);
    setTextModalValue((form as any)[key] || "");
  };
  const saveTextModal = () => {
    if (textModalKey) setForm({ ...form, [textModalKey]: textModalValue });
    setTextModalKey(null);
  };

  // ── 채용절차 모달 핸들러 ───────────────────
  const openProcessModal = () => {
    setProcessDraft([...hiringProcess]);
    setProcessCustom("");
    setProcessModalOpen(true);
  };
  const togglePreset = (p: string) =>
    setProcessDraft((d) => (d.includes(p) ? d.filter((x) => x !== p) : [...d, p]));
  const addCustomStep = () => {
    const v = processCustom.trim();
    if (!v) return;
    if (processDraft.includes(v)) { setProcessCustom(""); return; }
    if (processDraft.length >= 8) { alert("채용 절차는 최대 8단계까지 추가할 수 있어요."); return; }
    setProcessDraft([...processDraft, v]);
    setProcessCustom("");
  };
  const removeDraftStep = (idx: number) =>
    setProcessDraft(processDraft.filter((_, i) => i !== idx));
  const saveProcessModal = () => {
    setHiringProcess(processDraft.map((s) => s.trim()).filter(Boolean));
    setProcessModalOpen(false);
  };

  // ── 비고 모달 핸들러 ───────────────────────
  const openNotesModal = () => { setNotesModalValue(notes); setNotesModalOpen(true); };
  const saveNotesModal = () => { setNotes(notesModalValue); setNotesModalOpen(false); };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (detailImages.length + files.length > 5) {
      alert("이미지는 최대 5장까지 첨부할 수 있습니다."); return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const r = await uploadImage(file);
        if (r.success && r.url) {
          setDetailImages((prev) => [...prev, { url: r.url!, name: r.name || file.name }]);
        } else {
          alert(r.error || "이미지 업로드에 실패했습니다.");
        }
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (idx: number) =>
    setDetailImages((prev) => prev.filter((_, i) => i !== idx));

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight, position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`${form.title || "채용공고"}.pdf`);
    } catch { alert("다운로드 중 오류가 발생했습니다."); }
    finally { setIsDownloading(false); }
  };

  const handlePrint = async () => {
    if (!previewRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      const imgData = canvas.toDataURL("image/png");
      const w = window.open();
      if (w) w.document.write(`<html><head><title>채용공고 인쇄</title></head><body style="margin:0"><img src="${imgData}" style="width:100%" onload="window.print();window.close()" /></body></html>`);
    } catch { alert("인쇄 준비 중 오류가 발생했습니다."); }
  };

  const handleSubmit = async (status: "draft" | "publish") => {
    if (mode === "admin") {
      if (nonMember) {
        if (!newCompanyName.trim()) { alert("비회원 회사명을 입력해주세요."); return; }
      } else if (!companyId) {
        alert("기업을 선택해주세요."); return;
      }
    }
    if (!form.title.trim()) { alert("공고 제목을 입력해주세요."); return; }
    if (categories.length === 0) { alert(jobGroupType === "매장" ? "시술 분야를 선택해주세요." : "직군을 선택해주세요."); return; }
    if (!form.career.trim()) { alert("경력 조건을 입력해주세요."); return; }
    if (regionList.length === 0) { alert("근무지역을 선택해주세요."); return; }
    // 상세 이미지가 없으면 포지션 소개는 필수, 있으면 선택
    const hasDetailImages = detailImages.length > 0;
    if (!hasDetailImages && !form.description.trim() && status === "publish") {
      alert("포지션 소개를 입력하거나, 상세 이미지를 1장 이상 첨부해주세요.\n\n둘 중 하나는 반드시 필요해요.");
      return;
    }

    const expLevel = form.career.includes("신입") ? "NEW"
      : form.career.match(/\d+년/) ? "EXPERIENCED" : "ANY";
    const workType = form.type === "파트타임" ? "PART_TIME"
      : form.type === "계약직" ? "CONTRACT" : "FULL_TIME";
    let salaryMin: number | null = null;
    if (!salaryNego && form.salary) {
      const n = parseInt(String(form.salary).replace(/[^0-9]/g, ""));
      if (n > 0) salaryMin = n * 10000;
    }

    const payload: any = {
      title: form.title,
      job_type: jobGroupType === "기업" ? "OFFICE" : "STORE",
      description: form.description || null,
      requirements: form.requirements || null,
      preferred_qualifications: form.preferred || null,
      benefits: form.benefits || null,
      salary_min: salaryMin, salary_max: null,
      salary_type: salaryMin ? (jobGroupType === "매장" ? "MONTHLY" : "ANNUAL") : null,
      location: regionList.join(", ") || null,
      work_type: workType,
      employment_type: form.type,
      experience_level: expLevel,
      benefit_tags: benefitTags,
      deadline: form.deadline || null,
      categories,
      detail_images: detailImages,
      hiring_process: hiringProcess.filter((s) => s.trim()),
      notes: notes.trim() || null,
    };

    const company = nonMember
      ? { companyId: null, newCompany: { company_name: newCompanyName.trim(), brand_name: newBrandName.trim() } }
      : { companyId, newCompany: null };
    const result = await onSubmit(payload, status, company);
    if (!result.success) {
      alert(result.error || (editId ? "공고 수정에 실패했습니다." : "공고 등록에 실패했습니다."));
      return;
    }
    setSaved(true);
    setTimeout(() => router.push(listHref), 1000);
  };

  // ── 텍스트 항목 메타 ───────────────────────
  const benefitsLabel = jobGroupType === "매장" ? "근무조건·복지" : "복리후생";
  const textFieldMeta: Record<TextKey, { label: string; hint?: string; placeholder: string }> = {
    benefits: { label: benefitsLabel, placeholder: "복리후생·근무조건을 입력하세요" },
    description: {
      label: "포지션 소개",
      hint: detailImages.length > 0 ? "선택 (이미지로 대체됨)" : "필수 (이미지 없을 시)",
      placeholder: "이 포지션에 대한 소개를 입력하세요. 비워두고 상세 이미지로 대체할 수도 있어요.",
    },
    requirements: { label: "자격요건", placeholder: "필수 자격요건을 입력하세요" },
    preferred: { label: "우대사항", placeholder: "우대사항을 입력하세요" },
  };
  const textFields: TextKey[] = ["benefits", "description", "requirements", "preferred"];

  const processFilled = hiringProcess.length > 0;
  const notesFilled = !!notes.trim();

  // 한 줄 작성/수정 버튼 행 (텍스트4 공용)
  const TextLine = ({ k }: { k: TextKey }) => {
    const meta = textFieldMeta[k];
    const filled = !!((form as any)[k] || "").trim();
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
        padding: "12px 14px", border: "1px solid #eee", borderRadius: "10px",
        background: filled ? "#fafcff" : "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          {filled ? (
            <span style={{ flexShrink: 0, width: "20px", height: "20px", borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check size={13} color="#fff" strokeWidth={3} />
            </span>
          ) : (
            <span style={{ flexShrink: 0, width: "20px", height: "20px", borderRadius: "50%", border: "1.5px solid #d4d4d4" }} />
          )}
          <span style={{ fontSize: "14px", fontWeight: 400, color: "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {meta.label}
            {meta.hint && (
              <span style={{
                marginLeft: "6px", fontSize: "12px", fontWeight: 400,
                color: meta.hint.startsWith("필수") ? "#dc2626" : "#999",
              }}>
                {meta.hint.startsWith("필수") ? "★ " : ""}{meta.hint}
              </span>
            )}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          <button type="button" className="resume-icon-btn" aria-label={filled ? "수정" : "작성"} title={filled ? "수정" : "작성"} onClick={() => openTextModal(k)}>
            <Pencil size={15} />
          </button>
          {filled && (
            <button type="button" className="resume-icon-btn danger" aria-label="삭제" title="삭제"
              onClick={() => { if (confirm("작성한 내용을 삭제할까요?")) setForm({ ...form, [k]: "" }); }}>
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="admin-form-header">
        <button className="admin-back-btn" onClick={() => router.push(listHref)}>
          <ChevronLeft size={18} /> 목록으로
        </button>
        <h2 style={{ fontSize: "18px", fontWeight: 400, color: "#1a1a1a", margin: 0 }}>
          {editId ? "채용공고 수정" : "채용공고 등록"}
        </h2>
        <div className="admin-form-actions">
          <button className="admin-secondary-btn" onClick={() => handleSubmit("draft")}>임시저장</button>
          <button className="admin-secondary-btn" onClick={() => setShowPreview(true)}>미리보기</button>
          <button className="company-primary-btn" onClick={() => handleSubmit("publish")}>
            {saved ? (editId ? "✅ 수정완료" : "✅ 등록완료") : (editId ? "공고 수정" : "공고 등록")}
          </button>
        </div>
      </div>

      <div className="admin-form-grid jobpost-form">
        {/* ═══ 왼쪽 컬럼: 기본정보 + 상세이미지 ═══ */}
        <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* 기본 정보 */}
          <div className="company-card" style={{ overflow: "visible" }}>
            <div className="company-card-head"><h2 className="company-card-title">기본 정보</h2></div>
            <div className="admin-form-body">

              {mode === "admin" && (
                <div className="admin-form-row">
                  <label className="admin-form-label">기업 선택<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>

                  {nonMember ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <input className="admin-form-input" placeholder="회사명 (필수)"
                        value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} />
                      <input className="admin-form-input" placeholder="브랜드명 (선택)"
                        value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} />
                      <button type="button"
                        onClick={() => { setNonMember(false); setNewCompanyName(""); setNewBrandName(""); }}
                        style={{ alignSelf: "flex-start", background: "none", border: "none", color: "#5f0080", fontSize: "13px", fontWeight: 400, cursor: "pointer", padding: 0 }}>
                        ← 회원 기업에서 선택
                      </button>
                    </div>
                  ) : companyId ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 400, color: "#555" }}>{companyName}</span>
                      <button type="button"
                        onClick={() => { setCompanyId(null); setCompanyName(""); }}
                        style={{ background: "none", border: "none", color: "#888", fontSize: "13px", cursor: "pointer" }}>
                        변경
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ position: "relative" }}>
                        <input className="admin-form-input" placeholder="기업명 검색"
                          value={companyQuery}
                          onChange={(e) => { setCompanyQuery(e.target.value); setShowCompanyList(true); }}
                          onFocus={() => setShowCompanyList(true)} />
                        {showCompanyList && companyQuery.trim() && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, marginTop: "4px", background: "#fff", border: "1px solid #e0e0e0", borderRadius: "8px", maxHeight: "240px", overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                            {(() => {
                              const q = companyQuery.trim().toLowerCase();
                              const matched = companies.filter((c) =>
                                c.company_name.toLowerCase().includes(q) || (c.brand_name || "").toLowerCase().includes(q)
                              ).slice(0, 30);
                              if (matched.length === 0) {
                                return <div style={{ padding: "10px 14px", fontSize: "13px", color: "#999" }}>검색 결과가 없어요</div>;
                              }
                              return matched.map((c) => (
                                <div key={c.id}
                                  onClick={() => {
                                    setCompanyId(c.id);
                                    setCompanyName(c.company_name + (c.brand_name ? ` (${c.brand_name})` : ""));
                                    setShowCompanyList(false); setCompanyQuery("");
                                  }}
                                  style={{ padding: "10px 14px", fontSize: "14px", cursor: "pointer", borderBottom: "1px solid #f3f3f3" }}>
                                  {c.company_name}{c.brand_name ? <span style={{ color: "#888" }}> ({c.brand_name})</span> : null}
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                      <button type="button"
                        onClick={() => { setNonMember(true); setCompanyId(null); setCompanyName(""); setCompanyQuery(""); setShowCompanyList(false); }}
                        style={{ marginTop: "8px", background: "none", border: "none", color: "#5f0080", fontSize: "13px", fontWeight: 400, cursor: "pointer", padding: 0 }}>
                        + 비회원 기업으로 직접 입력
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="admin-form-row">
                <label className="admin-form-label">채용 유형{showTypeToggle && <span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span>}</label>
                {showTypeToggle ? (
                  <div style={{ display: "flex", gap: "8px" }}>
                    {[{ value: "기업", label: "🏢 기업·브랜드 채용" }, { value: "매장", label: "🏪 매장·살롱 채용" }].map((t) => (
                      <button key={t.value} type="button"
                        onClick={() => { setJobGroupType(t.value as "기업" | "매장"); setCategories([]); }}
                        style={{
                          flex: 1, padding: "12px", borderRadius: "8px", fontSize: "13px", fontWeight: 400,
                          border: jobGroupType === t.value ? "2px solid #5f0080" : "2px solid #e0e0e0",
                          background: jobGroupType === t.value ? "#faf5ff" : "#fff",
                          color: jobGroupType === t.value ? "#5f0080" : "#888", cursor: "pointer",
                        }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px",
                  }}>
                    <span style={{ fontSize: "14px", fontWeight: 400, color: "#555" }}>
                      {jobGroupType === "기업" ? "🏢 기업·브랜드 채용" : "🏪 매장·살롱 채용"}
                    </span>
                    <span style={{ fontSize: "11px", color: "#aaa" }}>회사 정보에 따라 자동 설정</span>
                  </div>
                )}
              </div>

              <div className="admin-form-row">
                <label className="admin-form-label">공고 제목<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>
                <input className="admin-form-input"
                  placeholder={jobGroupType === "매장" ? "예) 네일 아티스트 모집" : "예) 마케팅 매니저 (색조)"}
                  value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>

              <div className="admin-form-row">
                <label className="admin-form-label">
                  {jobGroupType === "매장" ? "시술 분야" : "직군"}<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span>
                </label>
                <JobGroupField
                  jobType={jobGroupType === "기업" ? "OFFICE" : "STORE"}
                  value={categories} onChange={setCategories} maxSelect={5}
                  placeholder={jobGroupType === "매장" ? "시술 분야를 선택해주세요" : "직군을 선택해주세요"} />
              </div>

              <div className="admin-form-row-2col">
                <div className="admin-form-row">
                  <label className="admin-form-label">경력<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>
                  <select className="admin-form-select" value={form.career}
                    onChange={(e) => setForm({ ...form, career: e.target.value })}>
                    <option value="">선택</option>
                    {CAREER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="admin-form-row">
                  <label className="admin-form-label">고용형태</label>
                  <select className="admin-form-select" value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {EMPLOYMENT_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="admin-form-row">
                <label className="admin-form-label">근무지역<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>
                <button type="button" onClick={() => setRegionModalOpen(true)}
                  style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "6px", padding: 0, border: "none", background: "transparent", fontSize: "14px", color: regionList.length ? "#555" : "#bbb", cursor: "pointer" }}>
                  <span style={{ textAlign: "right" }}>
                    {regionList.length ? regionList.map(shortRegion).join(", ") : "지역을 선택해주세요"}
                  </span>
                  <span style={{ color: "#ccc", fontSize: "16px", flexShrink: 0 }}>›</span>
                </button>
              </div>

              <div className="admin-form-row-2col">
                <div className="admin-form-row">
                  <label className="admin-form-label">{jobGroupType === "매장" ? "급여" : "연봉"}</label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "flex-end" }}>
                    <input className="admin-form-input" type="number" disabled={salaryNego}
                      placeholder={salaryNego ? "" : (jobGroupType === "매장" ? "예) 250" : "예) 4000")}
                      value={salaryNego ? "" : form.salary}
                      onChange={(e) => setForm({ ...form, salary: e.target.value })}
                      style={{ width: 130, flexShrink: 0, boxSizing: "border-box" }} />
                    <span style={{ fontSize: "13px", color: "#666", whiteSpace: "nowrap" }}>만원</span>
                  </div>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "13px", color: "#555", cursor: "pointer" }}>
                    <input type="checkbox" checked={salaryNego} onChange={(e) => setSalaryNego(e.target.checked)} /> 협의
                  </label>
                </div>
                <div className="admin-form-row">
                  <label className="admin-form-label">마감일</label>
                  <input type="date" className="admin-form-input"
                    min={new Date().toISOString().slice(0, 10)}
                    value={form.deadline}
                    disabled={alwaysOpen}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    style={{ height: 42, boxSizing: "border-box", ...(alwaysOpen ? { background: "#f5f5f5", color: "#aaa", cursor: "not-allowed" } : {}) }} />
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "13px", color: "#555", cursor: "pointer" }}>
                    <input type="checkbox" checked={alwaysOpen}
                      onChange={(e) => {
                        setAlwaysOpen(e.target.checked);
                        if (e.target.checked) setForm({ ...form, deadline: "" });
                      }} />
                    상시채용 (마감일 없음)
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 상세 이미지 (하단 높이 맞춤용 flex:1) */}
          <div className="company-card" style={{ overflow: "visible", flex: 1 }}>
            <div className="company-card-head"><h2 className="company-card-title">상세 이미지</h2></div>
            <div className="admin-form-body">
              <div className="admin-form-row">
                <label className="admin-form-label">
                  상세 이미지 첨부 <span style={{ color: "#888", fontWeight: 400, fontSize: "13px" }}>(최대 5장 · 각 5MB)</span>
                </label>
                <p style={{ fontSize: "13px", color: "#888", margin: "0 0 12px" }}>
                  직접 디자인한 채용 공고 이미지나 매장 사진을 첨부할 수 있어요. 단, 검색 노출을 위해 우측 텍스트 항목도 함께 작성해주세요.
                </p>
                {detailImages.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
                    {detailImages.map((img, idx) => (
                      <div key={idx} style={{ position: "relative", width: "120px" }}>
                        <img src={img.url} alt={img.name}
                          style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "8px", border: "1px solid #eee" }} />
                        <button type="button" onClick={() => removeImage(idx)}
                          style={{ position: "absolute", top: "4px", right: "4px", width: "24px", height: "24px",
                            borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none",
                            cursor: "pointer", fontSize: "14px", lineHeight: "1", display: "flex",
                            alignItems: "center", justifyContent: "center" }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                {detailImages.length < 5 && (
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 16px",
                    border: "1.5px dashed #c4b5d4", borderRadius: "8px", cursor: uploading ? "wait" : "pointer",
                    color: "#5f0080", fontSize: "14px", fontWeight: 400, background: "#fdfbff" }}>
                    {uploading ? "업로드 중..." : "+ 이미지 추가"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple
                      disabled={uploading} onChange={handleImageUpload} style={{ display: "none" }} />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ 오른쪽 컬럼: 상세내용 + 채용절차·비고 ═══ */}
        <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* 상세 내용 */}
          <div className="company-card" style={{ overflow: "visible" }}>
            <div className="company-card-head"><h2 className="company-card-title">상세 내용</h2></div>
            <div className="admin-form-body">
              {/* 복리후생 체크박스 (필터용) */}
              <div className="admin-form-row">
                <label className="admin-form-label">복리후생 · 근무조건 <span style={{ color: "#888", fontWeight: 400, fontSize: "13px" }}>(해당 항목 선택 · 필터에 사용)</span></label>
                <div className="benefit-chip-grid">
                  {(jobGroupType === "매장" ? BENEFIT_OPTIONS.매장 : BENEFIT_OPTIONS.기업).map((b) => (
                    <button key={b} type="button"
                      className={`benefit-chip ${benefitTags.includes(b) ? "on" : ""}`}
                      onClick={() => setBenefitTags(benefitTags.includes(b) ? benefitTags.filter((x) => x !== b) : [...benefitTags, b])}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* 텍스트 4항목 → 1줄 버튼 + 모달 */}
              <div className="admin-form-row">
                <label className="admin-form-label">상세 항목 작성 <span style={{ color: "#888", fontWeight: 400, fontSize: "13px" }}>(항목별 작성 시 ✓ 표시)</span></label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {textFields.map((k) => <TextLine key={k} k={k} />)}
                </div>
              </div>
            </div>
          </div>

          {/* 채용 절차 · 비고 (하단 높이 맞춤용 flex:1) */}
          <div className="company-card" style={{ overflow: "visible", flex: 1 }}>
            <div className="company-card-head"><h2 className="company-card-title">채용 절차</h2></div>
            <div className="admin-form-body">

              {/* 채용 절차 */}
              <div className="admin-form-row">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <label className="admin-form-label" style={{ margin: 0 }}>
                    채용 절차
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <button type="button" className="resume-icon-btn" aria-label={processFilled ? "수정" : "설정"} title={processFilled ? "수정" : "설정"} onClick={openProcessModal}>
                      <Pencil size={15} />
                    </button>
                    {processFilled && (
                      <button type="button" className="resume-icon-btn danger" aria-label="삭제" title="삭제"
                        onClick={() => { if (confirm("채용 절차를 삭제할까요?")) setHiringProcess([]); }}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: "8px" }}>
                  {processFilled ? (
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
                      {hiringProcess.map((s, i) => (
                        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          {i > 0 && <span style={{ color: "#bbb", fontSize: "13px" }}>→</span>}
                          <span style={{ padding: "5px 11px", background: "#faf5ff", border: "1px solid #ede0f8", borderRadius: "999px", fontSize: "13px", color: "#5f0080", fontWeight: 400 }}>
                            {i + 1}. {s}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: "13px", color: "#aaa", margin: 0 }}>아직 설정된 채용 절차가 없어요. (예: 서류전형 → 대면면접 → 최종합격)</p>
                  )}
                </div>
              </div>

              {/* 비고 · 유의사항 */}
              <div className="admin-form-row" style={{ marginTop: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <label className="admin-form-label" style={{ margin: 0 }}>
                    비고 · 유의사항
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <button type="button" className="resume-icon-btn" aria-label={notesFilled ? "수정" : "작성"} title={notesFilled ? "수정" : "작성"} onClick={openNotesModal}>
                      <Pencil size={15} />
                    </button>
                    {notesFilled && (
                      <button type="button" className="resume-icon-btn danger" aria-label="삭제" title="삭제"
                        onClick={() => { if (confirm("비고를 삭제할까요?")) setNotes(""); }}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
                {notesFilled && (
                  <p style={{
                    marginTop: "8px", fontSize: "13px", color: "#666", whiteSpace: "pre-wrap",
                    display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <RegionSelectModal
        open={regionModalOpen}
        initial={regionList}
        onClose={() => setRegionModalOpen(false)}
        onApply={(regions) => { setRegionList(regions); setRegionModalOpen(false); }}
      />

      {/* ── 텍스트 작성 모달 ── */}
      {textModalKey && (
        <div onClick={() => setTextModalKey(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "560px", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #eee" }}>
              <span style={{ fontSize: "16px", fontWeight: 400 }}>{textFieldMeta[textModalKey].label} 작성</span>
              <button onClick={() => setTextModalKey(null)} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#888", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: "20px", overflowY: "auto" }}>
              <textarea className="admin-form-textarea" autoFocus
                placeholder={textFieldMeta[textModalKey].placeholder}
                value={textModalValue} onChange={(e) => setTextModalValue(e.target.value)}
                style={{ width: "100%", minHeight: "240px", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: "8px", padding: "16px 20px", borderTop: "1px solid #eee", justifyContent: "flex-end" }}>
              <button className="admin-secondary-btn" onClick={() => setTextModalKey(null)}>취소</button>
              <button className="company-primary-btn" onClick={saveTextModal}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 채용 절차 모달 ── */}
      {processModalOpen && (
        <div onClick={() => setProcessModalOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "560px", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #eee" }}>
              <span style={{ fontSize: "16px", fontWeight: 400 }}>채용 절차 설정</span>
              <button onClick={() => setProcessModalOpen(false)} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#888", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
              <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>
                지원자가 거치는 전형 단계를 순서대로 추가하세요. 아래 단계를 누르거나 직접 입력할 수 있어요.
              </p>

              {/* 선택된 단계 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 400, color: "#444" }}>선택된 단계</span>
                {processDraft.length === 0 ? (
                  <div style={{ padding: "14px", border: "1.5px dashed #e0d4ee", borderRadius: "8px", fontSize: "13px", color: "#aaa", textAlign: "center" }}>
                    아직 추가된 단계가 없어요.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {processDraft.map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", background: "#faf5ff", border: "1px solid #ede0f8", borderRadius: "8px" }}>
                        <span style={{ flexShrink: 0, width: "24px", height: "24px", borderRadius: "50%", background: "#5f0080", color: "#fff", fontSize: "12px", fontWeight: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                        <span style={{ flex: 1, fontSize: "14px", fontWeight: 400, color: "#5f0080" }}>{s}</span>
                        <button type="button" onClick={() => removeDraftStep(i)}
                          style={{ flexShrink: 0, background: "none", border: "none", color: "#a78bba", cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: "0 4px" }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 프리셋 칩 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 400, color: "#444" }}>자주 쓰는 단계</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {(jobGroupType === "매장" ? PRESET_PROCESS.매장 : PRESET_PROCESS.기업).map((p) => {
                    const on = processDraft.includes(p);
                    return (
                      <button key={p} type="button" onClick={() => togglePreset(p)}
                        style={{
                          padding: "8px 14px", borderRadius: "999px", fontSize: "13px", fontWeight: 400, cursor: "pointer",
                          border: on ? "1.5px solid #5f0080" : "1.5px solid #e0e0e0",
                          background: on ? "#5f0080" : "#fff",
                          color: on ? "#fff" : "#666",
                        }}>
                        {on ? "✓ " : "+ "}{p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 직접 입력 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 400, color: "#444" }}>직접 입력</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input className="admin-form-input" style={{ flex: 1 }}
                    placeholder="예) 포트폴리오 제출"
                    value={processCustom}
                    onChange={(e) => setProcessCustom(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomStep(); } }} />
                  <button type="button" onClick={addCustomStep}
                    style={{ padding: "0 18px", borderRadius: "8px", border: "1.5px solid #5f0080", background: "#fff", color: "#5f0080", fontWeight: 400, fontSize: "14px", cursor: "pointer", whiteSpace: "nowrap" }}>추가</button>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", padding: "16px 20px", borderTop: "1px solid #eee", justifyContent: "flex-end" }}>
              <button className="admin-secondary-btn" onClick={() => setProcessModalOpen(false)}>취소</button>
              <button className="company-primary-btn" onClick={saveProcessModal}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 비고 모달 ── */}
      {notesModalOpen && (
        <div onClick={() => setNotesModalOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "560px", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #eee" }}>
              <span style={{ fontSize: "16px", fontWeight: 400 }}>비고 · 유의사항</span>
              <button onClick={() => setNotesModalOpen(false)} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#888", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: "20px", overflowY: "auto" }}>
              <textarea className="admin-form-textarea" autoFocus
                placeholder={"지원 시 유의사항이나 안내문을 자유롭게 입력하세요.\n예) ※ 서류 합격자에 한하여 개별 연락드립니다.\n※ 3개월 수습 후 정규직 전환 평가가 진행됩니다."}
                value={notesModalValue} onChange={(e) => setNotesModalValue(e.target.value)}
                style={{ width: "100%", minHeight: "200px", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: "8px", padding: "16px 20px", borderTop: "1px solid #eee", justifyContent: "flex-end" }}>
              <button className="admin-secondary-btn" onClick={() => setNotesModalOpen(false)}>취소</button>
              <button className="company-primary-btn" onClick={saveNotesModal}>저장</button>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div onClick={() => setShowPreview(false)} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 20px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "720px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #eee" }}>
              <span style={{ fontSize: "16px", fontWeight: 400 }}>공고 미리보기</span>
              <button onClick={() => setShowPreview(false)} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#888", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: "24px", maxHeight: "60vh", overflowY: "auto" }}>
              <JobPreview ref={previewRef}
                title={form.title}
                company={mode === "admin" ? (nonMember ? newCompanyName : companyName) : ""}
                jobGroupType={jobGroupType}
                categories={categories}
                career={form.career}
                employment={form.type}
                regions={regionList}
                salary={form.salary}
                salaryNego={salaryNego}
                deadline={form.deadline}
                alwaysOpen={alwaysOpen}
                benefitTags={benefitTags}
                benefits={form.benefits}
                description={form.description}
                requirements={form.requirements}
                preferred={form.preferred}
                hiringProcess={hiringProcess}
                notes={notes}
                detailImages={detailImages}
              />
            </div>
            <div style={{ display: "flex", gap: "8px", padding: "16px 20px", borderTop: "1px solid #eee", justifyContent: "flex-end" }}>
              <button className="admin-secondary-btn" onClick={handlePrint}>인쇄</button>
              <button className="admin-secondary-btn" onClick={handleDownloadPdf}>{isDownloading ? "저장 중..." : "PDF 다운로드"}</button>
              <button className="company-primary-btn" onClick={() => { setShowPreview(false); handleSubmit("publish"); }}>이대로 등록</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}