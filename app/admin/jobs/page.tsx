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
// 표 안에서는 색으로 말하지 않는다. 보라는 「고른 것」에만 쓰고, 나머지 글자는
// 모두 같은 색으로 둔다 — 색이 여럿이면 무엇이 중요한지가 아니라 색만 보인다.
function productBadge(type: string | null) {
  const t = type || "FREE";
  const 이름 = t === "TOP" ? "상단노출" : t === "PREMIUM" ? "프리미엄" : t === "FREE" ? "무료" : t;
  return { label: 이름, bg: "transparent", color: "#555" };
}
function AdminJobsPageInner() {
  const searchParams = useSearchParams();
  // 대시보드 카드에서 넘어온 초기 필터
  const initialStatus =
    searchParams.get("status") === "active" ? "진행중" :
    searchParams.get("status") === "pending" ? "승인대기" : "전체";
  const initialDate = searchParams.get("date") === "today" ? "today" : "전체";

  const [jobs, setJobs] = useState<Job[]>([]);
  // 고용24 목록 주소 하나로 여러 건을 임시저장에 담는다.
  const [가져오기열림, set가져오기열림] = useState(false);
  const [가져오기주소, set가져오기주소] = useState("");
  const [가져오는중, set가져오는중] = useState(false);
  const [가져온결과, set가져온결과] = useState<any>(null);
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

  // 목록 주소를 서버에 넘기면 공고를 하나씩 읽어 임시저장으로 담아 준다.
  // 발행은 하지 않는다 — 잘못 읽은 값이 그대로 공고로 나가면 되돌릴 데가 없다.
  const 가져오기 = async () => {
    set가져오는중(true); set가져온결과(null);
    try {
      const res = await fetch("/api/admin/external-jobs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
        body: JSON.stringify({ url: 가져오기주소.trim(), limit: 20 }),
      });
      const j = await res.json();
      if (!j.success) { set가져온결과({ 오류: j.error?.message || "가져오지 못했어요." }); return; }
      set가져온결과(j.data);
      fetchJobs();
    } catch {
      set가져온결과({ 오류: "네트워크 오류가 발생했어요." });
    } finally {
      set가져오는중(false);
    }
  };

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
  const groupOf = (jobType: string) => (jobType === "STORE" ? "매장" : "본사");
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
      {/* 공고 구분 — 매장/본사 라디오 (fit-content 래퍼 안이라 gap이 안 먹어 marginBottom으로 간격 확보) */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 14 }}>
        <span style={{ fontSize: 14, color: "#555" }}>공고 구분</span>
        {(["전체", "매장", "본사"] as const).map((opt) => (
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
          <button type="button" className="admin-secondary-btn" onClick={() => { set가져오기주소(""); set가져온결과(null); set가져오기열림(true); }}>
            고용24 가져오기
          </button>
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
              const disabled = Array.from(checkedIds).every((id) => jobs.find((j) => j.id === id)?.status === LABEL_TO_STATUS[label]);
              return (
                <button key={label} onClick={() => handleBulkStatus(label)} disabled={disabled}
                  style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #efeff1", background: "#fff", color: disabled ? "#c4c4c4" : "#555", fontSize: 14, fontWeight: 400, cursor: disabled ? "not-allowed" : "pointer" }}>
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
                {/* 매장과 공고를 한 칸에 위아래로 둔다. 둘 다 「누구의 어떤 자리인가」
                    하나를 말하는 값이라, 열을 갈라 두면 눈이 두 번 움직였다.
                    표가 auto 라 이 폭은 「이만큼 쓰고 싶다」는 뜻이다. */}
                <th style={{ width: 420 }}>매장 · 공고</th>
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
                <tr><td colSpan={10} className="admin-empty" style={{ textAlign: "center" }}>불러오는 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="admin-empty" style={{ textAlign: "center" }}>검색 결과가 없습니다.</td></tr>
              ) : filtered.map((job) => (
                <tr key={job.id}>
                  <td>
                    <input type="checkbox" checked={checkedIds.has(job.id)}
                      onChange={() => toggleCheck(job.id)} />
                  </td>
                  {/* 매장 · 공고 — 1행 매장, 2행 공고명.
                      아바타는 두 줄 전체의 형제로 둔다. 첫 줄 안에 넣으면 그 줄만
                      기준이 되어 위로 붙는다.
                      공고명에 noopener 를 빼면 크롬이 새 탭을 이 목록과 같은 렌더러에
                      붙인다. 목록은 공고를 전부 그려 무거워서, 새 탭이 그 메인 스레드를
                      기다리느라 몇 초씩 '무제'로 멈춰 있었다. */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {job.thumb_url ? (
                        <img
                          src={job.thumb_url}
                          alt={job.company_name}
                          style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", border: "1px solid #f0f0f0", flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: 56, height: 56, borderRadius: 10, background: "#f7f7f8",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 17, color: "#555", flexShrink: 0
                        }}>
                          {job.company_name.charAt(0)}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {/* 매장명은 읽는 값이다 — 누를 자리는 아래 공고명 하나로 둔다.
                              한 칸에 갈 곳이 둘이면 어디를 눌러야 할지 매번 겨냥하게 된다. */}
                          <div className="admin-td-brand adm-shop"
                            title={job.company_name}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 400,
                              maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {job.company_name}
                          </div>
                          {/* 옮겨 온 공고는 원문으로 갈 수 있어야 한다 — 값이 맞는지 대조하고,
                              아직 사람을 뽑는지 확인할 때 쓴다. */}
                          {job.source_url && (
                            <a href={job.source_url} target="_blank" rel="noopener noreferrer"
                              title="원문 보기" onClick={(e) => e.stopPropagation()}
                              style={{ fontSize: 13.5, color: "#555", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                              원문 ↗
                            </a>
                          )}
                          {(() => {
                            const isMember = job.is_member !== false && job.source !== "EXTERNAL";
                            // 매장 줄에 딸린 값이라 매장명과 같은 결로 둔다.
                            return (
                              <span className="adm-shop" style={{ whiteSpace: "nowrap" }}>
                                {isMember ? "회원" : "비회원"}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="adm-td2"
                          title={job.title}
                          style={{ marginTop: 3, maxWidth: 380, color: "#555", cursor: "pointer" }}
                          onClick={() => window.open(`/jobs/${job.id}?preview=admin`, "_blank", "noopener")}>
                          {job.title}
                        </div>
                      </div>
                    </div>
                  </td>
                  {/* 등록상품 */}
                  <td>
                    {(() => {
                      const b = productBadge(job.product_type);
                      return <span style={{ fontSize: 15, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: b.bg, color: b.color, whiteSpace: "nowrap" }}>{b.label}</span>;
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
                          color: isClosed || isAlways ? "#555" : "#582681",
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
                    <span style={{ color: "#555" }}>
                      {lb}
                    </span>
                    ); })()}
                  </td>
                  {/* 관리: 수정 */}
                  <td>
                    <Link href={`/admin/jobs/new?id=${job.id}`}
                      style={{ display: "inline-block", padding: "4px 12px", borderRadius: 6, border: "1px solid #efeff1", color: "#555", fontSize: 13.5, whiteSpace: "nowrap", textDecoration: "none" }}>
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

      {가져오기열림 && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => !가져오는중 && set가져오기열림(false)}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 560, maxHeight: "80vh", overflow: "auto", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <strong style={{ fontSize: 16, color: "#555" }}>고용24 가져오기</strong>
              <button type="button" onClick={() => set가져오기열림(false)} aria-label="닫기"
                style={{ border: "none", background: "none", fontSize: 20, color: "#555", cursor: "pointer" }}>×</button>
            </div>
            <textarea value={가져오기주소} onChange={(e) => set가져오기주소(e.target.value)}
              rows={4}
              placeholder={"고용24 목록 주소, 또는 공고 주소 여러 개"}
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #efeff1", borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button type="button" className="admin-secondary-btn" onClick={() => set가져오기열림(false)} disabled={가져오는중}>닫기</button>
              <button type="button" className="admin-primary-btn" onClick={가져오기} disabled={가져오는중 || !가져오기주소.trim()}>
                {가져오는중 ? "가져오는 중…" : "가져오기"}
              </button>
            </div>

            {가져온결과 && (
              <div style={{ marginTop: 16, fontSize: 13.5, color: "#555", lineHeight: 1.7 }}>
                {가져온결과.오류 ? (
                  <p style={{ color: "#c0392b", margin: 0 }}>{가져온결과.오류}</p>
                ) : (
                  <>
                    <p style={{ margin: "0 0 8px" }}>
                      공고 {가져온결과.본것}건을 보고 <strong style={{ color: "#555" }}>{가져온결과.담음.length}건</strong>을 임시저장에 담았습니다.
                    </p>
                    {가져온결과.담음.map((x: any, i: number) => (
                      <div key={`y${i}`} style={{ color: "#555" }}>· {x.company} — {x.title}</div>
                    ))}
                    {가져온결과.건너뜀.length > 0 && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f2f2f4", color: "#555" }}>
                        {가져온결과.건너뜀.map((x: any, i: number) => (
                          <div key={`n${i}`}>· {x.title} — {x.사유}</div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
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