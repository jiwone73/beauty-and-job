"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import ResumePreviewModal from "@/components/admin/ResumePreviewModal";
import { Search } from "lucide-react";

const STATUS_TO_LABEL: Record<string, string> = {
  APPLIED: "지원완료",
  VIEWED: "열람됨",
  INTERVIEW: "면접예정",
  PASSED: "합격",
  REJECTED: "불합격",
  WITHDRAWN: "지원취소",
};
const STATUS_COLOR: Record<string, string> = {
  APPLIED: "admin-badge-neutral",
  VIEWED: "admin-badge-info",
  INTERVIEW: "admin-badge-warning",
  PASSED: "admin-badge-success",
  REJECTED: "admin-badge-danger",
  WITHDRAWN: "admin-badge-neutral",
};
const STATUS_OPTIONS = ["전체", "지원완료", "열람됨", "면접예정", "합격", "불합격", "지원취소"];

type App = {
  id: string;
  status: string;
  applied_at: string;
  applicant_name: string;
  avatar_url: string | null;
  resume_id: string | null;
  position: string;
  company_name: string;
  job_category: string | null;
  cover_letter: string | null;
  resume_snapshot: any | null;
};

function fmtDate(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

function AdminApplicationsPageInner() {
  const searchParams = useSearchParams();
  const initialDate = searchParams.get("date") === "today" ? "today" : "전체";

  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [dateFilter, setDateFilter] = useState(initialDate);
  const [selected, setSelected] = useState<App | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/applications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setApps(data.success ? data.data.items : []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const changeStatus = async (id: string, label: string) => {
    const key = Object.keys(STATUS_TO_LABEL).find((k) => STATUS_TO_LABEL[k] === label);
    if (!key) return;
    await fetch("/api/admin/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status: key }),
    });
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: key } : a)));
  };

  const isToday = (d: string | null) => {
    if (!d) return false;
    const dt = new Date(d); const now = new Date();
    return dt.getFullYear() === now.getFullYear()
      && dt.getMonth() === now.getMonth()
      && dt.getDate() === now.getDate();
  };

  const filtered = apps.filter((a) => {
    const matchSearch = !search || (a.applicant_name || "").includes(search) || (a.company_name || "").includes(search) || (a.position || "").includes(search);
    const matchStatus = statusFilter === "전체" || STATUS_TO_LABEL[a.status] === statusFilter;
    const matchDate = dateFilter === "전체" || isToday(a.applied_at);
    return matchSearch && matchStatus && matchDate;
  });

  return (
    <AdminLayout activeMenu="resumes-applications">
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="지원자, 기업명, 포지션 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">지원상태</span>
            <div className="admin-filter-tabs">
              {STATUS_OPTIONS.map((s) => (
                <button key={s} className={`admin-filter-tab ${statusFilter === s ? "active" : ""}`}
                  onClick={() => setStatusFilter(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">지원일</span>
            <div className="admin-filter-tabs">
              {["전체", "오늘"].map((d) => {
                const val = d === "오늘" ? "today" : "전체";
                return (
                  <button key={d} className={`admin-filter-tab ${dateFilter === val ? "active" : ""}`}
                    onClick={() => setDateFilter(val)}>{d}</button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="admin-card">
        <div className="admin-table-meta">총 <strong>{filtered.length}</strong>건</div>
        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>지원일</th><th>지원자</th><th>직군</th><th>기업</th><th>포지션</th><th>상태</th></tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td className="admin-td-date">{fmtDate(a.applied_at)}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {a.avatar_url ? (
                        <img
                          src={a.avatar_url}
                          alt={a.applicant_name}
                          style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "1px solid #f0f0f0", flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%", background: "#f3e8ff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, color: "#7c3aed", flexShrink: 0
                        }}>
                          {(a.applicant_name || "?").charAt(0)}
                        </div>
                      )}
                      {a.resume_id || a.cover_letter ? (
                        <button
                          onClick={() => setSelected(a)}
                          className="admin-td-brand"
                          style={{ color: "#5f0080", textDecoration: "none", background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}>
                          {a.applicant_name}
                        </button>
                      ) : (
                        <span className="admin-td-brand">{a.applicant_name}</span>
                      )}
                    </div>
                  </td>
                  <td className="admin-td-date">{a.job_category || "-"}</td>
                  <td className="admin-td-brand">{a.company_name}</td>
                  <td className="admin-td-title">{a.position}</td>
                  <td>
                    <select
                      className={`admin-status-select`}
                      value={STATUS_TO_LABEL[a.status]}
                      onChange={(e) => changeStatus(a.id, e.target.value)}
                    >
                      <option value="지원완료">지원완료</option>
                      <option value="열람됨">열람됨</option>
                      <option value="면접예정">면접예정</option>
                      <option value="합격">합격</option>
                      <option value="불합격">불합격</option>
                      <option value="지원취소">지원취소</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && <div className="admin-empty">검색 결과가 없습니다.</div>}
      </div>
      {selected && (selected.resume_id || selected.cover_letter || selected.resume_snapshot) && (
        <ResumePreviewModal
          resumeId={selected.resume_id || ""}
          jobCategory={selected.job_category}
          coverLetter={selected.cover_letter}
          snapshot={selected.resume_snapshot}
          onClose={() => setSelected(null)}
        />
      )}
    </AdminLayout>
  );
}

export default function AdminApplicationsPage() {
  return (
    <Suspense fallback={<AdminLayout activeMenu="resumes-applications"><div className="admin-empty">불러오는 중...</div></AdminLayout>}>
      <AdminApplicationsPageInner />
    </Suspense>
  );
}