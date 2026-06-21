"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import ResumeTabs from "@/components/admin/ResumeTabs";
import ResumePreview from "@/components/profile/ResumePreview";
import { Search, Trash2, Download, X, Printer } from "lucide-react";

const DEGREE_LABEL: Record<string, string> = {
  HIGH_SCHOOL: "고등학교",
  COLLEGE: "전문대(2·3년제)",
  UNIVERSITY: "대학교(4년제)",
  MASTER: "대학원(석사)",
  DOCTOR: "대학원(박사)",
  ETC: "기타",
};
const GRAD_LABEL: Record<string, string> = {
  GRADUATED: "졸업",
  ENROLLED: "재학",
  DROPPED: "중퇴",
  EXPECTED: "졸업예정",
};
const CAREER_LABEL: Record<string, string> = {
  NEW: "신입",
  EXPERIENCED: "경력",
};

type Resume = {
  id: string;
  title: string | null;
  is_public: boolean;
  status: string;
  desired_location: string | null;
  desired_salary_min: number | null;
  desired_salary_max: number | null;
  desired_salary_type: string | null;
  career_type: string | null;
  created_at: string;
  updated_at: string;
  name: string;
  avatar_url: string | null;
  email: string;
  phone: string | null;
  gender: string | null;
  birth_date: string | null;
  job_category: string | null;
  skills: string[];
  school_name: string | null;
  degree: string | null;
  graduation_status: string | null;
};

