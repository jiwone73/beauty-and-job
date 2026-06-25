"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, FileText, Bookmark, Paperclip } from "lucide-react";
import { genderLabel, calcAge, calcCareerYears } from "@/lib/memberFormat";
import Link from "next/link";
import CompanyLayout from "@/components/company/CompanyLayout";
import ResumePreview from "@/components/profile/ResumePreview";
import { companyApplicationsApi } from "@/lib/api/company";
import type { CompanyApplication, ApplicationStatus } from "@/lib/types/company";

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  APPLIED: "신규",
  VIEWED: "검토중",
  INTERVIEW: "면접예정",
  PASSED: "합격",
  REJECTED: "불합격",
};

const STATUS_BADGE_CLASS: Record<ApplicationStatus, string> = {
  APPLIED: "company-badge-info",
  VIEWED: "company-badge-warning",
  INTERVIEW: "company-badge-info",
  PASSED: "company-badge-success",
  REJECTED: "company-badge-danger",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function ApplicantsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdFilter = searchParams.get("job_id") || "";

  const [applicants, setApplicants] = useState<CompanyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("전체");
  const [selected, setSelected] = useState<CompanyApplication | null>(null);
  const [resumeData, setResumeData] = useState<any>(null);
  const [coverLetter, setCoverLetter] = useState<string>("");
  const [resumeLoading, setResumeLoading] = useState(false);
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
  // selected 변경 시 이력서 데이터 fetch
  useEffect(() => {
    if (!selected) {
      setResumeData(null);
      setCoverLetter("");
      return;
    }
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setResumeLoading(true);
    fetch(`/api/company/applications/${selected.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          if (res.data.resume) setResumeData(res.data.resume);
          setCoverLetter(res.data.cover_letter || "");
        }
      })
      .catch(console.error)
      .finally(() => setResumeLoading(false));
  }, [selected?.id]);

  const loadApplicants = async () => {
    setLoading(true);
    try {
      const res = await companyApplicationsApi.list({
        ...(jobIdFilter ? { job_id: jobIdFilter } : {}),
        limit: 100,
      });
      setApplicants(res.data);
    } catch (e) {
      console.error("[loadApplicants]", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplicants();
  }, [jobIdFilter]);

  const filtered = applicants.filter(a => {
    const matchSearch = !search || a.user_name.includes(search);
    const matchStatus = statusFilter === "전체" || STATUS_LABEL[a.status] === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    try {
      await companyApplicationsApi.updateStatus(id, status);
      setApplicants(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
    } catch (e) {
      alert("상태 변경 중 오류가 발생했습니다.");
      console.error("[handleStatusChange]", e);
    }
  };

  const counts = {
    전체: applicants.length,
    신규: applicants.filter(a => a.status === "APPLIED").length,
    검토중: applicants.filter(a => a.status === "VIEWED").length,
    면접예정: applicants.filter(a => a.status === "INTERVIEW").length,
    합격: applicants.filter(a => a.status === "PASSED").length,
    불합격: applicants.filter(a => a.status === "REJECTED").length,
  };

  return (
    <CompanyLayout activePage="applicants">
      <div className="company-stat-grid">
        {[
          { label: "전체 지원자", value: String(counts.전체), unit: "명", color: "#5f0080" },
          { label: "신규", value: String(counts.신규), unit: "명", color: "#0ea5e9" },
          { label: "검토중", value: String(counts.검토중), unit: "명", color: "#f59e0b" },
          { label: "면접예정", value: String(counts.면접예정), unit: "명", color: "#3b82f6" },
          { label: "합격", value: String(counts.합격), unit: "명", color: "#10b981" },
          { label: "불합격", value: String(counts.불합격), unit: "명", color: "#888" },
        ].map((s) => (
          <div key={s.label} className="company-stat-card">
            <div className="company-stat-value" style={{color: s.color}}>
              {s.value}<span className="company-stat-unit">{s.unit}</span>
            </div>
            <div className="company-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {jobIdFilter && (
        <div style={{
          background: "#faf5ff",
          border: "1px solid #ede0f8",
          borderRadius: "10px",
          padding: "12px 16px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ fontSize: "13px", color: "#5f0080", fontWeight: 600 }}>
            특정 공고의 지원자만 표시 중
          </span>
          <button
            onClick={() => router.push("/company/dashboard/applicants")}
            style={{
              border: "1px solid #5f0080",
              background: "#fff",
              color: "#5f0080",
              padding: "4px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            전체 보기
          </button>
        </div>
      )}

      <div className="company-toolbar">
        <div className="company-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="지원자 이름 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">상태</span>
            <div className="admin-filter-tabs">
              {["전체", "신규", "검토중", "면접예정", "합격", "불합격"].map(s => (
                <button key={s} className={`admin-filter-tab ${statusFilter === s ? "active" : ""}`}
                  onClick={() => setStatusFilter(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="company-card" style={{ padding: "60px 20px", textAlign: "center", color: "#888" }}>
          불러오는 중...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="company-card" style={{ padding: "60px 20px", textAlign: "center", color: "#888" }}>
          {applicants.length === 0
            ? "아직 지원자가 없어요."
            : "조건에 맞는 지원자가 없어요."}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="company-card">
          <div className="admin-table-meta">총 <strong>{filtered.length}</strong>명</div>
          <table className="company-table">
            <thead>
              <tr>
                <th>이름</th>
                <th>지원 공고</th>
                <th>지원일</th>
                <th>연락처</th>
                <th>상태</th>
                <th>이력서/포트폴리오</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, width: 160, flexShrink: 0 }}>
                      <div className="talent-avatar" style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#5f0080", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {(a as any).user_avatar_url
                          ? <img src={(a as any).user_avatar_url} alt={a.user_name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : (a.user_name || "?").slice(0, 1)}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ cursor: "pointer", color: "#5f0080", fontWeight: 600, fontSize: 14 }}
                            onClick={() => setSelected(a)}>{a.user_name}</span>
                          {genderLabel((a as any).user_gender) && (
                            <span style={{ fontSize: 11, fontWeight: 400, color: "#999" }}>{genderLabel((a as any).user_gender)}</span>
                          )}
                        </div>
                        <span style={{ fontSize: 12, color: "#888" }}>
                          {(() => {
                            const age = calcAge((a as any).user_birth_date);
                            const ct = (a as any).career_type;
                            const career = ct === "NEWCOMER"
                              ? "신입"
                              : (() => { const y = calcCareerYears((a as any).recent_start_date); return y ? `경력 ${y}` : "경력"; })();
                            return [age != null ? `${age}세` : null, career].filter(Boolean).join(" · ");
                          })()}
                        </span>
                      </div>
                    </div>
                    </div>
                  </td>
                  <td className="company-td-sub">{a.job_title}</td>
                  <td className="company-td-sub">{formatDate(a.applied_at)}</td>
                  <td style={{ fontSize: 12 }}>
                    <div style={{ color: a.user_email ? "#333" : "#ccc", marginBottom: 2 }}>
                      {a.user_email || "이메일 없음"}
                    </div>
                    <div style={{ color: a.user_phone ? "#555" : "#ccc" }}>
                      {a.user_phone || "전화번호 없음"}
                    </div>
                  </td>
                  <td style={{ color: "#5f0080", fontWeight: 500, fontSize: 13 }}>
                    {STATUS_LABEL[a.status]}
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => setSelected(a)} title="이력서 보기"
                          style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: "#5f0080", fontSize: 13, fontWeight: 500, padding: 0 }}>
                          <FileText size={16} /><span>이력서</span>
                        </button>
                        <span title={(a as any).scrapped ? "스크랩한 인재" : "미스크랩"} style={{ display: "inline-flex" }}>
                          <Bookmark size={15}
                            style={{ color: (a as any).scrapped ? "#5f0080" : "#d0d0d0", fill: (a as any).scrapped ? "#5f0080" : "none" }} />
                        </span>
                      </div>
                      {(a as any).portfolio_url ? (
                        <a href={(a as any).portfolio_url} target="_blank" rel="noopener noreferrer" title={(a as any).portfolio_filename || "포트폴리오"}
                          style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#5f0080", fontSize: 12, textDecoration: "none", fontWeight: 500 }}>
                          <Paperclip size={14} /><span>포트폴리오</span>
                        </a>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#d0d0d0", fontSize: 12 }}>
                          <Paperclip size={14} /><span>포트폴리오</span>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" style={{maxWidth:"720px", maxHeight:"90vh", display:"flex", flexDirection:"column"}} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">{selected.user_name}</h2>
              <button className="admin-modal-close" onClick={() => setSelected(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-modal-info-grid">
                <div><label>지원 공고</label><span>{selected.job_title}</span></div>
                <div><label>지원일</label><span>{formatDate(selected.applied_at)}</span></div>
                <div><label>상태</label>
                  <span className={`company-badge ${STATUS_BADGE_CLASS[selected.status]}`}>
                    {STATUS_LABEL[selected.status]}
                  </span>
                </div>
                {selected.user_email && (
                  <div><label>이메일</label><span>{selected.user_email}</span></div>
                )}
                {selected.user_phone && (
                  <div><label>연락처</label><span>{selected.user_phone}</span></div>
                )}
              </div>
              <div style={{marginTop:"20px"}}>
                <p style={{fontSize:"13px", color:"#666", marginBottom:"8px"}}>상태 변경</p>
                <div style={{display:"flex", gap:"6px", flexWrap:"wrap"}}>
                  {(["APPLIED", "VIEWED", "INTERVIEW", "PASSED", "REJECTED"] as ApplicationStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(selected.id, s)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: selected.status === s ? "2px solid #5f0080" : "1px solid #e0e0e0",
                        background: selected.status === s ? "#faf5ff" : "#fff",
                        color: selected.status === s ? "#5f0080" : "#666",
                        fontSize: "12px",
                        fontWeight: selected.status === s ? 700 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
              {/* 자기소개서 */}
              {coverLetter && coverLetter.trim() && (
                <div style={{ marginTop: "24px", background: "#faf5ff", border: "1px solid #ecdcff", borderRadius: 10, padding: "16px 18px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#5f0080", marginBottom: 8 }}>제출한 자기소개서</div>
                  <p style={{ fontSize: 14, color: "#333", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{coverLetter}</p>
                </div>
              )}
              {/* 이력서 정보 */}
              <div style={{marginTop:"24px", paddingTop:"24px", borderTop:"1px solid #ececec"}}>
                <h3 style={{fontSize:"15px", fontWeight:700, marginBottom:"4px"}}>이력서</h3>
                <p style={{fontSize:"12px", color:"#888", marginBottom:"8px"}}>지원자가 작성한 이력서 정보입니다</p>
                {resumeLoading ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>불러오는 중...</div>
                ) : resumeData ? (
                  <ResumePreview
                    name={selected.user_name}
                    birthDisplay=""
                    jobDisplay={selected.user_job_type === "STORE" ? "매장·기술직" : "기업·사무직"}
                    phone={selected.user_phone || ""}
                    email={selected.user_email || ""}
                    portfolioUrl={(selected as any).portfolio_url || null}
                    portfolioFilename={(selected as any).portfolio_filename || null}
                    avatarUrl={(selected as any).user_avatar_url || null}
                    resumeType={selected.user_job_type === "STORE" ? "salon" : "office"}
                    {...mapResume(resumeData)}
                  />
                ) : (
                  <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>이력서 정보가 없습니다.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </CompanyLayout>
  );
}

export default function CompanyApplicantsPage() {
  return (
    <Suspense fallback={<CompanyLayout activePage="applicants"><div /></CompanyLayout>}>
      <ApplicantsContent />
    </Suspense>
  );
}