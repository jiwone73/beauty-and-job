"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { formatPhone } from "@/lib/phone";
// [SMS 발송 기능 보류] 2026-07 — SMS는 휴대폰 인증 전용. 안내는 이메일로 대체 예정.
// import SmsModal from "@/components/admin/SmsModal";
import { useSearchParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Trash2, FileText, Bookmark, Paperclip } from "lucide-react";
import ResumePreviewModal from "@/components/admin/ResumePreviewModal";

const JOB_TYPE_LABEL: Record<string, string> = {
  OFFICE: "기업사무직",
  STORE: "매장기술직",
};

const STATUS_TO_LABEL: Record<string, string> = {
  ACTIVE: "정상",
  INACTIVE: "휴면",
  SUSPENDED: "정지",
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
const SIDO_SHORT: Record<string, string> = {
  "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
  "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종",
  "경기도": "경기", "강원특별자치도": "강원", "강원도": "강원", "충청북도": "충북", "충청남도": "충남",
  "전북특별자치도": "전북", "전라북도": "전북", "전라남도": "전남", "경상북도": "경북",
  "경상남도": "경남", "제주특별자치도": "제주", "제주도": "제주",
};
function shortSido(s: string | null) {
  if (!s) return "";
  return SIDO_SHORT[s] || s;
}
function fmtDate(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}
function fmtYearMonth(d: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

// career_type: NEWCOMER / EXPERIENCED / null
function careerLabel(careerType: string | null) {
  if (careerType === "NEWCOMER") return "신입";
  if (careerType === "EXPERIENCED") {
    return null; // 경력년수는 별도 계산
  }
  return null;
}
function calcCareerYears(startDate: string | null): string | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  if (months < 12) return `${Math.max(months, 1)}개월`;
  const y = Math.floor(months / 12);
  return `${y}년`;
}

type Member = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  job_type: string | null;
  status: string;
  kakao_id: string | null;
  naver_id: string | null;
  gender: string | null;
  birth_date: string | null;
  region_sido: string | null;
  region_sigungu: string | null;
  office_job_areas: string[] | null;
  portfolio_url: string | null;
  scrap_count: number;
  last_login_at: string | null;
  created_at: string;
  avatar_url: string | null;
  resume_id: string | null;
  career_type: string | null;
  recent_company: string | null;
  recent_position: string | null;
  recent_start_date: string | null;
  recent_end_date: string | null;
};

