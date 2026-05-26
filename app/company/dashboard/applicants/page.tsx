"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import Link from "next/link";
import CompanyLayout from "@/components/company/CompanyLayout";
import { companyApplicationsApi } from "@/lib/api/company";
import type { CompanyApplication, ApplicationStatus } from "@/lib/types/company";

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  APPLIED: "신규",
  REVIEWING: "검토중",
  INTERVIEW: "면접예정",
  PASSED: "합격",
  REJECTED: "불합격",
};

const STATUS_BADGE_CLASS: Record<ApplicationStatus, string> = {
  APPLIED: "company-badge-info",
  REVIEWING: "company-badge-warning",
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
    검토중: applicants.filter(a => a.status === "REVIEWING").length,
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
                <th>지원일</th>
                <th>이름</th>
                <th>지원 공고</th>
                <th>열람</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td className="company-td-sub">{formatDate(a.applied_at)}</td>
                  <td>
                    <span className="company-td-name" style={{cursor:"pointer", color:"#5f0080", fontWeight:600}}
                      onClick={() => setSelected(a)}>{a.user_name}</span>
                  </td>
                  <td className="company-td-sub">{a.job_title}</td>
                  <td>
                    <span className={`company-badge ${a.viewed_at ? "viewed" : "new"}`}>
                      {a.viewed_at ? "열람" : "미열람"}
                    </span>
                  </td>
                  <td>
                    <span className={`company-badge ${STATUS_BADGE_CLASS[a.status]}`}>
                      {STATUS_LABEL[a.status]}
                    </span>
                  </td>
                  <td>
                    <select
                      className="admin-status-select"
                      value={a.status}
                      onChange={(e) => handleStatusChange(a.id, e.target.value as ApplicationStatus)}
                      style={{ fontSize: "12px", padding: "4px 8px" }}
                    >
                      <option value="APPLIED">신규</option>
                      <option value="REVIEWING">검토중</option>
                      <option value="INTERVIEW">면접예정</option>
                      <option value="PASSED">합격</option>
                      <option value="REJECTED">불합격</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" style={{maxWidth:"480px"}} onClick={e => e.stopPropagation()}>
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
                  {(["APPLIED", "REVIEWING", "INTERVIEW", "PASSED", "REJECTED"] as ApplicationStatus[]).map(s => (
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