"use client";
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";

const STATUS_TO_LABEL: Record<string, string> = {
  ACTIVE: "승인완료",
  DRAFT: "승인대기",
  HIDDEN: "반려",
  CLOSED: "마감",
  EXPIRED: "만료",
};
const LABEL_TO_STATUS: Record<string, string> = {
  승인완료: "ACTIVE",
  승인대기: "DRAFT",
  반려: "HIDDEN",
};
const STATUS_OPTIONS = ["전체", "승인대기", "승인완료", "반려"];

type Job = {
  id: string;
  title: string;
  job_type: string;
  status: string;
  location: string | null;
  experience_level: string;
  view_count: number;
  company_name: string;
  category_name: string | null;
  created_at: string;
};

const EXP_LABEL: Record<string, string> = {
  NEW: "신입",
  EXPERIENCED: "경력",
  ANY: "경력무관",
};

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [jobGroupFilter, setJobGroupFilter] = useState("전체");
  const [selected, setSelected] = useState<Job | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setJobs(data.success ? data.data.items : []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const changeStatus = async (id: string, label: string) => {
    const status = LABEL_TO_STATUS[label];
    if (!status) return;
    await fetch("/api/admin/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    });
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
    if (selected?.id === id) setSelected((p) => (p ? { ...p, status } : p));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("삭제하시겠습니까? 관련 지원 내역도 함께 삭제됩니다.")) return;
    await fetch(`/api/admin/jobs?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setSelected(null);
  };

  const groupOf = (jobType: string) => (jobType === "STORE" ? "매장" : "기업");

  const filtered = jobs.filter((j) => {
    const matchGroup = jobGroupFilter === "전체" || groupOf(j.job_type) === jobGroupFilter;
    const matchSearch = !search || j.title.includes(search) || j.company_name.includes(search);
    const matchStatus = statusFilter === "전체" || STATUS_TO_LABEL[j.status] === statusFilter;
    return matchGroup && matchSearch && matchStatus;
  });

  const counts = {
    전체: jobs.length,
    승인대기: jobs.filter((j) => j.status === "DRAFT").length,
    승인완료: jobs.filter((j) => j.status === "ACTIVE").length,
    반려: jobs.filter((j) => j.status === "HIDDEN").length,
  };

  return (
    <AdminLayout activeMenu="jobs">
      <div className="admin-mini-stats">
        {Object.entries(counts).map(([label, count]) => (
          <div key={label} className="admin-mini-stat">
            <span className="admin-mini-stat-label">{label}</span>
            <span className="admin-mini-stat-value">{count}<span className="admin-mini-unit">건</span></span>
          </div>
        ))}
      </div>

      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="공고명, 기업명 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">유형</span>
            <div className="admin-filter-tabs">
              {["전체", "기업", "매장"].map(g => (
                <button key={g} className={`admin-filter-tab ${jobGroupFilter === g ? "active" : ""}`}
                  onClick={() => setJobGroupFilter(g)}>{g}</button>
              ))}
            </div>
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">승인상태</span>
            <div className="admin-filter-tabs">
              {STATUS_OPTIONS.map((s) => (
                <button key={s} className={`admin-filter-tab ${statusFilter === s ? "active" : ""}`}
                  onClick={() => setStatusFilter(s)}>
                  {s}
                  {s === "승인대기" && counts.승인대기 > 0 && (
                    <span className="admin-filter-count">{counts.승인대기}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{display:"flex", gap:"8px"}}>
          <Link href="/admin/jobs/new" className="admin-primary-btn">
            <Plus size={16} /> 공고 직접 등록
          </Link>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-table-meta">총 <strong>{filtered.length}</strong>건</div>
        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>유형</th>
                <th>기업</th>
                <th>공고명</th>
                <th>직군</th>
                <th>경력</th>
                <th>지역</th>
                <th>등록일</th>
                <th>조회수</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => (
                <tr key={job.id}>
                  <td>
                    <span className={`jobs-type-badge ${job.job_type === "STORE" ? "store" : "corp"}`}>
                      {job.job_type === "STORE" ? "🏪 매장" : "🏢 기업"}
                    </span>
                  </td>
                  <td className="admin-td-brand">{job.company_name}</td>
                  <td>
                    <span className="admin-td-title"
                      style={{color:"#5f0080", cursor:"pointer", fontWeight:600}}
                      onClick={() => setSelected(job)}>
                      {job.title}
                    </span>
                  </td>
                  <td className="admin-td-date">{job.category_name || "-"}</td>
                  <td className="admin-td-date">{EXP_LABEL[job.experience_level] || job.experience_level}</td>
                  <td className="admin-td-date">{job.location || "-"}</td>
                  <td className="admin-td-date">{fmtDate(job.created_at)}</td>
                  <td className="admin-td-date">{(job.view_count || 0).toLocaleString()}</td>
                  <td>
                    <select
                      className={`admin-status-select admin-status-${
                        job.status === "ACTIVE" ? "success" :
                        job.status === "DRAFT" ? "warning" : "danger"
                      }`}
                      value={STATUS_TO_LABEL[job.status] || "승인대기"}
                      onChange={(e) => changeStatus(job.id, e.target.value)}
                    >
                      <option value="승인대기">승인대기</option>
                      <option value="승인완료">승인완료</option>
                      <option value="반려">반려</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && <div className="admin-empty">검색 결과가 없습니다.</div>}
      </div>

      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" style={{maxWidth:"560px"}} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <span className="admin-badge admin-badge-neutral" style={{marginBottom:"6px", display:"inline-block"}}>{selected.category_name || "-"}</span>
                <h2 className="admin-modal-title">{selected.title}</h2>
                <p style={{fontSize:"13px", color:"#888", margin:"4px 0 0"}}>{selected.company_name}</p>
              </div>
              <button className="admin-modal-close" onClick={() => setSelected(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-detail-grid">
                {[
                  ["기업", selected.company_name],
                  ["직군", selected.category_name || "-"],
                  ["경력", EXP_LABEL[selected.experience_level] || selected.experience_level],
                  ["지역", selected.location || "-"],
                  ["등록일", fmtDate(selected.created_at)],
                  ["조회수", (selected.view_count || 0).toLocaleString() + "회"],
                ].map(([label, value]) => (
                  <div key={label} className="admin-detail-row">
                    <span className="admin-detail-label">{label}</span>
                    <span className="admin-detail-value">{value}</span>
                  </div>
                ))}
                <div className="admin-detail-row">
                  <span className="admin-detail-label">상태</span>
                  <select
                    className={`admin-status-select admin-status-${
                      selected.status === "ACTIVE" ? "success" :
                      selected.status === "DRAFT" ? "warning" : "danger"
                    }`}
                    value={STATUS_TO_LABEL[selected.status] || "승인대기"}
                    onChange={(e) => changeStatus(selected.id, e.target.value)}
                  >
                    <option value="승인대기">승인대기</option>
                    <option value="승인완료">승인완료</option>
                    <option value="반려">반려</option>
                  </select>
                </div>
              </div>
              <div className="admin-modal-actions">
                <button className="admin-danger-btn" onClick={() => handleDelete(selected.id)}>
                  <Trash2 size={15} /> 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}