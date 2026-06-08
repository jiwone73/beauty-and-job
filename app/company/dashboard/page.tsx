"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import { Users, Briefcase, BookmarkCheck, TrendingUp, Plus, Inbox } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Stats {
  active_jobs: number;
  total_applications: number;
  today_applications: number;
  scrapped_talents: number;
  trends: { label: string; value: number }[];
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

export default function CompanyDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [applicants, setApplicants] = useState<ApplicantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyType, setCompanyType] = useState<"OFFICE" | "STORE" | "BOTH" | null>(null);
  const [jobTypeTab, setJobTypeTab] = useState<"전체" | "OFFICE" | "STORE">("전체");

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

  // 통계 카드 데이터
  const statCards = [
    { label: "진행중 공고", value: stats?.active_jobs ?? 0, unit: "건", color: "#5f0080", icon: Briefcase, href: "/company/dashboard/jobs" },
    { label: "총 지원자", value: stats?.total_applications ?? 0, unit: "명", color: "#0ea5e9", icon: Users, href: "/company/dashboard/applicants" },
    { label: "오늘 지원", value: stats?.today_applications ?? 0, unit: "명", color: "#10b981", icon: TrendingUp, href: "/company/dashboard/applicants" },
    { label: "스크랩한 인재", value: stats?.scrapped_talents ?? 0, unit: "명", color: "#f59e0b", icon: BookmarkCheck, href: "/company/dashboard/talent/scrapped" },
  ];

  const chartData = (stats?.trends ?? []).map((t) => ({ day: t.label, 지원수: t.value }));

  return (
    <CompanyLayout activePage="dashboard">
      {/* 환영 메시지 */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", marginBottom: "6px" }}>
          대시보드
        </h1>
        <p style={{ fontSize: "14px", color: "#888" }}>
          오늘도 좋은 인재를 만나보세요 👋
        </p>
      </div>

      {/* 기업/매장 토글 (BOTH 회원만) */}
      {companyType === "BOTH" && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {[
            { value: "전체", label: "전체" },
            { value: "OFFICE", label: "🏢 기업" },
            { value: "STORE", label: "🏪 매장" },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setJobTypeTab(t.value as "전체" | "OFFICE" | "STORE")}
              style={{
                padding: "8px 18px", borderRadius: "20px", fontSize: "14px", fontWeight: 600,
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

      {/* 통계 카드 */}
      <div className="company-stat-grid">
        {statCards.map((stat) => (
          <div key={stat.label} className="company-stat-card">
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
            <h2 className="company-card-title">일별 지원자 추이 (최근 7일)</h2>
          </div>
          <div style={{ padding: "16px 8px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
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
            <table className="company-table">
              <thead>
                <tr><th>이름</th><th>지원공고</th><th>경력</th><th>지원일</th><th>열람</th></tr>
              </thead>
              <tbody>
                {applicants.map((a) => (
                  <tr key={a.id}>
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
          <table className="company-table">
            <thead>
              <tr><th>공고명</th><th>유형</th><th>마감일</th><th>지원자</th><th>조회수</th><th>상태</th></tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="company-td-name">{job.title}</td>
                  <td className="company-td-sub">{job.job_type === "STORE" ? "매장" : "기업"}</td>
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
    </CompanyLayout>
  );
}

function EmptyState({ icon, message, hint, cta }: { icon: React.ReactNode; message: string; hint?: string; cta?: React.ReactNode }) {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "#9a9a9a" }}>
      <div style={{ display: "inline-flex", padding: 14, borderRadius: "50%", background: "#f7f7f8", color: "#bfbfbf", marginBottom: 12 }}>
        {icon}
      </div>
      <p style={{ fontSize: 14, color: "#3a3a3a", fontWeight: 500, margin: 0 }}>{message}</p>
      {hint && <p style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}>{hint}</p>}
      {cta}
    </div>
  );
}
