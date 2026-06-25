"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import CompanyDetailModal from "@/components/admin/CompanyDetailModal";
import { Search, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatDeadline } from "@/lib/jobFormat";
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
  application_count: number;
  company_id: string;
  company_name: string;
  logo_url: string | null;
  category_name: string | null;
  categories: string[] | null;
  created_at: string;
  deadline: string | null;
  product_type: string;
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
const SIDO_SHORT: Record<string, string> = {
  "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
  "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종",
  "경기도": "경기", "강원특별자치도": "강원", "강원도": "강원", "충청북도": "충북", "충청남도": "충남",
  "전북특별자치도": "전북", "전라북도": "전북", "전라남도": "전남", "경상북도": "경북",
  "경상남도": "경남", "제주특별자치도": "제주", "제주도": "제주",
};
function shortLocation(loc: string | null) {
  if (!loc) return "-";
  const parts = loc.trim().split(/\s+/);
  if (!parts[0]) return "-";
  const sido = SIDO_SHORT[parts[0]] || parts[0];
  const sigungu = parts[1] || "";
  return `${sido}${sigungu ? " " + sigungu : ""}`;
}
function productBadge(type: string | null) {
  const t = type || "FREE";
  if (t === "TOP") return { label: "상단노출", bg: "#f3e8ff", color: "#5f0080" };
  if (t === "PREMIUM") return { label: "프리미엄", bg: "#5f0080", color: "#fff" };
  if (t === "FREE") return { label: "무료", bg: "#f0f0f0", color: "#999" };
  return { label: t, bg: "#f3e8ff", color: "#5f0080" };
}
function AdminJobsPageInner() {
  const searchParams = useSearchParams();
  // 대시보드 카드에서 넘어온 초기 필터
  const initialStatus =
    searchParams.get("status") === "active" ? "승인완료" :
    searchParams.get("status") === "pending" ? "승인대기" : "전체";
  const initialDate = searchParams.get("date") === "today" ? "today" : "전체";

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [dateFilter, setDateFilter] = useState(initialDate);
  const [jobGroupFilter, setJobGroupFilter] = useState("전체");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [companyModal, setCompanyModal] = useState<any | null>(null);
  const [companiesCache, setCompaniesCache] = useState<any[] | null>(null);
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

  // 기업명 클릭 → 회사 정보 불러와 모달 (이동 없음)
  const openCompany = async (companyId: string) => {
    let list = companiesCache;
    if (!list) {
      const res = await fetch("/api/admin/companies", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      list = data.success ? data.data.items : [];
      setCompaniesCache(list);
    }
    const match = (list || []).find((c) => String(c.id) === String(companyId));
    if (match) setCompanyModal(match);
  };

  const changeStatus = async (id: string, label: string) => {
    const status = LABEL_TO_STATUS[label];
    if (!status) return;
    await fetch("/api/admin/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    });
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
  };
  const groupOf = (jobType: string) => (jobType === "STORE" ? "매장" : "기업");
  const isToday = (d: string) => {
    const dt = new Date(d); const now = new Date();
    return dt.getFullYear() === now.getFullYear()
      && dt.getMonth() === now.getMonth()
      && dt.getDate() === now.getDate();
  };
  const filtered = jobs.filter((j) => {
    const matchGroup = jobGroupFilter === "전체" || groupOf(j.job_type) === jobGroupFilter;
    const matchSearch = !search || j.title.includes(search) || j.company_name.includes(search);
    const matchStatus = statusFilter === "전체" || STATUS_TO_LABEL[j.status] === statusFilter;
    const matchDate = dateFilter === "전체" || isToday(j.created_at);
    return matchGroup && matchSearch && matchStatus && matchDate;
  });
  const allChecked = filtered.length > 0 && filtered.every((j) => checkedIds.has(j.id));
  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (filtered.length > 0 && filtered.every((j) => next.has(j.id))) {
        filtered.forEach((j) => next.delete(j.id));
      } else {
        filtered.forEach((j) => next.add(j.id));
      }
      return next;
    });
  };
  const handleBulkDelete = async () => {
    if (checkedIds.size === 0) return;
    if (!confirm(`선택한 ${checkedIds.size}건을 삭제하시겠습니까? 관련 지원 내역도 함께 삭제됩니다.`)) return;
    const ids = Array.from(checkedIds);
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/admin/jobs?id=${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      )
    );
    setJobs((prev) => prev.filter((j) => !checkedIds.has(j.id)));
    setCheckedIds(new Set());
  };
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
          <select className="admin-form-select" value={jobGroupFilter}
            onChange={(e) => setJobGroupFilter(e.target.value)}>
            {["전체", "매장", "기업"].map(g => (
              <option key={g} value={g}>{g === "전체" ? "유형 전체" : g}</option>
            ))}
          </select>
          <select className="admin-form-select" value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "전체" ? "승인상태 전체" : s}
                {s === "승인대기" && counts.승인대기 > 0 ? ` (${counts.승인대기})` : ""}
              </option>
            ))}
          </select>
          <select className="admin-form-select" value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}>
            <option value="전체">등록일 전체</option>
            <option value="today">오늘</option>
          </select>
        </div>
        <div style={{display:"flex", gap:"8px"}}>
          <Link href="/admin/jobs/new" className="admin-primary-btn">
            <Plus size={16} /> 공고 직접 등록
          </Link>
        </div>
      </div>
      <div className="admin-card">
        <div className="admin-table-meta" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>총 <strong>{filtered.length}</strong>건{checkedIds.size > 0 ? ` · ${checkedIds.size}건 선택` : ""}</span>
          <button
            onClick={handleBulkDelete}
            disabled={checkedIds.size === 0}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
              border: "none", fontSize: 13, fontWeight: 600,
              cursor: checkedIds.size === 0 ? "not-allowed" : "pointer",
              background: checkedIds.size === 0 ? "#eee" : "#d32f2f",
              color: checkedIds.size === 0 ? "#aaa" : "#fff",
            }}>
            <Trash2 size={15} /> 선택 삭제{checkedIds.size > 0 ? ` (${checkedIds.size})` : ""}
          </button>
        </div>
        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ minWidth: 1100, whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
                <th>공고명</th>
                <th>매장/기업명</th>
                <th>등록상품</th>
                <th>직군</th>
                <th>지역</th>
                <th>지원자</th>
                <th>마감일</th>
                <th>등록일</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => (
                <tr key={job.id}>
                  <td>
                    <input type="checkbox" checked={checkedIds.has(job.id)}
                      onChange={() => toggleCheck(job.id)} />
                  </td>
                  {/* 공고명 (길면 2줄) */}
                  <td style={{ minWidth: 220 }}>
                    <span
                      title={job.title}
                      style={{
                        color: "#333", cursor: "pointer", fontWeight: 400,
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                        overflow: "hidden", whiteSpace: "normal", maxWidth: 460, lineHeight: 1.4,
                      }}
                      onClick={() => window.open(`/jobs/${job.id}?preview=admin`, "_blank")}>
                      {job.title}
                    </span>
                  </td>
                  {/* 기업 (+ 유형 텍스트) */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {job.logo_url ? (
                        <img
                          src={job.logo_url}
                          alt={job.company_name}
                          style={{ width: 26, height: 26, borderRadius: 6, objectFit: "cover", border: "1px solid #f0f0f0", flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: 26, height: 26, borderRadius: 6, background: "#f3e8ff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, color: "#7c3aed", flexShrink: 0
                        }}>
                          {job.company_name.charAt(0)}
                        </div>
                      )}
                      <div className="admin-td-brand"
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#5f0080", cursor: "pointer", fontWeight: 400 }}
                        onClick={() => job.company_id && openCompany(job.company_id)}>
                        {job.company_name}
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#999" }}>
                          {job.job_type === "STORE" ? "매장" : "기업"}
                        </span>
                      </div>
                    </div>
                  </td>
                  {/* 등록상품 */}
                  <td>
                    {(() => {
                      const b = productBadge(job.product_type);
                      return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: b.bg, color: b.color, whiteSpace: "nowrap" }}>{b.label}</span>;
                    })()}
                  </td>
                  {/* 직군 */}
                  <td className="admin-td-date">
                    {job.categories && job.categories.length > 0
                      ? job.categories.slice(0, 2).join(", ") +
                        (job.categories.length > 2 ? ` 외 ${job.categories.length - 2}` : "")
                      : "-"}
                  </td>
                  {/* 지역 (시도 축약) */}
                  <td className="admin-td-date">{shortLocation(job.location)}</td>
                  {/* 지원자 */}
                  <td className="admin-td-date">{(job.application_count || 0).toLocaleString()}명</td>
                  {/* 마감일 */}
                  <td className="admin-td-date">
                    {(() => {
                      const label = formatDeadline(job.deadline);
                      const isClosed = label === "마감";
                      const isAlways = label === "상시";
                      return (
                        <span style={{
                          color: isClosed ? "#bbb" : isAlways ? "#888" : "#5f0080",
                          fontWeight: isClosed || isAlways ? 400 : 600,
                        }}>{label}</span>
                      );
                    })()}
                  </td>
                  {/* 등록일 */}
                  <td className="admin-td-date">{fmtDate(job.created_at)}</td>
                  {/* 상태 */}
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
          </div>
        )}
        {!loading && filtered.length === 0 && <div className="admin-empty">검색 결과가 없습니다.</div>}
      </div>

      {companyModal && (
        <CompanyDetailModal company={companyModal} onClose={() => setCompanyModal(null)} />
      )}
    </AdminLayout>
  );
}

export default function AdminJobsPage() {
  return (
    <Suspense fallback={<AdminLayout activeMenu="jobs"><div className="admin-empty">불러오는 중...</div></AdminLayout>}>
      <AdminJobsPageInner />
    </Suspense>
  );
}