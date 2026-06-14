"use client";
import { useState, useEffect, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import JobGroupField from "@/components/JobGroupField";
import RegionSelectModal from "@/components/RegionSelectModal";

const CAREER_OPTIONS = ["신입", "1년 이상", "2년 이상", "3년 이상", "5년 이상", "경력 무관"];
const EMPLOYMENT_TYPES = ["정규직", "계약직", "인턴", "아르바이트", "프리랜서"];
const BENEFIT_OPTIONS: Record<string, string[]> = {
  매장: ["기숙사 제공", "교육비 지원", "인센티브", "4대보험", "주말·공휴일 휴무", "정규직 전환", "식대 지원", "주차 가능"],
  기업: ["4대보험", "인센티브", "정규직 전환", "재택근무", "유연근무", "자기계발비", "식대 지원", "주차 가능"],
};

type Company = { id: string; company_name: string; brand_name: string | null };

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
      const salary = j.salary_min
        ? (j.salary_max ? `${j.salary_min / 10000}-${j.salary_max / 10000}만원` : `${j.salary_min / 10000}만원`)
        : "";
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
      if (j.job_type) setJobGroupType(j.job_type === "STORE" ? "매장" : "기업");
      if (j.company_id) setCompanyId(j.company_id);
    }).catch(console.error);
  }, [editId, loadEditData]);

  const showTypeToggle = mode === "admin" || companyType === "BOTH";

  const addProcessStep = () => {
    if (hiringProcess.length >= 6) { alert("채용 절차는 최대 6단계까지 추가할 수 있어요."); return; }
    setHiringProcess([...hiringProcess, ""]);
  };
  const updateProcessStep = (idx: number, value: string) =>
    setHiringProcess(hiringProcess.map((s, i) => (i === idx ? value : s)));
  const removeProcessStep = (idx: number) =>
    setHiringProcess(hiringProcess.filter((_, i) => i !== idx));

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
    if (!form.description.trim() && status === "publish") {
      const proceed = confirm(
        "상세 설명 없이 이미지만 등록하면 구직자 검색에 잘 노출되지 않을 수 있어요.\n\n검색 노출을 높이려면 '포지션 소개'에 텍스트를 입력하는 것을 권장해요.\n\n그래도 이대로 등록하시겠어요?"
      );
      if (!proceed) return;
    }

    const expLevel = form.career.includes("신입") ? "NEW"
      : form.career.match(/\d+년/) ? "EXPERIENCED" : "ANY";
    const workType = form.type === "파트타임" ? "PART_TIME"
      : form.type === "계약직" ? "CONTRACT" : "FULL_TIME";
    let salaryMin: number | null = null, salaryMax: number | null = null;
    const salaryNums = form.salary.match(/\d+/g);
    if (salaryNums && salaryNums.length > 0) {
      salaryMin = parseInt(salaryNums[0]) * 10000;
      if (salaryNums.length > 1) salaryMax = parseInt(salaryNums[1]) * 10000;
    }

    const payload: any = {
      title: form.title,
      job_type: jobGroupType === "기업" ? "OFFICE" : "STORE",
      description: form.description || null,
      requirements: form.requirements || null,
      preferred_qualifications: form.preferred || null,
      benefits: form.benefits || null,
      salary_min: salaryMin, salary_max: salaryMax,
      salary_type: salaryMin ? "ANNUAL" : null,
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

  return (
    <>
      <div className="admin-form-header">
        <button className="admin-back-btn" onClick={() => router.push(listHref)}>
          <ChevronLeft size={18} /> 목록으로
        </button>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
          {editId ? "채용공고 수정" : "채용공고 등록"}
        </h2>
        <div className="admin-form-actions">
          <button className="admin-secondary-btn" onClick={() => handleSubmit("draft")}>임시저장</button>
          <button className="company-primary-btn" onClick={() => handleSubmit("publish")}>
            {saved ? (editId ? "✅ 수정완료" : "✅ 등록완료") : (editId ? "공고 수정" : "공고 등록")}
          </button>
        </div>
      </div>

      <div className="admin-form-grid">
        {/* 기본 정보 */}
        <div className="company-card" style={{ overflow: "visible" }}>
          <div className="company-card-head"><h2 className="company-card-title">기본 정보</h2></div>
          <div className="admin-form-body">

            {mode === "admin" && (
              <div className="admin-form-row">
                <label className="admin-form-label">기업 선택 *</label>

                {nonMember ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <input className="admin-form-input" placeholder="회사명 (필수)"
                      value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} />
                    <input className="admin-form-input" placeholder="브랜드명 (선택)"
                      value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} />
                    <button type="button"
                      onClick={() => { setNonMember(false); setNewCompanyName(""); setNewBrandName(""); }}
                      style={{ alignSelf: "flex-start", background: "none", border: "none", color: "#5f0080", fontSize: "13px", fontWeight: 600, cursor: "pointer", padding: 0 }}>
                      ← 회원 기업에서 선택
                    </button>
                  </div>
                ) : companyId ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "12px 16px", background: "#faf5ff", border: "1px solid #ede0f8", borderRadius: "8px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#5f0080" }}>{companyName}</span>
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
                      style={{ marginTop: "8px", background: "none", border: "none", color: "#5f0080", fontSize: "13px", fontWeight: 600, cursor: "pointer", padding: 0 }}>
                      + 비회원 기업으로 직접 입력
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="admin-form-row">
              <label className="admin-form-label">채용 유형{showTypeToggle ? " *" : ""}</label>
              {showTypeToggle ? (
                <div style={{ display: "flex", gap: "8px" }}>
                  {[{ value: "기업", label: "🏢 기업·브랜드 채용" }, { value: "매장", label: "🏪 매장·살롱 채용" }].map((t) => (
                    <button key={t.value} type="button"
                      onClick={() => { setJobGroupType(t.value as "기업" | "매장"); setCategories([]); }}
                      style={{
                        flex: 1, padding: "12px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
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
                  padding: "12px 16px", background: "#faf5ff", border: "1px solid #ede0f8",
                  borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#5f0080" }}>
                    {jobGroupType === "기업" ? "🏢 기업·브랜드 채용" : "🏪 매장·살롱 채용"}
                  </span>
                  <span style={{ fontSize: "11px", color: "#888" }}>회사 정보에 따라 자동 설정</span>
                </div>
              )}
            </div>

            <div className="admin-form-row">
              <label className="admin-form-label">공고 제목 *</label>
              <input className="admin-form-input"
                placeholder={jobGroupType === "매장" ? "예) 네일 아티스트 모집" : "예) 마케팅 매니저 (색조)"}
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <div className="admin-form-row">
              <label className="admin-form-label">
                {jobGroupType === "매장" ? "시술 분야 * (복수 선택 가능)" : "직군 * (복수 선택 가능)"}
              </label>
              <JobGroupField
                jobType={jobGroupType === "기업" ? "OFFICE" : "STORE"}
                value={categories} onChange={setCategories} maxSelect={5}
                placeholder={jobGroupType === "매장" ? "시술 분야를 선택해주세요" : "직군을 선택해주세요"} />
            </div>

            <div className="admin-form-row-2col">
              <div className="admin-form-row">
                <label className="admin-form-label">경력 *</label>
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
              <label className="admin-form-label">근무지역 *</label>
              <button type="button" onClick={() => setRegionModalOpen(true)}
                style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "1px solid #ddd", borderRadius: "8px", background: "#fff", fontSize: "14px", color: regionList.length ? "#1a1a1a" : "#999", cursor: "pointer" }}>
                {regionList.length ? `${regionList.length}개 지역 선택됨` : "지역을 선택해주세요"}
              </button>
              {regionList.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                  {regionList.map((r) => (
                    <span key={r} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", background: "#faf5ff", border: "1px solid #ede0f8", borderRadius: "999px", fontSize: "13px", color: "#5f0080" }}>
                      {r}
                      <button type="button" onClick={() => setRegionList(regionList.filter((x) => x !== r))}
                        style={{ background: "none", border: "none", color: "#5f0080", cursor: "pointer", fontSize: "14px", lineHeight: "1", padding: 0 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-form-row-2col">
              <div className="admin-form-row">
                <label className="admin-form-label">{jobGroupType === "매장" ? "급여" : "연봉"}</label>
                <input className="admin-form-input"
                  placeholder={jobGroupType === "매장" ? "예) 월 250만원" : "예) 4,000~5,000만원"}
                  value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
              </div>
              <div className="admin-form-row">
                <label className="admin-form-label">마감일</label>
                <input type="date" className="admin-form-input"
                  min={new Date().toISOString().slice(0, 10)}
                  value={form.deadline}
                  disabled={alwaysOpen}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  style={alwaysOpen ? { background: "#f5f5f5", color: "#aaa", cursor: "not-allowed" } : undefined} />
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

        {/* 채용 절차 */}
        <div className="company-card" style={{ overflow: "visible" }}>
          <div className="company-card-head"><h2 className="company-card-title">채용 절차</h2></div>
          <div className="admin-form-body">
            <p style={{ fontSize: "13px", color: "#888", margin: "0 0 4px" }}>
              지원자가 거치는 전형 단계를 순서대로 입력하세요. (예: 서류 전형 → 면접 → 최종 합격)
            </p>
            {hiringProcess.map((step, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ flexShrink: 0, width: "28px", height: "28px", borderRadius: "50%",
                  background: "#f5f3ff", color: "#5f0080", fontSize: "13px", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>{idx + 1}</span>
                <input className="admin-form-input" style={{ flex: 1 }}
                  placeholder={`${idx + 1}단계 (예: 서류 전형)`}
                  value={step} onChange={(e) => updateProcessStep(idx, e.target.value)} />
                <button type="button" onClick={() => removeProcessStep(idx)}
                  style={{ flexShrink: 0, width: "32px", height: "32px", borderRadius: "8px",
                    border: "1px solid #eee", background: "#fff", color: "#888", cursor: "pointer",
                    fontSize: "16px", lineHeight: "1" }}>×</button>
              </div>
            ))}
            {hiringProcess.length < 6 && (
              <button type="button" onClick={addProcessStep}
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 16px",
                  border: "1.5px dashed #c4b5d4", borderRadius: "8px", cursor: "pointer",
                  color: "#5f0080", fontSize: "14px", fontWeight: 500, background: "#fdfbff", width: "fit-content" }}>
                + 단계 추가
              </button>
            )}
            <div className="admin-form-row" style={{ marginTop: "20px" }}>
              <label className="admin-form-label">비고 · 유의사항 <span style={{ color: "#888", fontWeight: 400, fontSize: "13px" }}>(선택)</span></label>
              <textarea className="admin-form-textarea" rows={4}
                placeholder="지원 시 유의사항이나 안내문을 자유롭게 입력하세요.&#10;예) ※ 서류 합격자에 한하여 개별 연락드립니다.&#10;※ 3개월 수습 후 정규직 전환 평가가 진행됩니다."
                value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

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
            {[
              { key: "description", label: "포지션 소개 (검색 노출 권장)", placeholder: "이 포지션에 대한 소개를 입력하세요. 비워두고 상세 이미지로 대체할 수도 있어요." },
              { key: "requirements", label: "자격요건", placeholder: "필수 자격요건을 입력하세요" },
              { key: "preferred", label: "우대사항", placeholder: "우대사항을 입력하세요" },
              { key: "benefits", label: jobGroupType === "매장" ? "근무조건·복지" : "복리후생", placeholder: "복리후생을 입력하세요" },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="admin-form-row">
                <label className="admin-form-label">{label}</label>
                <textarea className="admin-form-textarea" placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}

            <div className="admin-form-row">
              <label className="admin-form-label">
                상세 이미지 첨부 <span style={{ color: "#888", fontWeight: 400, fontSize: "13px" }}>(선택, 최대 5장 · 각 5MB)</span>
              </label>
              <p style={{ fontSize: "13px", color: "#888", margin: "0 0 12px" }}>
                직접 디자인한 채용 공고 이미지나 매장 사진을 첨부할 수 있어요. 단, 검색 노출을 위해 위 텍스트 항목도 함께 작성해주세요.
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
                  color: "#5f0080", fontSize: "14px", fontWeight: 500, background: "#fdfbff" }}>
                  {uploading ? "업로드 중..." : "+ 이미지 추가"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple
                    disabled={uploading} onChange={handleImageUpload} style={{ display: "none" }} />
                </label>
              )}
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
    </>
  );
}
