"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import { Briefcase, Plus, Inbox } from "lucide-react";

interface Stats {
  active_jobs: number;
  deadline_today: number;
  scrapped_talents: number;
  unviewed_applications: number;
  unanswered_chats: number;
}

interface JobItem {
  id: string;
  title: string;
  job_type: string;
  status: string;
  application_count: number;
  unviewed_count: number;
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

export default function CompanyDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [applicants, setApplicants] = useState<ApplicantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyType, setCompanyType] = useState<"OFFICE" | "STORE" | null>(null);
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
      fetch("/api/company/applications?limit=50", { headers }).then((r) => r.json()),
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
  // 누적 숫자(총 지원자·오늘 지원)는 봐도 할 일이 생기지 않아 뺐다. 남긴 둘은
  // 각각 '지금 몇 자리 뽑고 있나'와 '오늘 손쓰지 않으면 내려간다'로 행동이 붙는다.
  // 다섯 줄까지만 보인다 — 더 있으면 '전체보기'로 간다.
  const 안본전체 = applicants.filter((a) => !a.viewed_at);
  const 안본지원자 = 안본전체.slice(0, 5);

  // 셀렉미 「활동정보」의 모양(한 판 안에 칸, 라벨이 위 숫자가 아래, 아이콘도 색도
  // 없음)은 가져오되 내용은 다르다. 거기는 마이페이지 요약이라 누적을 보여주지만
  // 여기는 홈이고, 사장님이 홈을 여는 이유는 「지금 뭘 해야 하나」 하나다.
  // 넷 다 0이면 좋은 숫자다 — 누적이 아니라 밀린 일이다.
  // 이름은 화면 곳곳에서 이미 쓰는 말을 그대로 쓴다 — 지원자 카운터의 「미열람」,
  // 인재풀 사이드의 「스크랩 인재」, 보낸 제안 머리줄의 「미답변 문의」.
  // 홈에서만 다른 말을 지어내면 같은 것을 두 이름으로 부르게 된다.
  const statCards = [
    { label: "미열람", value: stats?.unviewed_applications ?? 0, href: "/company/dashboard/applicants" },
    { label: "오늘 마감", value: stats?.deadline_today ?? 0, href: "/company/dashboard/jobs?status=오늘 마감" },
    { label: "미답변 문의", value: stats?.unanswered_chats ?? 0, href: "/company/dashboard/proposals" },
    { label: "스크랩 인재", value: stats?.scrapped_talents ?? 0, href: "/company/dashboard/talent/scrapped" },
  ];


  return (
    <CompanyLayout activePage="dashboard">

      <div style={{ maxWidth: "1440px" }}>
      {/* 오늘 할 일 — 0 인 칸은 조용하다. 넷 다 0 이면 오늘은 손댈 것이 없다는 뜻이다. */}
      <div className="co-counts">
        {statCards.map((stat) => (
          <button key={stat.label} type="button"
            className={`co-count${stat.value > 0 ? " on" : ""}`}
            onClick={() => router.push(stat.href)}>
            <span className="co-count-label">{stat.label}</span>
            <span className="co-count-value">{stat.value}</span>
          </button>
        ))}
      </div>

      {/* 아직 안 본 지원자 — 사장님이 대시보드를 매일 여는 이유가 이것 하나다.
          누적 지원자 수가 아니라 '내가 아직 안 본 사람'이 행동으로 이어진다. */}
      <div style={{ marginTop: 16 }}>
        <div className="company-card">
          <div className="company-card-head">
            <h2 className="company-card-title">미열람 지원자{안본전체.length > 0 && <span style={{ marginLeft: 8, color: "#582681" }}>{안본전체.length}</span>}</h2>
            {applicants.length > 0 && (
              <Link href="/company/dashboard/applicants" className="company-card-more">전체보기 →</Link>
            )}
          </div>
          {안본지원자.length === 0 ? (
            <EmptyState
              icon={<Inbox size={32} />}
              message={loading ? "불러오는 중..." : applicants.length > 0 ? "지원자를 모두 확인했어요" : "아직 지원자가 없습니다"}
              hint={loading ? "" : applicants.length > 0 ? "" : "채용공고를 등록하면 지원자가 들어와요"}
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
            <table className="company-table dash-table" style={{ width: "100%" }}>
              <thead>
                <tr><th>이름</th><th>지원공고</th><th>경력</th><th>지원일</th></tr>
              </thead>
              <tbody>
                {안본지원자.map((a) => (
                  <tr key={a.id} onClick={() => router.push("/company/dashboard/applicants")} style={{ cursor: "pointer" }}>
                    <td className="company-td-name">{a.user_name}</td>
                    <td className="company-td-sub">{a.job_title}</td>
                    <td className="company-td-sub">{a.experience_level ? EXP_LABEL[a.experience_level] || "-" : "-"}</td>
                    <td className="company-td-sub">{formatDate(a.applied_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      {/* 내 채용공고 + 공고별 전환율 */}
      <div style={{ marginTop: 16 }}>
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
            <div style={{ overflowX: "auto" }}>
            <table className="company-table dash-table" style={{ width: "100%" }}>
              <thead>
                <tr><th>공고명</th><th>등록일</th><th>마감일</th><th>미열람</th><th>상태</th></tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} onClick={() => router.push("/company/dashboard/jobs")} style={{ cursor: "pointer" }}>
                    <td className="company-td-name"><span className="td-clamp2">{job.title}</span></td>
                    <td className="company-td-sub">{formatDate(job.created_at)}</td>
                    <td className="company-td-sub">{job.deadline ? formatDate(job.deadline) : "상시"}</td>
                    <td className="company-td-sub" style={job.unviewed_count > 0 ? { color: "#582681" } : undefined}>
                      {job.unviewed_count > 0 ? `${job.unviewed_count}명` : "-"}
                    </td>
                    <td>
                      {(() => {
                        // 마감일 칸이 바로 옆에 언제까지인지 말해주니, 여기는 지금 상태만
                        // 짧게 말한다(채용공고 관리 목록과 같은 기준 — "상태가 필요할까?
                        // 마감일하고 같은데").
                        const dl = job.deadline ? Math.ceil((new Date(job.deadline).getTime() - Date.now()) / 86400000) : null;
                        const closed = job.status === "CLOSED" || (dl !== null && dl < 0);
                        const label = job.status === "DRAFT" ? "임시저장" : job.status === "PAUSED" ? "일시중지" : closed ? "마감" : "진행중";
                        const color = job.status === "DRAFT" ? "#999" : job.status === "PAUSED" ? "#f59e0b" : closed ? "#888" : "#10b981";
                        return <span style={{ color, whiteSpace: "nowrap" }}>{label}</span>;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
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
