"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import { Users, Briefcase, FileText, BookmarkCheck, TrendingUp, Plus, Inbox } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Stats {
  active_jobs: number;
  total_applications: number;
  today_applications: number;
  scrapped_talents: number;
  trends: { label: string; value: number }[];
  status_breakdown: { new: number; reviewing: number; passed: number; rejected: number };
  unviewed: number;
  job_conversion: { id: string; title: string; view_count: number; application_count: number; rate: number | null }[];
  job_group_dist: { name: string; value: number }[];
  deadline_alerts: { id: string; title: string; deadline: string; days_left: number }[];
}

interface JobItem {
  id: string;
  title: string;
  job_type: string;
  status: string;
  view_count: number;
  application_count: number;
  deadline: string | null;
  created_at: string;
}

interface ApplicantItem {
  id: string;
  user_name: string;
  job_title: string;
  experience_level: string | null;
  applied_at: string;
  viewed_at: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "진행중",
  CLOSED: "마감",
  HIDDEN: "숨김",
  DRAFT: "임시저장",
  EXPIRED: "만료",
};

const EXP_LABEL: Record<string, string> = {
  NEW: "신입",
  EXPERIENCED: "경력",
  ANY: "경력 무관",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(".", ".");
}

function CompanyRangeToggle({ range, onChange }: { range: string; onChange: (r: "7d" | "1m" | "3m") => void }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {([["7d", "7일"], ["1m", "1개월"], ["3m", "3개월"]] as const).map(([val, label]) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          style={{
            padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
            cursor: "pointer", border: "1px solid #e5e0eb",
            background: range === val ? "#5f0080" : "#fff",
            color: range === val ? "#fff" : "#5f0080",
            transition: "all 0.15s",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function CompanyDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [applicants, setApplicants] = useState<ApplicantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyType, setCompanyType] = useState<"OFFICE" | "STORE" | "BOTH" | null>(null);
  const [jobTypeTab, setJobTypeTab] = useState<"전체" | "OFFICE" | "STORE">("전체");
  const [trendRange, setTrendRange] = useState<"7d" | "1m" | "3m">("7d");
  const [trendRows, setTrendRows] = useState<{ day: string; value: number }[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    fetch("/api/company/me", { headers })
      .then((r) => r.json())
      .then((res) => { if (res.success) setCompanyType(res.data.company_type); })
      .catch(console.error);

    Promise.all([
      fetch("/api/company/dashboard/stats", { headers }).then((r) => r.json()),
      fetch("/api/company/jobs?limit=10", { headers }).then((r) => r.json()),
      fetch("/api/company/applications?limit=5", { headers }).then((r) => r.json()),
    ])
      .then(([statsRes, jobsRes, applicantsRes]) => {
        if (statsRes.success) setStats(statsRes.data);
        if (jobsRes.success) setJobs(jobsRes.data);
        if (applicantsRes.success) setApplicants(applicantsRes.data);
      })
      .catch((e) => console.error("[dashboard load]", e))
      .finally(() => setLoading(false));
  }, []);

  // 기업/매장 탭 변경 시 stats 재조회
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const query = jobTypeTab === "전체" ? "" : `?job_type=${jobTypeTab}`;
    fetch(`/api/company/dashboard/stats${query}`, { headers })
      .then((r) => r.json())
      .then((res) => { if (res.success) setStats(res.data); })
      .catch(console.error);
  }, [jobTypeTab]);

  // 지원자 추이 (기간 토글) — 독립 fetch
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const jt = jobTypeTab === "전체" ? "" : `&job_type=${jobTypeTab}`;
    fetch(`/api/company/dashboard/trend?range=${trendRange}${jt}`, { headers })
      .then((r) => r.json())
      .then((res) => { if (res.success) setTrendRows(res.data.rows || []); })
      .catch(console.error);
  }, [trendRange, jobTypeTab]);

  // 통계 카드 데이터
  const statCards = [
    { label: "진행중 공고", value: stats?.active_jobs ?? 0, unit: "건", color: "#5f0080", icon: FileText, href: "/company/dashboard/jobs" },
    { label: "총 지원자", value: stats?.total_applications ?? 0, unit: "명", color: "#0ea5e9", icon: Users, href: "/company/dashboard/applicants" },
    { label: "오늘 지원", value: stats?.today_applications ?? 0, unit: "명", color: "#10b981", icon: TrendingUp, href: "/company/dashboard/applicants" },
    { label: "스크랩 인재", value: stats?.scrapped_talents ?? 0, unit: "명", color: "#f59e0b", icon: BookmarkCheck, href: "/company/dashboard/talent/scrapped" },
  ];

  const fmtTrendDay = (day: string, range: string) => {
    const dt = new Date(day);
    const md = `${dt.getMonth() + 1}/${dt.getDate()}`;
    return range === "7d" ? md : `${md}~`;
  };
  const chartData = trendRows.map((t) => ({ day: fmtTrendDay(t.day, trendRange), 지원수: t.value }));

  const sb = stats?.status_breakdown ?? { new: 0, reviewing: 0, passed: 0, rejected: 0 };
  const sbTotal = sb.new + sb.reviewing + sb.passed + sb.rejected;
  const statusSegs = [
    { key: "new", label: "신규", value: sb.new, color: "#5f0080" },
    { key: "reviewing", label: "검토중", value: sb.reviewing, color: "#f59e0b" },
    { key: "passed", label: "합격", value: sb.passed, color: "#10b981" },
    { key: "rejected", label: "불합격", value: sb.rejected, color: "#9ca3af" },
  ];
  const unviewed = stats?.unviewed ?? 0;
  const conversion = stats?.job_conversion ?? [];
  const groupDist = stats?.job_group_dist ?? [];
  const deadlineAlerts = stats?.deadline_alerts ?? [];
  const PIE_COLORS = ["#5f0080", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <CompanyLayout activePage="dashboard">
      {/* 기업/매장 토글 (BOTH 회원만) */}
      {companyType === "BOTH" && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {[
            { value: "전체", label: "전체" },
            { value: "STORE", label: "🏪 매장" },
            { value: "OFFICE", label: "🏢 본사" },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setJobTypeTab(t.value as "전체" | "OFFICE" | "STORE")}
              style={{
                padding: "8px 18px", borderRadius: "20px", fontSize: "15px", fontWeight: 600,
                border: jobTypeTab === t.value ? "2px solid #5f0080" : "2px solid #e0e0e0",
                background: jobTypeTab === t.value ? "#5f0080" : "#fff",
                color: jobTypeTab === t.value ? "#fff" : "#888",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ maxWidth: "1440px" }}>
      {/* 통계 카드 */}
      <div className="company-stat-grid">
        {statCards.map((stat) => (
          <div key={stat.label} className="company-stat-card" onClick={() => router.push(stat.href)} style={{ cursor: "pointer" }}>
            <div className="company-stat-icon" style={{ background: stat.color + "18", color: stat.color }}>
              <stat.icon size={22} />
            </div>
            <div className="company-stat-value">
              {stat.value}<span className="company-stat-unit">{stat.unit}</span>
            </div>
            <div className="company-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 차트 + 최근 지원자 */}
      <div className="company-dashboard-grid">
        <div className="company-card">
          <div className="company-card-head">
            <h2 className="company-card-title">지원자 추이</h2>
            <CompanyRangeToggle range={trendRange} onChange={setTrendRange} />
          </div>
          <div style={{ padding: "8px 6px 4px 0" }}>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={chartData} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={26} />
                <Tooltip
                  cursor={{ fill: "rgba(95,0,128,0.06)" }}
                  contentStyle={{ border: "none", boxShadow: "none", background: "transparent", padding: 0 }}
                  labelStyle={{ fontSize: 10, color: "#999", marginBottom: 0 }}
                  itemStyle={{ fontSize: 10, color: "#5f0080", padding: 0 }} />
                <Bar dataKey="지원수" fill="#5f0080" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="company-card">
          <div className="company-card-head">
            <h2 className="company-card-title">최근 지원자</h2>
            {applicants.length > 0 && (
              <Link href="/company/dashboard/applicants" className="company-card-more">전체보기 →</Link>
            )}
          </div>
          {applicants.length === 0 ? (
            <EmptyState
              icon={<Inbox size={32} />}
              message={loading ? "불러오는 중..." : "아직 지원자가 없습니다"}
              hint={loading ? "" : "채용공고를 등록하면 지원자가 들어와요"}
            />
          ) : (
            <table className="company-table" style={{ width: "100%" }}>
              <thead>
                <tr><th>이름</th><th>지원공고</th><th>경력</th><th>지원일</th><th>열람</th></tr>
              </thead>
              <tbody>
                {applicants.map((a) => (
                  <tr key={a.id} onClick={() => router.push("/company/dashboard/applicants")} style={{ cursor: "pointer" }}>
                    <td className="company-td-name">{a.user_name}</td>
                    <td className="company-td-sub">{a.job_title}</td>
                    <td className="company-td-sub">{a.experience_level ? EXP_LABEL[a.experience_level] || "-" : "-"}</td>
                    <td className="company-td-sub">{formatDate(a.applied_at)}</td>
                    <td>
                      <span className={`company-badge ${a.viewed_at ? "viewed" : "new"}`}>
                        {a.viewed_at ? "열람" : "미열람"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 지원자 처리 현황 + 공고별 전환율 */}
      <div className="company-dashboard-grid" style={{ marginTop: 16 }}>
        {/* 지원자 처리 현황 */}
        <div className="company-card">
          <div className="company-card-head">
            <h2 className="company-card-title">지원자 처리 현황</h2>
            {stats && stats.total_applications > 0 && (
              <Link href="/company/dashboard/applicants" className="company-card-more">관리하기 →</Link>
            )}
          </div>
          <div style={{ padding: "14px 14px 16px" }}>
            {sbTotal === 0 ? (
              <div style={{ padding: "28px 0", textAlign: "center", color: "#9a9a9a", fontSize: 14 }}>
                {loading ? "불러오는 중..." : "아직 지원자가 없습니다"}
              </div>
            ) : (
              <>
                {unviewed > 0 && (
                  <Link
                    href="/company/dashboard/applicants"
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: "#fee2e2", color: "#991b1b", fontSize: 13.5, fontWeight: 500, textDecoration: "none", marginBottom: 16 }}
                  >
                    <span style={{ display: "inline-flex", width: 18, height: 18, borderRadius: "50%", background: "#991b1b", color: "#fff", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>!</span>
                    <span>아직 열람하지 않은 지원자 <strong>{unviewed}명</strong>이 있어요 →</span>
                  </Link>
                )}
                <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", background: "#f1f1f4" }}>
                  {statusSegs.filter((x) => x.value > 0).map((x) => (
                    <div key={x.key} title={`${x.label} ${x.value}명`} style={{ width: `${(x.value / sbTotal) * 100}%`, background: x.color }} />
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px", marginTop: 16 }}>
                  {statusSegs.map((x) => (
                    <div key={x.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: x.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "#666" }}>{x.label}</span>
                      <span style={{ marginLeft: "auto", fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>{x.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 공고별 지원 전환율 */}
        <div className="company-card">
          <div className="company-card-head">
            <h2 className="company-card-title">공고별 지원 전환율</h2>
          </div>
          {conversion.length === 0 ? (
            <EmptyState
              icon={<Briefcase size={32} />}
              message={loading ? "불러오는 중..." : "진행중인 공고가 없습니다"}
            />
          ) : (
            <table className="company-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>공고명</th>
                  <th>조회수</th>
                  <th>지원</th>
                  <th>전환율</th>
                </tr>
              </thead>
              <tbody>
                {conversion.map((c) => {
                  const rate = c.rate;
                  const rateColor = rate === null ? "#bbb" : rate >= 5 ? "#10b981" : rate >= 2 ? "#f59e0b" : "#e05252";
                  return (
                    <tr key={c.id}>
                      <td className="company-td-name" style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }} title={c.title}>{c.title}</td>
                      <td className="company-td-sub">{c.view_count.toLocaleString()}</td>
                      <td className="company-td-sub">{c.application_count}</td>
                      <td style={{ fontWeight: 700, color: rateColor }}>{rate === null ? "—" : `${rate}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 직군별 지원 분포 + 마감 임박 공고 */}
      <div className="company-dashboard-grid" style={{ marginTop: 16 }}>
        {/* 직군별 지원 분포 */}
        <div className="company-card">
          <div className="company-card-head">
            <h2 className="company-card-title">직군별 지원 분포</h2>
          </div>
          {groupDist.length === 0 ? (
            <EmptyState icon={<Users size={32} />} message={loading ? "불러오는 중..." : "아직 지원자가 없습니다"} />
          ) : (
            <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: "0 0 34%" }}>
                <ResponsiveContainer width="100%" height={104}>
                  <PieChart>
                    <Pie data={groupDist} cx="50%" cy="50%" innerRadius={26} outerRadius={44} dataKey="value" paddingAngle={2}>
                      {groupDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v}명`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr", gap: "7px 0", fontSize: 12.5, alignContent: "center" }}>
                {groupDist.map((d, i) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#555" }}>{d.name}</span>
                    <span style={{ marginLeft: "auto", fontWeight: 700, color: "#1a1a1a" }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 마감 임박 공고 */}
        <div className="company-card">
          <div className="company-card-head">
            <h2 className="company-card-title">마감 임박 공고</h2>
            <Link href="/company/dashboard/jobs" className="company-card-more">전체보기 →</Link>
          </div>
          {deadlineAlerts.length === 0 ? (
            <EmptyState
              icon={<Briefcase size={32} />}
              message={loading ? "불러오는 중..." : "마감 임박 공고가 없어요"}
              hint={loading ? "" : "3일 내 마감되는 공고가 여기 표시돼요"}
            />
          ) : (
            <div style={{ padding: "8px 6px" }}>
              {deadlineAlerts.map((j) => {
                const d = j.days_left;
                const label = d < 0 ? "마감 지남" : d === 0 ? "오늘 마감" : `D-${d}`;
                const isUrgent = d <= 1;
                const color = isUrgent ? "#e05252" : "#b8860b";
                const bg = isUrgent ? "#fee2e2" : "#fef3c7";
                return (
                  <Link
                    key={j.id}
                    href="/company/dashboard/jobs"
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 10px", borderRadius: 8, textDecoration: "none", color: "inherit" }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14, color: "#1a1a1a" }}>{j.title}</span>
                    <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color, background: bg, borderRadius: 20, padding: "3px 10px" }}>{label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 내 채용공고 */}
      <div className="company-card">
        <div className="company-card-head">
          <h2 className="company-card-title">내 채용공고</h2>
          <Link href="/company/dashboard/jobs" className="company-text-link">
            전체 보기 →
          </Link>
        </div>
        {jobs.length === 0 ? (
          <EmptyState
            icon={<Briefcase size={32} />}
            message={loading ? "불러오는 중..." : "아직 등록된 공고가 없습니다"}
            hint={loading ? "" : "첫 번째 채용공고를 등록해보세요"}
            cta={
              !loading && (
                <Link href="/company/dashboard/jobs/new" className="company-primary-btn" style={{ marginTop: 16 }}>
                  <Plus size={15} /> 공고 등록하기
                </Link>
              )
            }
          />
        ) : (
          <table className="company-table" style={{ width: "100%" }}>
            <thead>
              <tr><th>공고명</th><th>유형</th><th>마감일</th><th>지원자</th><th>조회수</th><th>상태</th></tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} onClick={() => router.push("/company/dashboard/jobs")} style={{ cursor: "pointer" }}>
                  <td className="company-td-name"><span className="td-clamp2">{job.title}</span></td>
                  <td className="company-td-sub">{job.job_type === "STORE" ? "매장" : "본사"}</td>
                  <td className="company-td-sub">{job.deadline ? formatDate(job.deadline) : "상시"}</td>
                  <td className="company-td-sub">{job.application_count}명</td>
                  <td className="company-td-sub">{job.view_count.toLocaleString()}</td>
                  <td>
                    <span className={`company-badge ${job.status === "ACTIVE" ? "active" : "closed"}`}>
                      {STATUS_LABEL[job.status] || job.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </div>
    </CompanyLayout>
  );
}

function EmptyState({ icon, message, hint, cta }: { icon: React.ReactNode; message: string; hint?: string; cta?: React.ReactNode }) {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "#9a9a9a" }}>
      <div style={{ display: "inline-flex", padding: 14, borderRadius: "50%", background: "#f7f7f8", color: "#bfbfbf", marginBottom: 12 }}>
        {icon}
      </div>
      <p style={{ fontSize: 15, color: "#3a3a3a", fontWeight: 500, margin: 0 }}>{message}</p>
      {hint && <p style={{ fontSize: 13, marginTop: 6, marginBottom: 0 }}>{hint}</p>}
      {cta}
    </div>
  );
}
