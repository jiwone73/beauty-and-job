"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
  return "";
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
};

function AdminMembersPageInner() {
  const searchParams = useSearchParams();
  // 대시보드 카드에서 넘어온 초기 필터
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
  const [selected, setSelected] = useState<Member | null>(null);
  const [scrapTarget, setScrapTarget] = useState<Member | null>(null);
  const [scrapList, setScrapList] = useState<{ id: string; name: string; logo_url: string | null }[]>([]);
  const [scrapLoading, setScrapLoading] = useState(false);

  useEffect(() => {
    if (!scrapTarget) return;
    setScrapLoading(true);
    const t = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    fetch(`/api/admin/members/${scrapTarget.id}/scraps`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then((r) => r.json())
      .then((d) => setScrapList(d.data?.items || []))
      .catch(() => setScrapList([]))
      .finally(() => setScrapLoading(false));
  }, [scrapTarget]);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

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

  const isToday = (d: string | null) => {
    if (!d) return false;
    const dt = new Date(d); const now = new Date();
    return dt.getFullYear() === now.getFullYear()
      && dt.getMonth() === now.getMonth()
      && dt.getDate() === now.getDate();
  };

  const filtered = members.filter((m) => {
    const matchSearch = !search ||
      m.name?.includes(search) ||
      (m.email || "").includes(search) ||
      (m.phone || "").includes(search);
    const matchStatus = statusFilter === "전체" || STATUS_TO_LABEL[m.status] === statusFilter;
    const matchJobType = jobTypeFilter === "전체" || JOB_TYPE_LABEL[m.job_type || ""] === jobTypeFilter;
    const matchDate = dateFilter === "전체" || isToday(m.created_at);
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
          <div className="admin-filter-group">
            <span className="admin-filter-label">직군</span>
            <div className="admin-filter-tabs">
              {["전체", "매장기술직", "기업사무직"].map((t) => (
                <button key={t} className={`admin-filter-tab ${jobTypeFilter === t ? "active" : ""}`}
                  onClick={() => { setJobTypeFilter(t); setPage(1); }}>{t}</button>
              ))}
            </div>
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">계정상태</span>
            <div className="admin-filter-tabs">
              {["전체", "정상", "휴면", "정지"].map((s) => (
                <button key={s} className={`admin-filter-tab ${statusFilter === s ? "active" : ""}`}
                  onClick={() => { setStatusFilter(s); setPage(1); }}>{s}</button>
              ))}
            </div>
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">가입일</span>
            <div className="admin-filter-tabs">
              {["전체", "오늘"].map((d) => {
                const val = d === "오늘" ? "today" : "전체";
                return (
                  <button key={d} className={`admin-filter-tab ${dateFilter === val ? "active" : ""}`}
                    onClick={() => { setDateFilter(val); setPage(1); }}>{d}</button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-table-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>총 <strong>{filtered.length.toLocaleString()}</strong>명</span>
          <button
            onClick={handleBulkDelete}
            disabled={checked.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 6, border: "none",
              background: checked.length ? "#e74c3c" : "#ededed",
              color: checked.length ? "#fff" : "#aaa",
              fontSize: 13, fontWeight: 600,
              cursor: checked.length ? "pointer" : "default",
            }}
          >
            <Trash2 size={15} /> 선택 삭제{checked.length ? ` (${checked.length})` : ""}
          </button>
        </div>
        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">검색 결과가 없습니다.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "36px", textAlign: "center" }}>
                  <input type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAllPage} />
                </th>
                <th>가입</th>
                <th>이름</th>
                <th>지역</th>
                <th>이력서</th>
                <th>직군</th>
                <th>포폴</th>
                <th>연락처</th>
                <th>최근 로그인</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((m) => {
                const age = calcAge(m.birth_date);
                return (
                <tr key={m.id} style={{ background: checked.includes(m.id) ? "#faf5ff" : "" }}>
                  <td style={{ textAlign: "center" }}>
                    <input type="checkbox"
                      checked={checked.includes(m.id)}
                      onChange={() => toggleCheck(m.id)} />
                  </td>
                  {/* 가입: 가입일 / 가입방법 */}
                  <td className="admin-td-date">
                    <div>{fmtDate(m.created_at)}</div>
                    <div style={{ marginTop: 4 }}>
                      {m.kakao_id ? (
                        <span className="admin-badge" style={{ background: "#FEE500", color: "#3A1D1D", fontSize: 11 }}>카카오</span>
                      ) : m.naver_id ? (
                        <span className="admin-badge" style={{ background: "#03C75A", color: "#fff", fontSize: 11 }}>네이버</span>
                      ) : (
                        <span className="admin-badge admin-badge-neutral" style={{ fontSize: 11 }}>이메일</span>
                      )}
                    </div>
                  </td>
                  {/* 이름: 이름·나이·성별 / 지역 */}
                  <td className="admin-td-brand">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#5f0080", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          m.name?.[0] || "·"
                        )}
                      </div>
                      <div>
                        <div>
                          {m.resume_id ? (
                            <button onClick={() => setSelected(m)} style={{ color: "#5f0080", fontWeight: 600, background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}>{m.name}</button>
                          ) : (
                            <span style={{ fontWeight: 600 }}>{m.name}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                          {genderLabel(m.gender)}{age ? ` · ${age}세` : ""}
                        </div>
                        </div>
                    </div>
                  </td>
                  {/* 지역 */}
                  <td className="admin-td-date">
                    {m.region_sido ? `${shortSido(m.region_sido)}${m.region_sigungu ? " " + m.region_sigungu : ""}` : "-"}
                  </td>
                  {/* 이력서: 아이콘 / 스크랩 */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {m.resume_id ? (
                        <button onClick={() => setSelected(m)} title="이력서 보기" style={{ background: "none", border: "none", cursor: "pointer", color: "#5f0080", padding: 0 }}>
                          <FileText size={18} />
                        </button>
                      ) : (
                        <span style={{ color: "#ddd" }}><FileText size={18} /></span>
                      )}
                      <button
                        onClick={() => m.scrap_count > 0 && setScrapTarget(m)}
                        disabled={!m.scrap_count}
                        style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "none", border: "none", padding: 0, font: "inherit", fontSize: 12, cursor: m.scrap_count ? "pointer" : "default", color: m.scrap_count ? "#5f0080" : "#ccc" }}
                        title="스크랩한 기업 보기"
                      >
                        <Bookmark size={13} /> {m.scrap_count || 0}
                      </button>
                    </div>
                  </td>
                  {/* 직군 (1depth) */}
                  <td className="admin-td-date">
                    {m.office_job_areas && m.office_job_areas.length > 0 ? m.office_job_areas[0] : "-"}
                  </td>
                  {/* 포트폴리오 */}
                  <td style={{ textAlign: "center" }}>
                    {m.portfolio_url ? (
                      <a href={m.portfolio_url} target="_blank" rel="noopener noreferrer" title="포트폴리오 열기" style={{ color: "#5f0080" }}>
                        <Paperclip size={16} />
                      </a>
                    ) : (
                      <span style={{ color: "#ccc" }}>✕</span>
                    )}
                  </td>
                  {/* 연락처: 이메일 / 전화 */}
                  <td className="admin-td-date">
                    <div>{m.email || "-"}</div>
                    <div style={{ marginTop: 4, color: "#888" }}>{m.phone || "-"}</div>
                  </td>
                  {/* 최근 로그인 */}
                  <td className="admin-td-date">{fmtDate(m.last_login_at)}</td>
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
        )}

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
    {scrapTarget && (
        <div onClick={() => setScrapTarget(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 24, width: 400, maxHeight: "70vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>{scrapTarget.name}님을 스크랩한 기업</h3>
              <button onClick={() => setScrapTarget(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, lineHeight: 1, color: "#888" }}>×</button>
            </div>
            {scrapLoading ? (
              <div style={{ color: "#888", textAlign: "center", padding: 20 }}>불러오는 중…</div>
            ) : scrapList.length === 0 ? (
              <div style={{ color: "#888", textAlign: "center", padding: 20 }}>스크랩한 기업이 없습니다.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {scrapList.map((c) => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f3f0f7", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {c.logo_url ? (
                        <img src={c.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ color: "#5f0080", fontWeight: 700 }}>{c.name?.[0]}</span>
                      )}
                    </div>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {selected && selected.resume_id && (
        <ResumePreviewModal
          resumeId={selected.resume_id}
          onClose={() => setSelected(null)}
        />
      )}
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