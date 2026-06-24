"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import ResumePreviewModal from "@/components/admin/ResumePreviewModal";
import { Search, FileText, Paperclip } from "lucide-react";

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
  gender: string | null;
  birth_date: string | null;
  portfolio_url: string | null;
  recent_career: { start_date: string | null; is_current: boolean } | null;
  career_count: number;
  resume_id: string | null;
  position: string;
  company_name: string;
  job_category: string | null;
  cover_letter: string | null;
  resume_snapshot: any | null;
};

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
  if (g === "MALE" || g === "남" || g === "남성" || g === "M") return "남";
  if (g === "FEMALE" || g === "여" || g === "여성" || g === "F") return "여";
  return null;
}
function calcCareerYears(startDate: string | null): string | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (months < 12) return `${Math.max(months, 1)}개월`;
  return `${Math.floor(months / 12)}년`;
}
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
              <tr>
                <th>지원자</th>
                <th>직군</th>
                <th>매장/기업명</th>
                <th>공고명</th>
                <th>지원일</th>
                <th>이력서/포트폴리오</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const age = calcAge(a.birth_date);
                const gender = genderLabel(a.gender);
                const career = a.career_count > 0
                  ? `경력 ${calcCareerYears(a.recent_career?.start_date || null) || ""}`
                  : "신입";
                const hasResume = a.resume_id || a.cover_letter || a.resume_snapshot;
                return (
                  <tr key={a.id}>
                    {/* 지원자: 아바타 + 이름·성별 / 나이·경력 */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {a.avatar_url ? (
                          <img
                            src={a.avatar_url}
                            alt={a.applicant_name}
                            style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "1px solid #f0f0f0", flexShrink: 0 }}
                          />
                        ) : (
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%", background: "#f3e8ff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 700, color: "#7c3aed", flexShrink: 0
                          }}>
                            {(a.applicant_name || "?").charAt(0)}
                          </div>
                        )}
                        <div style={{ textAlign: "left" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {hasResume ? (
                              <button
                                onClick={() => setSelected(a)}
                                style={{ color: "#5f0080", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}>
                                {a.applicant_name}
                              </button>
                            ) : (
                              <span style={{ fontWeight: 600 }}>{a.applicant_name}</span>
                            )}
                            {gender && <span style={{ fontSize: 12, color: "#888" }}>{gender}</span>}
                          </div>
                          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                            {[age ? `${age}세` : null, career].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* 직군 */}
                    <td className="admin-td-date">{a.job_category || "-"}</td>
                    {/* 매장/기업명 */}
                    <td className="admin-td-brand">{a.company_name}</td>
                    {/* 공고명 */}
                    <td className="admin-td-title">{a.position}</td>
                    {/* 지원일 */}
                    <td className="admin-td-date">{fmtDate(a.applied_at)}</td>
                    {/* 이력서/포트폴리오 */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        {hasResume ? (
                          <button onClick={() => setSelected(a)} title="이력서 보기"
                            style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: "#5f0080", fontSize: 13, fontWeight: 500, padding: 0 }}>
                            <FileText size={15} /><span>이력서</span>
                          </button>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#ccc", fontSize: 13 }}>
                            <FileText size={15} /><span>이력서</span>
                          </span>
                        )}
                        {a.portfolio_url ? (
                          <a href={a.portfolio_url} target="_blank" rel="noopener noreferrer" title="포트폴리오 보기"
                            style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#5f0080", fontSize: 12, textDecoration: "none", fontWeight: 500 }}>
                            <Paperclip size={13} /><span>포트폴리오</span>
                          </a>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#d0d0d0", fontSize: 12 }}>
                            <Paperclip size={13} /><span>포트폴리오</span>
                          </span>
                        )}
                      </div>
                    </td>
                    {/* 상태 */}
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
                );
              })}
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