function AdminMembersPageInner() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const initialJobType =
    typeParam === "STORE" ? "매장기술직" :
    typeParam === "OFFICE" ? "기업사무직" : "전체";
  const initialDate = searchParams.get("date") === "today" ? "today" : "전체";

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [jobTypeFilter, setJobTypeFilter] = useState(initialJobType);
  const [dateFilter, setDateFilter] = useState(initialDate);
  const [checked, setChecked] = useState<string[]>([]);
  // [SMS 발송 기능 보류] 2026-07
  // const [smsOpen, setSmsOpen] = useState(false);
  const [selected, setSelected] = useState<Member | null>(null);
  const [scrapTarget, setScrapTarget] = useState<Member | null>(null);
  const [scrapList, setScrapList] = useState<{ id: string; name: string; logo_url: string | null; scrapped_at: string }[]>([]);
  const [scrapLoading, setScrapLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  useEffect(() => {
    if (!scrapTarget) return;
    setScrapLoading(true);
    fetch(`/api/admin/members/${scrapTarget.id}/scraps`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setScrapList(d.data?.items || []))
      .catch(() => setScrapList([]))
      .finally(() => setScrapLoading(false));
  }, [scrapTarget]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/members", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMembers(data.success ? data.data.items : []);
    } catch (e) {
      console.error("[fetchMembers]", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const changeStatus = async (id: string, status: string) => {
    await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    });
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, status } : m));
  };

  const handleBulkDelete = async () => {
    if (!checked.length) return;
    if (!confirm(`선택한 ${checked.length}명을 삭제하시겠습니까?`)) return;
    await Promise.all(checked.map((id) =>
      fetch(`/api/admin/members?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
    ));
    setMembers((prev) => prev.filter((m) => !checked.includes(m.id)));
    setChecked([]);
  };

  const matchPeriod = (d: string | null, period: string) => {
    if (!d || period === "전체") return true;
    const dt = new Date(d);
    const now = new Date();
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

  const filtered = members.filter((m) => {
    const matchSearch = !search ||
      m.name?.includes(search) ||
      (m.email || "").includes(search) ||
      (m.phone || "").includes(search);
    const matchStatus = statusFilter === "전체" || STATUS_TO_LABEL[m.status] === statusFilter;
    const matchJobType = jobTypeFilter === "전체" || JOB_TYPE_LABEL[m.job_type || ""] === jobTypeFilter;
    const matchDate = matchPeriod(m.created_at, dateFilter);
    return matchSearch && matchStatus && matchJobType && matchDate;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const toggleCheck = (id: string) =>
    setChecked((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);

  const allPageSelected = paginated.length > 0 && paginated.every((m) => checked.includes(m.id));
  const toggleAllPage = () => {
    const pageIds = paginated.map((m) => m.id);
    if (allPageSelected) {
      setChecked((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setChecked((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const counts = {
    전체: members.length,
    정상: members.filter((m) => m.status === "ACTIVE").length,
    휴면: members.filter((m) => m.status === "INACTIVE").length,
    정지: members.filter((m) => m.status === "SUSPENDED").length,
  };

  return (
    <AdminLayout activeMenu="members">
      <div className="admin-mini-stats">
        {Object.entries(counts).map(([label, count]) => (
          <div key={label} className="admin-mini-stat">
            <span className="admin-mini-stat-label">{label}</span>
            <span className="admin-mini-stat-value">{count}<span className="admin-mini-unit">명</span></span>
          </div>
        ))}
      </div>

      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="이름, 이메일, 연락처 검색"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="admin-form-select" value={jobTypeFilter}
            onChange={(e) => { setJobTypeFilter(e.target.value); setPage(1); }}>
            {["전체", "매장기술직", "기업사무직"].map((t) => (
              <option key={t} value={t}>
                {t === "전체" ? "직군 전체" : t === "매장기술직" ? "매장직" : "사무직"}
              </option>
            ))}
          </select>
          <select className="admin-form-select" value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            {["전체", "정상", "휴면", "정지"].map((s) => (
              <option key={s} value={s}>{s === "전체" ? "계정상태 전체" : s}</option>
            ))}
          </select>
          <select className="admin-form-select" value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}>
            <option value="전체">가입일 전체</option>
            <option value="today">오늘</option>
            <option value="7d">최근 7일</option>
            <option value="1m">최근 1개월</option>
            <option value="3m">최근 3개월</option>
            <option value="1y">최근 1년</option>
          </select>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-table-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>총 <strong>{filtered.length.toLocaleString()}</strong>명</span>
          <div style={{ display: "flex", gap: 8 }}>
          {/* [SMS 발송 기능 보류] 2026-07
          <button
            onClick={() => { if (checked.length) setSmsOpen(true); }}
            disabled={checked.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 6, border: "none",
              background: checked.length ? "#5f0080" : "#ededed",
              color: checked.length ? "#fff" : "#aaa",
              fontSize: 14, fontWeight: 600,
              cursor: checked.length ? "pointer" : "default",
            }}
          >
            문자 발송{checked.length ? ` (${checked.length})` : ""}
          </button>
          */}
          <button
            onClick={handleBulkDelete}
            disabled={checked.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 6, border: "none",
              background: checked.length ? "#e74c3c" : "#ededed",
              color: checked.length ? "#fff" : "#aaa",
              fontSize: 14, fontWeight: 600,
              cursor: checked.length ? "pointer" : "default",
            }}
          >
            <Trash2 size={15} /> 선택 삭제{checked.length ? ` (${checked.length})` : ""}
          </button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ minWidth: 1240, whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th style={{ width: 36, textAlign: "center" }}>
                  <input type="checkbox" checked={allPageSelected} onChange={toggleAllPage} />
                </th>
                <th>이름</th>
                <th style={{ textAlign: "center" }}>직군</th>
                <th>지역</th>
                <th style={{ textAlign: "center" }}>연락처</th>
                <th>최근경력</th>
                <th>재직여부</th>
                <th>가입</th>
                <th>최종로그인</th>
                <th>이력서/포트폴리오</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="admin-empty" style={{ textAlign: "center" }}>불러오는 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="admin-empty" style={{ textAlign: "center" }}>검색 결과가 없습니다.</td></tr>
              ) : paginated.map((m) => {
                const age = calcAge(m.birth_date);
                const gender = genderLabel(m.gender);
                const _cy = calcCareerYears(m.recent_start_date);
                const careerYears = m.career_type === "EXPERIENCED"
                  ? (_cy ? `경력 ${_cy}` : "신입")
                  : (m.career_type === "NEWCOMER" || m.career_type === "NEW") ? "신입" : null;

                return (
                  <tr key={m.id} style={{ background: checked.includes(m.id) ? "#faf5ff" : "" }}>
                    <td style={{ textAlign: "center" }}>
                      <input type="checkbox" checked={checked.includes(m.id)} onChange={() => toggleCheck(m.id)} />
                    </td>

                    {/* 이름: 아바타 + 이름·성별(1행) / 나이·경력(2행) */}
                    <td className="admin-td-brand">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#5f0080", color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            m.name?.[0] || "·"
                          )}
                        </div>
                        <div>
                          {/* 1행: 이름 + 성별 */}
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {m.resume_id ? (
                              <button onClick={() => setSelected(m)} style={{ color: "#1a1a1a", fontWeight: 400, background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}>{m.name}</button>
                            ) : (
                              <span style={{ fontWeight: 600 }}>{m.name}</span>
                            )}
                            {gender && (
                              <span style={{ fontSize: 13, color: "#888" }}>{gender}</span>
                            )}
                          </div>
                          {/* 2행: 나이 · 경력 */}
                          <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                            {age ? `${age}세` : ""}
                            {age && careerYears ? " · " : ""}
                            {careerYears || ""}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 직군: 대분류 / 세부 */}
                    <td className="admin-td-date" style={{ textAlign: "center" }}>
                      <div>{m.job_type === "STORE" ? "매장직" : m.job_type === "OFFICE" ? "사무직" : "-"}</div>
                      <div style={{ marginTop: 2, fontSize: 13, color: "#888", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", margin: "2px auto 0" }} title={m.office_job_areas?.[0] || ""}>
                        {m.office_job_areas && m.office_job_areas.length > 0 ? m.office_job_areas[0] : "-"}
                      </div>
                    </td>

                    {/* 지역: 시도 시군구 한 줄 */}
                    <td className="admin-td-date">
                      {m.region_sido
                        ? [shortSido(m.region_sido), m.region_sigungu].filter(Boolean).join(" ")
                        : "-"}
                    </td>

                    {/* 연락처: 이메일 / 전화 */}
                    <td className="admin-td-date" style={{ textAlign: "center" }}>
                      <div style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", margin: "0 auto" }} title={m.email || ""}>{m.email || "-"}</div>
                      <div style={{ marginTop: 4, color: "#888" }}>{m.phone ? formatPhone(m.phone) : "-"}</div>
                    </td>

                    {/* 최근경력: 회사명 / 직무 */}
                    <td className="admin-td-date">
                      {m.recent_company ? (
                        <>
                          <div style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }} title={m.recent_company}>{m.recent_company}</div>
                          {m.recent_position && (
                            <div style={{ marginTop: 2, fontSize: 13, color: "#aaa", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }} title={m.recent_position}>{m.recent_position}</div>
                          )}
                        </>
                      ) : (
                        <span style={{ color: "#ccc", fontSize: 13 }}>
                          {m.career_type === "NEWCOMER" ? "신입" : "-"}
                        </span>
                      )}
                    </td>

                    {/* 재직여부 */}
                    <td className="admin-td-date">
                      {m.recent_company ? (
                        m.recent_end_date ? (
                          <>
                            <div style={{ color: "#888" }}>퇴직</div>
                            <div style={{ marginTop: 2, fontSize: 13, color: "#aaa" }}>{fmtYearMonth(m.recent_end_date)}</div>
                          </>
                        ) : (
                          <span style={{ color: "#5f0080" }}>재직중</span>
                        )
                      ) : (
                        <span style={{ color: "#ccc" }}>-</span>
                      )}
                    </td>

                    {/* 가입: 가입일 / 가입방법 */}
                    <td className="admin-td-date">
                      <div>{fmtDate(m.created_at)}</div>
                      <div style={{ marginTop: 4 }}>
                        {m.kakao_id ? (
                          <span className="admin-badge" style={{ background: "#FEE500", color: "#3A1D1D", fontSize: 12 }}>카카오</span>
                        ) : m.naver_id ? (
                          <span className="admin-badge" style={{ background: "#03C75A", color: "#fff", fontSize: 12 }}>네이버</span>
                        ) : (
                          <span className="admin-badge admin-badge-neutral" style={{ fontSize: 12 }}>이메일</span>
                        )}
                      </div>
                    </td>

                    {/* 최종로그인 */}
                    <td className="admin-td-date">{fmtDate(m.last_login_at)}</td>

                    {/* 이력서 + 포트폴리오 */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        {/* 1행: 이력서 + 스크랩 */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {m.resume_id ? (
                            <button onClick={() => setSelected(m)} title="이력서 보기" style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: "#5f0080", fontSize: 14, fontWeight: 500, padding: 0 }}>
                              <FileText size={15} /><span>이력서</span>
                            </button>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#ccc", fontSize: 14 }}>
                              <FileText size={15} /><span>이력서</span>
                            </span>
                          )}
                          <button
                            onClick={() => m.scrap_count > 0 && setScrapTarget(m)}
                            disabled={!m.scrap_count}
                            style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "none", border: "none", padding: 0, font: "inherit", fontSize: 13, cursor: m.scrap_count ? "pointer" : "default", color: m.scrap_count ? "#5f0080" : "#ccc" }}
                            title="스크랩한 기업 보기"
                          >
                            <Bookmark size={13} /> {m.scrap_count || 0}
                          </button>
                        </div>
                        {/* 2행: 포트폴리오 */}
                        {m.portfolio_url ? (
                          <a href={m.portfolio_url} target="_blank" rel="noopener noreferrer" title="포트폴리오 보기" style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#5f0080", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>
                            <Paperclip size={13} /><span>포트폴리오</span>
                          </a>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#d0d0d0", fontSize: 13 }}>
                            <Paperclip size={13} /><span>포트폴리오</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 상태 */}
                    <td>
                      <select
                        className={`admin-status-select admin-status-${
                          m.status === "ACTIVE" ? "success" :
                          m.status === "SUSPENDED" ? "danger" : "warning"
                        }`}
                        value={m.status}
                        onChange={(e) => changeStatus(m.id, e.target.value)}
                      >
                        <option value="ACTIVE">정상</option>
                        <option value="INACTIVE">휴면</option>
                        <option value="SUSPENDED">정지</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

        {totalPages > 1 && (
          <div className="admin-pagination">
            <button className="admin-page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>이전</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`admin-page-btn ${page === p ? "active" : ""}`}
                onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="admin-page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>다음</button>
          </div>
        )}
      </div>

      {/* 스크랩 기업 모달 */}
      {scrapTarget && (
        <div onClick={() => setScrapTarget(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 24, width: 400, maxHeight: "70vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>{scrapTarget.name}님을 스크랩한 기업</h3>
              <button onClick={() => setScrapTarget(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 23, lineHeight: 1, color: "#888" }}>×</button>
            </div>
            {scrapLoading ? (
              <div style={{ color: "#888", textAlign: "center", padding: 20 }}>불러오는 중…</div>
            ) : scrapList.length === 0 ? (
              <div style={{ color: "#888", textAlign: "center", padding: 20 }}>스크랩한 기업이 없습니다.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {scrapList.map((c) => (
                  <a key={c.id} href={`/admin/jobs?search=${encodeURIComponent(c.name)}`}
                    style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit", padding: "6px 8px", borderRadius: 8, transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f7f5fa")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f3f0f7", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {c.logo_url ? (
                        <img src={c.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ color: "#5f0080", fontWeight: 700 }}>{c.name?.[0]}</span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 13, color: "#aaa", marginTop: 2 }}>
                        {new Date(c.scrapped_at).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })} 스크랩
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selected && selected.resume_id && (
        <ResumePreviewModal resumeId={selected.resume_id} onClose={() => setSelected(null)} />
      )}
      {/* [SMS 발송 기능 보류] 2026-07
      {smsOpen && (
        <SmsModal
          targets={members.filter((m) => checked.includes(m.id)).map((m) => ({ id: m.id, name: m.name, phone: m.phone }))}
          onClose={() => setSmsOpen(false)}
        />
      )}
      */}
    </AdminLayout>
  );
}

export default function AdminMembersPage() {
  return (
    <Suspense fallback={<AdminLayout activeMenu="members"><div className="admin-empty">불러오는 중...</div></AdminLayout>}>
      <AdminMembersPageInner />
    </Suspense>
  );
}