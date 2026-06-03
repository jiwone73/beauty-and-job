"use client";
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
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
  position: string;
  company_name: string;
  job_category: string | null;
};

function fmtDate(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

export default function AdminApplicationsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");

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

  const filtered = apps.filter((a) => {
    const matchSearch = !search || (a.applicant_name || "").includes(search) || (a.company_name || "").includes(search) || (a.position || "").includes(search);
    const matchStatus = statusFilter === "전체" || STATUS_TO_LABEL[a.status] === statusFilter;
    return matchSearch && matchStatus;
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
                  <td className="admin-td-brand">{a.applicant_name}</td>
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
    </AdminLayout>
  );
}