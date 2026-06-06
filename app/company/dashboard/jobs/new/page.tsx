"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import {
  Briefcase, Users, FileText, Settings,
  Bell, LogOut, ChevronLeft
} from "lucide-react";
import { companyMeApi } from "@/lib/api/company";
import { OFFICE_JOB_GROUPS, STORE_SKILL_AREAS } from "@/lib/constants";



const REGIONS = ["서울", "경기·인천", "부산·경남", "대구·경북", "광주·전남", "대전·충청", "기타 지방", "글로벌"];
const CAREER_OPTIONS = ["신입", "1년 이상", "2년 이상", "3년 이상", "5년 이상", "경력 무관"];
const EMPLOYMENT_TYPES = ["정규직", "계약직", "인턴", "아르바이트", "프리랜서"];

export default function CompanyJobNewPage() {
  const router = useRouter();
  const [jobGroupType, setJobGroupType] = useState<"기업" | "매장">("기업");
  const [companyType, setCompanyType] = useState<"OFFICE" | "STORE" | "BOTH" | null>(null);

  // 회사 타입에 맞게 jobGroupType 자동 설정
  useEffect(() => {
    companyMeApi.get()
      .then(res => {
        const type = res.data.company_type;
        setCompanyType(type);
        if (type === "BOTH") {
          setJobGroupType("기업"); // BOTH면 기본값 기업, UI에서 선택 가능
        } else {
          setJobGroupType(type === "STORE" ? "매장" : "기업");
        }
      })
      .catch(console.error);
  }, []);
  const [categories, setCategories] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "", career: "", region: "",
    type: "정규직", deadline: "", salary: "", description: "",
    requirements: "", preferred: "", benefits: "",
  });
  const [saved, setSaved] = useState(false);
  const [detailImages, setDetailImages] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hiringProcess, setHiringProcess] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const addProcessStep = () => {
    if (hiringProcess.length >= 6) { alert("채용 절차는 최대 6단계까지 추가할 수 있어요."); return; }
    setHiringProcess([...hiringProcess, ""]);
  };
  const updateProcessStep = (idx: number, value: string) => {
    setHiringProcess(hiringProcess.map((s, i) => (i === idx ? value : s)));
  };
  const removeProcessStep = (idx: number) => {
    setHiringProcess(hiringProcess.filter((_, i) => i !== idx));
  };
  const chipOptions = jobGroupType === "매장" ? STORE_SKILL_AREAS : OFFICE_JOB_GROUPS;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (detailImages.length + files.length > 5) {
      alert("이미지는 최대 5장까지 첨부할 수 있습니다.");
      return;
    }
    const token = localStorage.getItem("access_token");
    if (!token) { alert("로그인이 필요합니다."); return; }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/company/jobs/upload-image", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const data = await res.json();
        if (data.success) {
          setDetailImages((prev) => [...prev, { url: data.data.url, name: data.data.name }]);
        } else {
          alert(data.error?.message || "이미지 업로드에 실패했습니다.");
        }
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setDetailImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (status: "draft" | "publish") => {
    if (!form.title.trim()) { alert("공고 제목을 입력해주세요."); return; }
    if (categories.length === 0) { alert(jobGroupType === "매장" ? "시술 분야를 선택해주세요." : "직군을 선택해주세요."); return; }
    if (!form.career.trim()) { alert("경력 조건을 입력해주세요."); return; }
    if (!form.region.trim()) { alert("근무지역을 입력해주세요."); return; }
    // 본문 텍스트가 비어있고 이미지만 올린 경우: 검색 노출 경고 후 선택
    if (!form.description.trim() && status === "publish") {
      const proceed = confirm(
        "상세 설명 없이 이미지만 등록하면 구직자 검색에 잘 노출되지 않을 수 있어요.\n\n검색 노출을 높이려면 '포지션 소개'에 텍스트를 입력하는 것을 권장해요.\n\n그래도 이대로 등록하시겠어요?"
      );
      if (!proceed) return;
    }
    const token = localStorage.getItem("access_token");
    if (!token) { alert("로그인이 필요합니다."); return; }

    // 경력 매핑: "신입"→NEW, "경력 X년"→EXPERIENCED, 그 외 ANY
    const expLevel = form.career.includes("신입") ? "NEW"
      : form.career.match(/\d+년/) ? "EXPERIENCED"
      : "ANY";

    // 근무형태 매핑: "정규직"→FULL_TIME, "파트타임"→PART_TIME, "계약직"→CONTRACT
    const workType = form.type === "파트타임" ? "PART_TIME"
      : form.type === "계약직" ? "CONTRACT"
      : "FULL_TIME";

    // 연봉 파싱: "3000-5000만원" 형태에서 숫자 추출
    let salaryMin = null, salaryMax = null;
    const salaryNums = form.salary.match(/\d+/g);
    if (salaryNums && salaryNums.length > 0) {
      salaryMin = parseInt(salaryNums[0]) * 10000;
      if (salaryNums.length > 1) salaryMax = parseInt(salaryNums[1]) * 10000;
    }

    try {
      const res = await fetch("/api/company/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title,
          job_type: jobGroupType === "기업" ? "OFFICE" : "STORE",
          description: form.description || null,
          requirements: form.requirements || null,
          preferred_qualifications: form.preferred || null,
          salary_min: salaryMin,
          salary_max: salaryMax,
          salary_type: salaryMin ? "ANNUAL" : null,
          location: form.region || null,
          work_type: workType,
          experience_level: expLevel,
          deadline: form.deadline || null,
          categories,
          detail_images: detailImages,
          hiring_process: hiringProcess.filter((s) => s.trim()),
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error?.message || "공고 등록에 실패했습니다.");
        return;
      }
      setSaved(true);
      setTimeout(() => router.push("/company/dashboard/jobs"), 1000);
    } catch (e) {
      alert("네트워크 오류가 발생했습니다.");
    }
  };

  return (
    <CompanyLayout activePage="jobs">
      <div className="admin-form-header">
        <button className="admin-back-btn" onClick={() => router.push("/company/dashboard/jobs")}>
          <ChevronLeft size={18} /> 목록으로
        </button>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
          채용공고 등록
        </h2>
        <div className="admin-form-actions">
          <button className="admin-secondary-btn" onClick={() => handleSubmit("draft")}>임시저장</button>
          <button className="company-primary-btn" onClick={() => handleSubmit("publish")}>
            {saved ? "✅ 등록완료" : "공고 등록"}
          </button>
        </div>
      </div>

      <div className="admin-form-grid">
        {/* 기본 정보 */}
        <div className="company-card" style={{overflow:"visible"}}>
          <div className="company-card-head"><h2 className="company-card-title">기본 정보</h2></div>
          <div className="admin-form-body">
            {/* 채용 유형 (회사 타입에 따라 자동 설정) */}
            <div className="admin-form-row">
              <label className="admin-form-label">채용 유형</label>
              {companyType === "BOTH" ? (
                <div style={{ display: "flex", gap: "8px" }}>
                  {[{ value: "기업", label: "🏢 기업·브랜드 채용" }, { value: "매장", label: "🏪 매장·살롱 채용" }].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => { setJobGroupType(t.value as "기업" | "매장"); setCategories([]); }}
                      style={{
                        flex: 1, padding: "12px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                        border: jobGroupType === t.value ? "2px solid #5f0080" : "2px solid #e0e0e0",
                        background: jobGroupType === t.value ? "#faf5ff" : "#fff",
                        color: jobGroupType === t.value ? "#5f0080" : "#888",
                        cursor: "pointer",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: "12px 16px", background: "#faf5ff",
                  border: "1px solid #ede0f8", borderRadius: "8px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
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
                value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} />
            </div>

            <div className="admin-form-row">
              <label className="admin-form-label">
                {jobGroupType === "매장" ? "시술 분야 * (복수 선택 가능)" : "직군 * (복수 선택 가능)"}
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                {chipOptions.map((c) => {
                  const active = categories.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setCategories(active ? categories.filter((x) => x !== c) : [...categories, c])
                      }
                      style={{
                        padding: "8px 16px",
                        borderRadius: "20px",
                        border: active ? "1.5px solid #e84a5f" : "1.5px solid #e0e0e0",
                        background: active ? "#fef0f2" : "#fff",
                        color: active ? "#e84a5f" : "#666",
                        fontSize: "14px",
                        fontWeight: active ? 600 : 400,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="admin-form-row-2col">
              <div className="admin-form-row">
                <label className="admin-form-label">경력 *</label>
                <select className="admin-form-select" value={form.career}
                  onChange={(e) => setForm({...form, career: e.target.value})}>
                  <option value="">선택</option>
                  {CAREER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="admin-form-row">
                <label className="admin-form-label">고용형태</label>
                <select className="admin-form-select" value={form.type}
                  onChange={(e) => setForm({...form, type: e.target.value})}>
                  {EMPLOYMENT_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div className="admin-form-row">
              <label className="admin-form-label">근무지역 *</label>
              <select className="admin-form-select" value={form.region}
                onChange={(e) => setForm({...form, region: e.target.value})}>
                <option value="">선택</option>
                {REGIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div className="admin-form-row-2col">
              <div className="admin-form-row">
                <label className="admin-form-label">{jobGroupType === "매장" ? "급여" : "연봉"}</label>
                <input className="admin-form-input"
                  placeholder={jobGroupType === "매장" ? "예) 월 250만원" : "예) 4,000~5,000만원"}
                  value={form.salary} onChange={(e) => setForm({...form, salary: e.target.value})} />
              </div>
              <div className="admin-form-row">
                <label className="admin-form-label">마감일</label>
                <input className="admin-form-input" placeholder="예) 2025.02.28"
                  value={form.deadline} onChange={(e) => setForm({...form, deadline: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        {/* 채용 절차 */}
        <div className="company-card" style={{overflow:"visible"}}>
          <div className="company-card-head"><h2 className="company-card-title">채용 절차</h2></div>
          <div className="admin-form-body">
            <p style={{fontSize:"13px", color:"#888", margin:"0 0 4px"}}>
              지원자가 거치는 전형 단계를 순서대로 입력하세요. (예: 서류 전형 → 면접 → 최종 합격)
            </p>
            {hiringProcess.map((step, idx) => (
              <div key={idx} style={{display:"flex", alignItems:"center", gap:"8px"}}>
                <span style={{flexShrink:0, width:"28px", height:"28px", borderRadius:"50%",
                  background:"#f5f3ff", color:"#5f0080", fontSize:"13px", fontWeight:700,
                  display:"flex", alignItems:"center", justifyContent:"center"}}>{idx + 1}</span>
                <input className="admin-form-input" style={{flex:1}}
                  placeholder={`${idx + 1}단계 (예: 서류 전형)`}
                  value={step}
                  onChange={(e) => updateProcessStep(idx, e.target.value)} />
                <button type="button" onClick={() => removeProcessStep(idx)}
                  style={{flexShrink:0, width:"32px", height:"32px", borderRadius:"8px",
                    border:"1px solid #eee", background:"#fff", color:"#888", cursor:"pointer",
                    fontSize:"16px", lineHeight:"1"}}>×</button>
              </div>
            ))}
            {hiringProcess.length < 6 && (
              <button type="button" onClick={addProcessStep}
                style={{display:"inline-flex", alignItems:"center", gap:"8px", padding:"10px 16px",
                  border:"1.5px dashed #c4b5d4", borderRadius:"8px", cursor:"pointer",
                  color:"#5f0080", fontSize:"14px", fontWeight:500, background:"#fdfbff",
                  width:"fit-content"}}>
                + 단계 추가
              </button>
            )}

            <div className="admin-form-row" style={{marginTop:"20px"}}>
              <label className="admin-form-label">비고 · 유의사항 <span style={{color:"#888", fontWeight:400, fontSize:"13px"}}>(선택)</span></label>
              <textarea className="admin-form-textarea" rows={4}
                placeholder="지원 시 유의사항이나 안내문을 자유롭게 입력하세요.&#10;예) ※ 서류 합격자에 한하여 개별 연락드립니다.&#10;※ 3개월 수습 후 정규직 전환 평가가 진행됩니다."
                value={notes}
                onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>
        {/* 상세 내용 */}
        <div className="company-card" style={{overflow:"visible"}}>
          <div className="company-card-head"><h2 className="company-card-title">상세 내용</h2></div>
          <div className="admin-form-body">
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
                  onChange={(e) => setForm({...form, [key]: e.target.value})} />
              </div>
            ))}

            <div className="admin-form-row">
              <label className="admin-form-label">
                상세 이미지 첨부 <span style={{color:"#888", fontWeight:400, fontSize:"13px"}}>(선택, 최대 5장 · 각 5MB)</span>
              </label>
              <p style={{fontSize:"13px", color:"#888", margin:"0 0 12px"}}>
                직접 디자인한 채용 공고 이미지나 매장 사진을 첨부할 수 있어요. 단, 검색 노출을 위해 위 텍스트 항목도 함께 작성해주세요.
              </p>

              {detailImages.length > 0 && (
                <div style={{display:"flex", flexWrap:"wrap", gap:"12px", marginBottom:"12px"}}>
                  {detailImages.map((img, idx) => (
                    <div key={idx} style={{position:"relative", width:"120px"}}>
                      <img src={img.url} alt={img.name}
                        style={{width:"120px", height:"120px", objectFit:"cover", borderRadius:"8px", border:"1px solid #eee"}} />
                      <button type="button" onClick={() => removeImage(idx)}
                        style={{position:"absolute", top:"4px", right:"4px", width:"24px", height:"24px",
                          borderRadius:"50%", background:"rgba(0,0,0,0.6)", color:"#fff", border:"none",
                          cursor:"pointer", fontSize:"14px", lineHeight:"1", display:"flex",
                          alignItems:"center", justifyContent:"center"}}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {detailImages.length < 5 && (
                <label style={{display:"inline-flex", alignItems:"center", gap:"8px", padding:"10px 16px",
                  border:"1.5px dashed #c4b5d4", borderRadius:"8px", cursor: uploading ? "wait" : "pointer",
                  color:"#5f0080", fontSize:"14px", fontWeight:500, background:"#fdfbff"}}>
                  {uploading ? "업로드 중..." : "+ 이미지 추가"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple
                    disabled={uploading} onChange={handleImageUpload} style={{display:"none"}} />
                </label>
              )}
            </div>
          </div>
        </div>

      </div>
    </CompanyLayout>
  );
}