function fmtDate(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

function calcAge(birth: string | null) {
  if (!birth) return null;
  const b = new Date(birth);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

function genderLabel(g: string | null) {
  if (g === "MALE" || g === "남" || g === "M") return "남";
  if (g === "FEMALE" || g === "여" || g === "F") return "여";
  return g || "-";
}

function salaryLabel(r: Resume) {
  if (r.desired_salary_type === "NEGOTIABLE" || (!r.desired_salary_min && !r.desired_salary_max)) return "회사내규";
  const fmt = (n: number | null) => (n == null ? "" : n.toLocaleString());
  if (r.desired_salary_min && r.desired_salary_max) return `${fmt(r.desired_salary_min)}~${fmt(r.desired_salary_max)}만원`;
  if (r.desired_salary_min) return `${fmt(r.desired_salary_min)}만원~`;
  return "회사내규";
}

function eduLabel(r: Resume) {
  if (!r.school_name) return "-";
  const deg = DEGREE_LABEL[r.degree || ""] || "";
  const grad = GRAD_LABEL[r.graduation_status || ""] || "";
  return `${deg} ${grad}`.trim() || r.school_name;
}

function isComplete(r: Resume) {
  return r.status === "PUBLISHED";
}

function AdminResumesPageInner() {
  const searchParams = useSearchParams();
  const previewId = searchParams.get("preview");
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [completeFilter, setCompleteFilter] = useState("전체");
  const [publicFilter, setPublicFilter] = useState("전체");
  const [selected, setSelected] = useState<Resume | null>(null);
  const [resumeData, setResumeData] = useState<any>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      await new Promise((r) => setTimeout(r, 300));
      const canvas = await html2canvas(previewRef.current, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff",
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
      pdf.save(selected?.name ? `${selected.name}_이력서.pdf` : "이력서.pdf");
    } catch (e) {
      alert("다운로드 중 오류가 발생했습니다.");
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

  // API 응답(snake_case) → ResumePreview props(camelCase) 변환
  const mapResume = (data: any) => {
    const p = data?.profile || {};
    return {
      careers: (data?.careers || []).map((c: any) => ({
        id: String(c.id), company: c.company || "", department: c.department || "",
        position: c.position || "", startDate: c.start_date || "", endDate: c.end_date || "",
        isVerified: c.is_verified || false, description: c.description || "",
      })),
      educations: (data?.educations || []).map((e: any) => ({
        id: String(e.id), school: e.school || "", major: e.major || "",
        status: e.status || "", startDate: e.start_date || "", endDate: e.end_date || "",
        description: e.description || "",
      })),
      experiences: (data?.experiences || []).map((x: any) => ({
        id: String(x.id), category: x.category || "", title: x.title || "", description: x.description || "",
      })),
      languages: (data?.languages || []).map((l: any) => ({
        id: String(l.id), language: l.language || "", level: l.level || "", test: l.test || "",
      })),
      links: (data?.links || []).map((lk: any) => ({
        id: String(lk.id), category: lk.category || "", url: lk.url || "",
      })),
      skills: p.skills || [],
      skillAreas: p.skill_areas || [],
      officeJobAreas: p.office_job_areas || [],
      certificates: p.certificates || [],
      intro: p.intro || "",
      coreCompetencies: p.core_competencies || "",
      workTypePrefer: p.work_type_prefer || "",
      regionPrefer: p.region_prefer || "",
    };
  };

  useEffect(() => {
    if (!selected) { setResumeData(null); return; }
    const token = localStorage.getItem("admin_token");
    setResumeLoading(true);
    fetch(`/api/admin/resumes/${selected.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => { if (res.success) setResumeData(res.data); })
      .catch(console.error)
      .finally(() => setResumeLoading(false));
  }, [selected?.id]);

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const fetchResumes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/resumes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setResumes(data.success ? data.data.items : []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchResumes(); }, [fetchResumes]);

  // ?preview=이력서id 로 진입 시 해당 이력서 미리보기 모달 자동 오픈
  useEffect(() => {
    if (!previewId || resumes.length === 0) return;
    const match = resumes.find((r) => String(r.id) === String(previewId));
    if (match) setSelected(match);
  }, [previewId, resumes]);

  const togglePublic = async (r: Resume) => {
    const next = !r.is_public;
    await fetch("/api/admin/resumes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: r.id, is_public: next }),
    });
    setResumes((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_public: next } : x)));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 이력서를 삭제하시겠습니까?")) return;
    await fetch(`/api/admin/resumes?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setResumes((prev) => prev.filter((x) => x.id !== id));
    setCheckedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    setSelected(null);
  };

  const handleBulkDelete = async () => {
    if (checkedIds.size === 0) return;
    if (!confirm(`선택한 ${checkedIds.size}건을 삭제하시겠습니까?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(
        Array.from(checkedIds).map((id) =>
          fetch(`/api/admin/resumes?id=${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      setResumes((prev) => prev.filter((x) => !checkedIds.has(x.id)));
      setCheckedIds(new Set());
      if (selected && checkedIds.has(selected.id)) setSelected(null);
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const filtered = resumes.filter((r) => {
    const matchSearch = !search || (r.name || "").includes(search) || (r.title || "").includes(search) || (r.job_category || "").includes(search);
    const matchComplete = completeFilter === "전체" || (completeFilter === "완성" ? isComplete(r) : !isComplete(r));
    const matchPublic = publicFilter === "전체" || (publicFilter === "공개" ? r.is_public : !r.is_public);
    return matchSearch && matchComplete && matchPublic;
  });

  const isAllChecked = filtered.length > 0 && filtered.every((r) => checkedIds.has(r.id));

  const toggleAll = () => {
    if (isAllChecked) {
      setCheckedIds((prev) => {
        const s = new Set(prev);
        filtered.forEach((r) => s.delete(r.id));
        return s;
      });
    } else {
      setCheckedIds((prev) => {
        const s = new Set(prev);
        filtered.forEach((r) => s.add(r.id));
        return s;
      });
    }
  };

  const total = resumes.length;
  const completeCnt = resumes.filter(isComplete).length;
  const publicCnt = resumes.filter((r) => r.is_public).length;
  const femaleCnt = resumes.filter((r) => genderLabel(r.gender) === "여").length;
  const maleCnt = resumes.filter((r) => genderLabel(r.gender) === "남").length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <AdminLayout activeMenu="resumes">
      <ResumeTabs />

      <div className="admin-resume-stat-grid">
        <div className="admin-resume-stat-card main">
          <div className="admin-rsc-label">전체 이력서</div>
          <div className="admin-rsc-value">{total.toLocaleString()}<span className="admin-mini-unit">건</span></div>
          <div className="admin-rsc-subs">
            <span className="admin-rsc-sub green">완성 {completeCnt}</span>
            <span className="admin-rsc-sub blue">공개 {publicCnt}</span>
          </div>
        </div>
        <div className="admin-resume-stat-card">
          <div className="admin-rsc-label">완성여부</div>
          <div className="admin-rsc-split">
            <div className="admin-rsc-split-item">
              <span className="admin-rsc-split-label">완성</span>
              <span className="admin-rsc-split-value green">{completeCnt}</span>
            </div>
            <div className="admin-rsc-divider" />
            <div className="admin-rsc-split-item">
              <span className="admin-rsc-split-label">미완성</span>
              <span className="admin-rsc-split-value orange">{total - completeCnt}</span>
            </div>
          </div>
          <div className="admin-rsc-bar">
            <div className="admin-rsc-bar-fill green" style={{width: `${pct(completeCnt)}%`}} />
          </div>
        </div>
        <div className="admin-resume-stat-card">
          <div className="admin-rsc-label">공개여부</div>
          <div className="admin-rsc-split">
            <div className="admin-rsc-split-item">
              <span className="admin-rsc-split-label">공개</span>
              <span className="admin-rsc-split-value blue">{publicCnt}</span>
            </div>
            <div className="admin-rsc-divider" />
            <div className="admin-rsc-split-item">
              <span className="admin-rsc-split-label">비공개</span>
              <span className="admin-rsc-split-value gray">{total - publicCnt}</span>
            </div>
          </div>
          <div className="admin-rsc-bar">
            <div className="admin-rsc-bar-fill blue" style={{width: `${pct(publicCnt)}%`}} />
          </div>
        </div>
        <div className="admin-resume-stat-card">
          <div className="admin-rsc-label">성별</div>
          <div className="admin-rsc-split">
            <div className="admin-rsc-split-item">
              <span className="admin-rsc-split-label">여성</span>
              <span className="admin-rsc-split-value purple">{femaleCnt}</span>
            </div>
            <div className="admin-rsc-divider" />
            <div className="admin-rsc-split-item">
              <span className="admin-rsc-split-label">남성</span>
              <span className="admin-rsc-split-value gray">{maleCnt}</span>
            </div>
          </div>
          <div className="admin-rsc-bar">
            <div className="admin-rsc-bar-fill purple" style={{width: `${pct(femaleCnt)}%`}} />
          </div>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="이름, 직군, 이력서 제목 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">완성여부</span>
            <div className="admin-filter-tabs">
              {["전체", "완성", "미완성"].map((f) => (
                <button key={f} className={`admin-filter-tab ${completeFilter === f ? "active" : ""}`}
                  onClick={() => setCompleteFilter(f)}>{f}</button>
              ))}
            </div>
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">공개여부</span>
            <div className="admin-filter-tabs">
              {["전체", "공개", "비공개"].map((f) => (
                <button key={f} className={`admin-filter-tab ${publicFilter === f ? "active" : ""}`}
                  onClick={() => setPublicFilter(f)}>{f}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-table-meta" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>총 <strong>{filtered.length}</strong>건</span>
          <button
            onClick={handleBulkDelete}
            disabled={checkedIds.size === 0 || bulkDeleting}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 6, border: "none",
              background: checkedIds.size ? "#e74c3c" : "#ededed",
              color: checkedIds.size ? "#fff" : "#aaa",
              fontSize: 13, fontWeight: 600,
              cursor: checkedIds.size ? "pointer" : "default",
            }}
          >
            <Trash2 size={15} /> {bulkDeleting ? "삭제 중..." : `선택 삭제${checkedIds.size ? ` (${checkedIds.size})` : ""}`}
          </button>
        </div>
        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "36px", textAlign: "center" }}>
                  <input type="checkbox" checked={isAllChecked} onChange={toggleAll} />
                </th>
                <th>이름</th>
                <th>직군</th>
                <th>경력</th>
                <th>희망지역</th>
                <th>완성</th>
                <th>공개</th>
                <th>연봉</th>
                <th>학력</th>
                <th>연락처</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const age = calcAge(r.birth_date);
                return (
                  <tr key={r.id} style={{ background: checkedIds.has(r.id) ? "#faf5ff" : "" }}>
                    <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checkedIds.has(r.id)}
                        onChange={() => toggleCheck(r.id)}
                      />
                    </td>
                    <td style={{ cursor: "pointer" }} onClick={() => setSelected(r)}>
                      <div className="admin-resume-member">
                        <div
                          className="admin-resume-photo"
                          style={{ overflow: "hidden" }}
                        >
                          {r.avatar_url ? (
                            <img src={r.avatar_url} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span>{(r.name || "?").slice(0, 1)}</span>
                          )}
                        </div>
                        <div className="admin-resume-member-info">
                          <strong style={{ color: "#5f0080" }}>{r.name}</strong>
                          <span>{genderLabel(r.gender)}{age ? ` · ${age}세` : ""}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="admin-resume-job" style={{ color: "#333", fontWeight: 600 }}>{r.job_category || "직군 미입력"}</span>
                    </td>
                    <td className="admin-td-date">{CAREER_LABEL[r.career_type || ""] || "-"}</td>
                    <td className="admin-td-date">{r.desired_location || "-"}</td>
                    <td>
                      <span className={`admin-badge ${isComplete(r) ? "admin-badge-success" : "admin-badge-warning"}`}>
                        {isComplete(r) ? "완성" : "미완성"}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="admin-toggle-wrap">
                        <label className="admin-toggle">
                          <input type="checkbox" checked={r.is_public} onChange={() => togglePublic(r)} />
                          <span className="admin-toggle-slider" />
                        </label>
                        <span className={`admin-toggle-label ${r.is_public ? "on" : "off"}`}>
                          {r.is_public ? "공개" : "비공개"}
                        </span>
                      </div>
                    </td>
                    <td className="admin-td-date">{salaryLabel(r)}</td>
                    <td className="admin-td-date" style={{fontSize:"11px"}}>{eduLabel(r)}</td>
                    <td className="admin-td-date">
                      <div>{r.email}</div>
                      <div>{r.phone || "-"}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && <div className="admin-empty">검색 결과가 없습니다.</div>}
      </div>
{selected && (
        <div className="rp-modal-overlay" onClick={() => setSelected(null)}>
          <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rp-modal-header">
              <h2 className="rp-modal-title">이력서 미리보기</h2>
              <div className="rp-modal-actions">
                <button className="resume-action-btn" onClick={handleDownloadPdf} disabled={isDownloading || resumeLoading}>
                  <Download size={16} />
                  <span>{isDownloading ? "저장 중..." : "PDF 다운로드"}</span>
                </button>
                <button className="resume-action-btn" onClick={handlePrint}>
                  <Printer size={16} />
                  <span>인쇄</span>
                </button>
                <button className="resume-action-btn" onClick={() => handleDelete(selected.id)}
                  style={{ color: "#ef4444", borderColor: "#ef4444" }}>
                  <Trash2 size={16} />
                  <span>삭제</span>
                </button>
                <button className="rp-modal-close" onClick={() => setSelected(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="rp-modal-body">
              {resumeLoading ? (
                <div style={{ padding: "60px", textAlign: "center", color: "#888" }}>불러오는 중...</div>
              ) : resumeData ? (
                <ResumePreview
                  ref={previewRef}
                  name={selected.name}
                  birthDisplay={selected.birth_date ? `${String(selected.birth_date).slice(0, 4)}년 (${new Date().getFullYear() - Number(String(selected.birth_date).slice(0, 4))}세, ${selected.gender === "FEMALE" ? "여" : selected.gender === "MALE" ? "남" : ""})` : ""}
                  jobDisplay={selected.job_category || ""}
                  phone={selected.phone || ""}
                  email={selected.email || ""}
                  portfolioUrl={resumeData?.resume?.portfolio_url || null}
                  portfolioFilename={resumeData?.resume?.portfolio_filename || null}
                  avatarUrl={resumeData?.resume?.avatar_url || null}
                  resumeType={resumeData?.resume?.job_type === "STORE" ? "salon" : "office"}
                  {...mapResume(resumeData)}
                />
              ) : (
                <div style={{ padding: "60px", textAlign: "center", color: "#888" }}>이력서 정보가 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}

      
    </AdminLayout>
  );
}

export default function AdminResumesPage() {
  return (
    <Suspense fallback={<AdminLayout activeMenu="resumes"><div className="admin-empty">불러오는 중...</div></AdminLayout>}>
      <AdminResumesPageInner />
    </Suspense>
  );
}