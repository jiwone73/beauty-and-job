"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import ResumePreviewModal from "@/components/admin/ResumePreviewModal";
import FilterDropdown from "@/components/company/FilterDropdown";
import { Search, FileText, Paperclip, Instagram } from "lucide-react";
import LinkCell from "@/components/company/LinkCell";
import { shortenRegion } from "@/lib/memberFormat";

const DATE_LABELS: Record<string, string> = { "전체": "전체", today: "오늘", "7d": "최근 7일", "1m": "최근 1개월", "3m": "최근 3개월", "1y": "최근 1년" };
const DATE_VALUES: Record<string, string> = { "전체": "전체", "오늘": "today", "최근 7일": "7d", "최근 1개월": "1m", "최근 3개월": "3m", "최근 1년": "1y" };
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
  portfolio_images: { url: string }[] | null;
  recent_career: { start_date: string | null; is_current: boolean } | null;
  career_count: number;
  resume_id: string | null;
  position: string;
  job_type: string | null;
  company_name: string;
  company_is_member: boolean | null;
  linked_at: string | null;
  job_categories: string[] | null;
  applicant_main_job_group: string | null;
  applicant_sub_job: string | null;
  cover_letter: string | null;
  resume_snapshot: any | null;
  sns_url: string | null;
  region_sido: string | null;
  region_sigungu: string | null;
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
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [dateFilter, setDateFilter] = useState(initialDate);
  const [memberFilter, setMemberFilter] = useState("전체");
  const [jobTypeFilter, setJobTypeFilter] = useState("전체");
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

  const filtered = apps.filter((a) => {
    const matchSearch = !search || (a.applicant_name || "").includes(search) || (a.company_name || "").includes(search) || (a.position || "").includes(search);
    const matchStatus = statusFilter === "전체" || STATUS_TO_LABEL[a.status] === statusFilter;
    const matchDate = matchPeriod(a.applied_at, dateFilter);
    const matchMember = memberFilter === "전체" || (memberFilter === "비회원기업 공고 지원" ? !a.company_is_member : !!a.company_is_member);
    const matchType = jobTypeFilter === "전체" || (a.job_type === "STORE" ? "매장" : "오피스") === jobTypeFilter;
    return matchSearch && matchStatus && matchDate && matchMember && matchType;
  });

  return (
    <AdminLayout activeMenu="resumes-applications">
      {/* 인재 구분 — 매장/오피스 라디오 */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <span style={{ fontSize: 14, color: "#555" }}>인재 구분</span>
        {(["전체", "매장", "오피스"] as const).map((opt) => (
          <label key={opt} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 15, color: jobTypeFilter === opt ? "#582681" : "#555" }}>
            <input type="radio" name="applicantTrack" checked={jobTypeFilter === opt}
              onChange={() => setJobTypeFilter(opt)}
              style={{ accentColor: "#582681", width: 16, height: 16, margin: 0, cursor: "pointer" }} />
            {opt}
          </label>
        ))}
      </div>
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="지원자, 기업명, 포지션 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <FilterDropdown label="지원상태"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(v) => setStatusFilter(v)} />
          <FilterDropdown label="지원일"
            value={DATE_LABELS[dateFilter] || "전체"}
            options={["전체", "오늘", "최근 7일", "최근 1개월", "최근 3개월", "최근 1년"]}
            onChange={(v) => setDateFilter(DATE_VALUES[v] ?? "전체")} />
          <FilterDropdown label="지원구분"
            value={memberFilter}
            options={["전체", "비회원기업 공고 지원", "회원기업 공고 지원"]}
            onChange={(v) => setMemberFilter(v)} />
        </div>
      </div>
      <div className="admin-card">
        <div className="admin-table-meta">총 <strong>{filtered.length}</strong>건</div>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ minWidth: 1080, whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th>지원자</th>
                <th>매장 · 공고</th>
                <th>모집분야</th>
                <th>희망지역</th>
                <th>지원일</th>
                <th>자소서 · 포폴 · SNS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="admin-empty" style={{ textAlign: "center" }}>불러오는 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="admin-empty" style={{ textAlign: "center" }}>검색 결과가 없습니다.</td></tr>
              ) : filtered.map((a) => {
                const age = calcAge(a.birth_date);
                const gender = genderLabel(a.gender);
                const career = a.career_count > 0
                  ? `경력 ${calcCareerYears(a.recent_career?.start_date || null) || ""}`
                  : "신입";
                const hasResume = a.resume_id || a.cover_letter || a.resume_snapshot;
                // 외부(비회원) 기업 지원 중 아직 '지원서 연결' 전 → 연한 그레이로 구분
                const notConnected = !a.company_is_member && !a.linked_at;
                return (
                  <tr key={a.id} style={notConnected ? { background: "#e6e8eb" } : undefined}
                    title={notConnected ? "아직 지원서 연결(회원 기업 연결) 전 지원이에요" : undefined}>
                    {/* 지원자: 아바타 + 이름·성별 / 나이·경력 */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {a.avatar_url ? (
                          <img
                            src={a.avatar_url}
                            alt={a.applicant_name}
                            style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "1px solid #f0f0f0", flexShrink: 0 }}
                          />
                        ) : (
                          <div style={{
                            width: 44, height: 44, borderRadius: "50%", background: "#f7f7f8",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 17, fontWeight: 700, color: "#582681", flexShrink: 0
                          }}>
                            {(a.applicant_name || "?").charAt(0)}
                          </div>
                        )}
                        <div style={{ textAlign: "left" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {hasResume ? (
                              <button
                                onClick={() => setSelected(a)}
                                className="admin-name-b"
                                style={{ color: "#555", background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}>
                                {a.applicant_name}
                              </button>
                            ) : (
                              <span className="admin-name-b">{a.applicant_name}</span>
                            )}
                            {gender && <span style={{ fontSize: 13, color: "#555" }}>{gender}</span>}
                          </div>
                          <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
                            {[age ? `${age}세` : null, career].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* 매장 · 공고 — 1행 매장, 2행 공고명. 둘 다 「어느 자리에 지원했나」
                        하나를 말하는 값이라 갈라 두면 눈이 두 번 움직인다. */}
                    <td>
                      <div className="adm-shop" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.company_name}
                        </span>
                        <span style={{ flexShrink: 0 }}>{a.job_type === "STORE" ? "매장" : "오피스"}</span>
                      </div>
                      <div className="adm-td2 adm-w-lg" style={{ margin: "3px 0 0" }} title={a.position}>
                        {a.position}
                      </div>
                    </td>
                    {/* 모집분야 — 지원한 공고가 뽑는 자리다. 지원자 프로필 직군을 적으면
                        제목과 값이 어긋난다(그건 개인회원 표가 맡는다). */}
                    <td className="admin-td-date">
                      {a.job_categories && a.job_categories.length > 0 ? (
                        <div className="adm-td2 adm-w-md" title={a.job_categories.join(" · ")}>
                          {a.job_categories.join(" · ")}
                        </div>
                      ) : "-"}
                    </td>
                    {/* 희망지역 — 공고 자리와 멀어진 지원이 여기서 드러난다. */}
                    <td className="admin-td-date">
                      {shortenRegion([a.region_sido, a.region_sigungu].filter(Boolean).join(" ")) || "-"}
                    </td>
                    {/* 지원일 */}
                    <td className="admin-td-date">{fmtDate(a.applied_at)}</td>
                    {/* 자소서 · 포폴 · SNS — 얼마나 갖춘 지원인가가 한 칸에 모인다.
                        이력서는 뺐다. 이름을 눌러도 같은 이력서가 열려 한 줄에 같은
                        문이 둘이었다. 색이 있다/없다를 말한다. */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <LinkCell url={a.cover_letter ? "있음" : null} icon={<FileText size={13} />} label="자소서" />
                        <LinkCell url={a.portfolio_images?.[0]?.url ?? null} icon={<Paperclip size={13} />} label="포폴" />
                        <LinkCell url={a.sns_url} icon={<Instagram size={13} />} label="SNS" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
      </div>
      {selected && (selected.resume_id || selected.cover_letter || selected.resume_snapshot) && (
        <ResumePreviewModal
          resumeId={selected.resume_id || ""}
          jobCategory={selected.job_categories?.[0] || null}
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