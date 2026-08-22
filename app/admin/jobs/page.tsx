"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import CompanyDetailModal from "@/components/admin/CompanyDetailModal";
import { Search, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatDeadline } from "@/lib/jobFormat";
import FilterDropdown from "@/components/company/FilterDropdown";
const DATE_LABELS: Record<string, string> = { "전체": "전체", today: "오늘", "7d": "최근 7일", "1m": "최근 1개월", "3m": "최근 3개월", "1y": "최근 1년" };
const DATE_VALUES: Record<string, string> = { "전체": "전체", "오늘": "today", "최근 7일": "7d", "최근 1개월": "1m", "최근 3개월": "3m", "최근 1년": "1y" };
const STATUS_TO_LABEL: Record<string, string> = {
  ACTIVE: "진행중",
  DRAFT: "승인대기",
  HIDDEN: "반려",
  CLOSED: "마감",
  EXPIRED: "마감",
};
const LABEL_TO_STATUS: Record<string, string> = {
  진행중: "ACTIVE",
  승인대기: "DRAFT",
  반려: "HIDDEN",
};
// DRAFT는 두 종류가 섞임: 관리자 직접등록 임시저장(created_by=admin) vs 기업 제출 후 승인대기.
//  → 관리자 초안은 "임시저장", 그 외 DRAFT는 "승인대기"로 구분 표기.
const labelOf = (j: { status: string; created_by?: string | null }) =>
  j.status === "DRAFT" ? (j.created_by === "admin" ? "임시저장" : "승인대기") : (STATUS_TO_LABEL[j.status] || "승인대기");
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
  source_url: string | null;  // 외부에서 옮겨 온 공고면 원문 주소
  logo_url: string | null;
  thumb_url: string | null;   // 매장은 로고가 없어 공고·매장 배너를 대신 쓴다
  category_name: string | null;
  categories: string[] | null;
  created_at: string;
  deadline: string | null;
  product_type: string;
  source?: string | null;
  is_member?: boolean | null;
  created_by?: string | null;
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
  if (t === "TOP") return { label: "상단노출", bg: "#f3e8ff", color: "#582681" };
  if (t === "PREMIUM") return { label: "프리미엄", bg: "#582681", color: "#fff" };
  if (t === "FREE") return { label: "무료", bg: "#f0f0f0", color: "#999" };
  return { label: t, bg: "#f3e8ff", color: "#582681" };
}
function AdminJobsPageInner() {
  const searchParams = useSearchParams();
  // 대시보드 카드에서 넘어온 초기 필터
  const initialStatus =
    searchParams.get("status") === "active" ? "진행중" :
    searchParams.get("status") === "pending" ? "승인대기" : "전체";
  const initialDate = searchParams.get("date") === "today" ? "today" : "전체";

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [dateFilter, setDateFilter] = useState(initialDate);
  const [jobGroupFilter, setJobGroupFilter] = useState("전체");
  const [memberFilter, setMemberFilter] = useState("전체");
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
  const handleBulkStatus = async (label: string) => {
    if (checkedIds.size === 0) return;
    await Promise.all(Array.from(checkedIds).map((id) => changeStatus(id, label)));
    setCheckedIds(new Set());
  };
  const groupOf = (jobType: string) => (jobType === "STORE" ? "매장" : "오피스");
  const matchPeriod = (d: string | null, period: string) => {
    if (!d || period === "전체") return true;
    const dt = new Date(d);
    if (period === "today") {
      const kst = new Date(dt.getTime() + 9*60*60*1000);
      const todayKST = new Date(Date.now() + 9*60*60*1000);
      return kst.toISOString().slice(0,10) === todayKST.toISOString().slice(0,10);
    }
    const days = period === "7d" ? 7 : period === "1m" ? 30 : period === "3m" ? 90 : period === "1y" ? 365 : 0;
    if (!days) return true;
    const from = new Date();
    from.setDate(from.getDate() - days);
    return dt >= from;
  };
  const filtered = jobs.filter((j) => {
    const matchGroup = jobGroupFilter === "전체" || groupOf(j.job_type) === jobGroupFilter;
    const matchSearch = !search || j.title.includes(search) || j.company_name.includes(search);
    const matchStatus = statusFilter === "전체" || labelOf(j) === statusFilter;
    const matchDate = matchPeriod(j.created_at, dateFilter);
    const isMember = j.is_member !== false && j.source !== "EXTERNAL";
    const matchMember = memberFilter === "전체" || (memberFilter === "회원" ? isMember : !isMember);
    return matchGroup && matchSearch && matchStatus && matchDate && matchMember;
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
    임시저장: jobs.filter((j) => j.status === "DRAFT" && j.created_by === "admin").length,
    승인대기: jobs.filter((j) => j.status === "DRAFT" && j.created_by !== "admin").length,
    진행중: jobs.filter((j) => j.status === "ACTIVE").length,
    반려: jobs.filter((j) => j.status === "HIDDEN").length,
    마감: jobs.filter((j) => j.status === "CLOSED" || j.status === "EXPIRED").length,
  };
  return (
    <AdminLayout activeMenu="jobs">
      <div className="admin-mini-stats">
        {Object.entries(counts).map(([label, count]) => (
          <div key={label} className="admin-mini-stat"
            onClick={() => setStatusFilter(label)}
            style={{ cursor: "pointer", ...(statusFilter === label ? { outline: "2px solid #582681", outlineOffset: "-2px" } : {}) }}>
            <span className="admin-mini-stat-label">{label}</span>
            <span className="admin-mini-stat-value">{count}<span className="admin-mini-unit">건</span></span>
          </div>
        ))}
      </div>
      <div style={{ width: "fit-content", maxWidth: "100%" }}>
      {/* 공고 구분 — 매장/오피스 라디오 (fit-content 래퍼 안이라 gap이 안 먹어 marginBottom으로 간격 확보) */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 14 }}>
        <span style={{ fontSize: 14, color: "#777" }}>공고 구분</span>
        {(["전체", "매장", "오피스"] as const).map((opt) => (
          <label key={opt} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 15, color: jobGroupFilter === opt ? "#582681" : "#555" }}>
            <input type="radio" name="jobTrack" checked={jobGroupFilter === opt}
              onChange={() => setJobGroupFilter(opt)}
              style={{ accentColor: "#582681", width: 16, height: 16, margin: 0, cursor: "pointer" }} />
            {opt}
          </label>
        ))}
      </div>
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="공고명, 기업명 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <FilterDropdown label="회원구분"
            value={memberFilter}
            options={["전체", "회원", "비회원"]}
            onChange={(v) => setMemberFilter(v)} />
          <FilterDropdown label="등록일"
            value={DATE_LABELS[dateFilter] || "전체"}
            options={["전체", "오늘", "최근 7일", "최근 1개월", "최근 3개월", "최근 1년"]}
            onChange={(v) => setDateFilter(DATE_VALUES[v] ?? "전체")} />
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {checkedIds.size > 0 && (["진행중", "승인대기", "반려"] as const).map((label) => {
              const color = label === "진행중" ? "#10b981" : label === "승인대기" ? "#f59e0b" : "#e74c3c";
              const disabled = Array.from(checkedIds).every((id) => jobs.find((j) => j.id === id)?.status === LABEL_TO_STATUS[label]);
              return (
                <button key={label} onClick={() => handleBulkStatus(label)} disabled={disabled}
                  style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${disabled ? "#e2e2e2" : color}`, background: "#fff", color: disabled ? "#c4c4c4" : color, fontSize: 14, fontWeight: 400, cursor: disabled ? "not-allowed" : "pointer" }}>
                  {label}
                </button>
              );
            })}
            <button
              onClick={handleBulkDelete}
              disabled={checkedIds.size === 0}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
                border: "none", fontSize: 14, fontWeight: 600,
                cursor: checkedIds.size === 0 ? "not-allowed" : "pointer",
                background: checkedIds.size === 0 ? "#eee" : "#d32f2f",
                color: checkedIds.size === 0 ? "#aaa" : "#fff",
              }}>
              <Trash2 size={15} /> 선택 삭제{checkedIds.size > 0 ? ` (${checkedIds.size})` : ""}
            </button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ minWidth: 1360, whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
                <th>공고명</th>
                <th>매장/오피스명</th>
                <th>등록상품</th>
                <th>채용 직군</th>
                <th>지역</th>
                <th>지원자</th>
                <th>마감일</th>
                <th>등록일</th>
                <th>상태</th>
                <th style={{ width: 64 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="admin-empty" style={{ textAlign: "center" }}>불러오는 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="admin-empty" style={{ textAlign: "center" }}>검색 결과가 없습니다.</td></tr>
              ) : filtered.map((job) => (
                <tr key={job.id}>
                  <td>
                    <input type="checkbox" checked={checkedIds.has(job.id)}
                      onChange={() => toggleCheck(job.id)} />
                  </td>
                  {/* 공고명 (길면 2줄) */}
                  <td>
                    <span className="adm-td2 adm-w-lg"
                      title={job.title}
                      style={{ color: "#333", cursor: "pointer", fontWeight: 400 }}
                      onClick={() => window.open(`/jobs/${job.id}?preview=admin`, "_blank")}>
                      {job.title}
                    </span>
                  </td>
                  {/* 기업 (+ 유형 텍스트) */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {job.thumb_url ? (
                        <img
                          src={job.thumb_url}
                          alt={job.company_name}
                          style={{ width: 26, height: 26, borderRadius: 6, objectFit: "cover", border: "1px solid #f0f0f0", flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: 26, height: 26, borderRadius: 6, background: "#f3e8ff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, color: "#7c3aed", flexShrink: 0
                        }}>
                          {job.company_name.charAt(0)}
                        </div>
                      )}
                      <div className="admin-td-brand"
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#1a1a1a", cursor: "pointer", fontWeight: 400 }}
                        onClick={() => job.company_id && openCompany(job.company_id)}>
                        {job.company_name}
                      </div>
                      {/* 옮겨 온 공고는 원문으로 갈 수 있어야 한다 — 값이 맞는지 대조하고,
                          아직 사람을 뽑는지 확인할 때 쓴다. */}
                      {job.source_url && (
                        <a href={job.source_url} target="_blank" rel="noopener noreferrer"
                          title="원문 보기" onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: 11, color: "#9a92a6", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                          원문 ↗
                        </a>
                      )}
                      {(() => {
                        const isMember = job.is_member !== false && job.source !== "EXTERNAL";
                        return (
                          <span style={{ fontSize: 12, whiteSpace: "nowrap", color: isMember ? "#7c3aed" : "#999" }}>
                            {isMember ? "회원" : "비회원"}
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  {/* 등록상품 */}
                  <td>
                    {(() => {
                      const b = productBadge(job.product_type);
                      return <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: b.bg, color: b.color, whiteSpace: "nowrap" }}>{b.label}</span>;
                    })()}
                  </td>
                  {/* 모집 직군 (공고 직군, 길면 2줄) */}
                  <td className="admin-td-date">
                    {job.categories && job.categories.length > 0 ? (
                      <div className="adm-td2 adm-w-md"
                        title={job.categories.join(", ")}>
                        {job.categories.join(", ")}
                      </div>
                    ) : "-"}
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
                          color: isClosed ? "#bbb" : isAlways ? "#888" : "#582681",
                          fontWeight: isClosed || isAlways ? 400 : 600,
                        }}>{label}</span>
                      );
                    })()}
                  </td>
                  {/* 등록일 */}
                  <td className="admin-td-date">{fmtDate(job.created_at)}</td>
                  {/* 상태 — DRAFT는 관리자 임시저장/기업 승인대기로 구분 */}
                  <td>
                    {(() => { const lb = labelOf(job); return (
                    <span style={{ fontWeight: 500, color:
                      lb === "진행중" ? "#10b981" :
                      lb === "임시저장" ? "#8a7fa0" :
                      lb === "승인대기" ? "#f59e0b" :
                      lb === "반려" ? "#e74c3c" : "#999"
                    }}>
                      {lb}
                    </span>
                    ); })()}
                  </td>
                  {/* 관리: 수정 */}
                  <td>
                    <Link href={`/admin/jobs/new?id=${job.id}`}
                      style={{ display: "inline-block", padding: "4px 12px", borderRadius: 6, border: "1px solid #d9c8ec", color: "#582681", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", textDecoration: "none" }}>
                      수정
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
      </div>
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