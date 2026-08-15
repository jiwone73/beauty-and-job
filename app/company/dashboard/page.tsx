"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import { Users, Briefcase, FileText, BookmarkCheck, TrendingUp, Plus, Inbox } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Stats {
  active_jobs: number;
  total_applications: number;
  today_applications: number;
  scrapped_talents: number;
  trends: { label: string; value: number }[];
  status_breakdown: { new: number; reviewing: number; passed: number; rejected: number };
  oldest_pending_at: string | null;
  job_conversion: { id: string; title: string; view_count: number; application_count: number; rate: number | null }[];
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
  const [companyType, setCompanyType] = useState<"OFFICE" | "STORE" | null>(null);
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
  // 합격·불합격은 이미 내린 결정이라 오늘 할 일을 바꾸지 않는다. 남은 일(확인 안 함·검토 중)만 앞에 두고
  // 끝난 건은 한 줄로 접는다. 비율 막대는 쓰지 않는다 — 신규 1건뿐일 때 100%로 꽉 차 다 끝난 것처럼 보인다.
  // 아직 합격/불합격을 정하지 않은 건. 열어는 봤지만 결정을 미룬 것도 포함한다.
  const pendingCount = sb.new + sb.reviewing;
  // 급한 정도는 건수보다 기다린 시간이 알려준다.
  const waitedDays = (() => {
    const at = stats?.oldest_pending_at;
    if (!at) return null;
    const d = Math.floor((Date.now() - new Date(at).getTime()) / 86400000);
    return Number.isFinite(d) && d >= 0 ? d : null;
  })();
  const conversion = stats?.job_conversion ?? [];
  const deadlineAlerts = stats?.deadline_alerts ?? [];

  return (
    <CompanyLayout activePage="dashboard">

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
                <XAxis dataKey="day" tick={{ fontSize: 10 }} minTickGap={4}
                  interval={chartData.length <= 8 ? 0 : Math.max(1, Math.ceil(chartData.length / 6) - 1)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={26} />
                <Tooltip
                  cursor={{ fill: "rgba(95,0,128,0.06)" }}
                  contentStyle={{ border: "none", boxShadow: "none", background: "transparent", padding: 0 }}
                  labelStyle={{ fontSize: 10, color: "#999", marginBottom: 0 }}
                  itemStyle={{ fontSize: 10, color: "#3d9be0", padding: 0 }} />
                <Bar dataKey="지원수" fill="#8ec8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="company-card">
          <div className="company-card-head">
            <h2 className="company-card-title">최근 지원자</h2>
            {/* 밀린 일과 누구를 처리하면 되는지를 한자리에 둔다 — 따로 카드를 두면 같은 얘기를 두 번 하게 된다. */}
            {pendingCount > 0 && (
              <span style={{ marginLeft: 10, fontSize: 12.5, color: "#991b1b", background: "#fee2e2", borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>
                미처리 {pendingCount}명{waitedDays !== null && waitedDays > 0 ? ` · ${waitedDays}일째` : ""}
              </span>
            )}
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

      {/* 공고별 전환율 + 마감 임박 공고 */}
      <div className="company-dashboard-grid" style={{ marginTop: 16 }}>
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
                  // 전환율에 색을 입히지 않는다. 대시보드에서 빨강은 "지금 조치가 필요하다"로 읽히는데,
                  // 조회 7건에서 나온 0%와 89건에서 나온 0%는 성격이 전혀 다르다.
                  // 표본이 쌓여 공고끼리 비교가 될 때 다시 판단한다.
                  return (
                    <tr key={c.id}>
                      <td className="company-td-name" style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }} title={c.title}>{c.title}</td>
                      <td className="company-td-sub">{c.view_count.toLocaleString()}</td>
                      <td className="company-td-sub">{c.application_count}</td>
                      <td className="company-td-sub" style={{ fontWeight: 600 }}>{rate === null ? "—" : `${rate}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
              <tr><th>공고명</th><th>마감일</th><th>지원자</th><th>조회수</th><th>상태</th></tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} onClick={() => router.push("/company/dashboard/jobs")} style={{ cursor: "pointer" }}>
                  <td className="company-td-name"><span className="td-clamp2">{job.title}</span></td>
                  <td className="company-td-sub">{job.deadline ? formatDate(job.deadline) : "상시"}</td>
                  <td className="company-td-sub">{job.application_count}명</td>
                  <td className="company-td-sub">{job.view_count.toLocaleString()}</td>
                  <td>
                    {(() => {
                      const dl = job.deadline ? Math.ceil((new Date(job.deadline).getTime() - Date.now()) / 86400000) : null;
                      const closed = job.status === "CLOSED" || (dl !== null && dl < 0);
                      const label = closed ? "마감" : !job.deadline ? "상시" : `D-${dl}`;
                      const color = closed ? "#888" : !job.deadline ? "#10b981" : (dl !== null && dl <= 7) ? "#e74c3c" : "#10b981";
                      return <span style={{ color, whiteSpace: "nowrap" }}>{label}</span>;
                    })()}
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
