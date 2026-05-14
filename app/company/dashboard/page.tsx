"use client";
import Link from "next/link";
import CompanyLayout from "@/components/company/CompanyLayout";
import { Users, Briefcase, Eye, BookmarkCheck, TrendingUp, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const STATS = [
  { label: "진행중 공고", value: "5", unit: "건", color: "#5f0080", icon: Briefcase },
  { label: "총 지원자", value: "128", unit: "명", color: "#0ea5e9", icon: Users },
  { label: "오늘 지원", value: "12", unit: "명", color: "#10b981", icon: TrendingUp },
  { label: "스크랩한 인재", value: "24", unit: "명", color: "#f59e0b", icon: BookmarkCheck },
];

const APPLY_DATA = [
  { day: "1/14", 지원수: 8 }, { day: "1/15", 지원수: 15 },
  { day: "1/16", 지원수: 11 }, { day: "1/17", 지원수: 19 },
  { day: "1/18", 지원수: 14 }, { day: "1/19", 지원수: 9 },
  { day: "1/20", 지원수: 12 },
];

const MY_JOBS = [
  { id: 1, title: "디지털 마케팅 매니저", category: "마케팅", deadline: "2025.02.28", applicants: 34, views: 412, status: "진행중" },
  { id: 2, title: "MD - 색조 카테고리", category: "MD", deadline: "2025.02.15", applicants: 28, views: 287, status: "진행중" },
  { id: 3, title: "SCM 물류 담당자", category: "SCM", deadline: "2025.01.31", applicants: 19, views: 198, status: "진행중" },
  { id: 4, title: "HR 채용 담당자", category: "HR", deadline: "2025.01.20", applicants: 47, views: 523, status: "마감" },
];

const RECENT_APPLICANTS = [
  { id: 1, name: "김지수", job: "디지털 마케팅 매니저", career: "경력 3년", date: "2025.01.20", viewed: false },
  { id: 2, name: "박민준", job: "MD - 색조 카테고리", career: "경력 5년", date: "2025.01.20", viewed: true },
  { id: 3, name: "최유나", job: "디지털 마케팅 매니저", career: "경력 4년", date: "2025.01.19", viewed: false },
  { id: 4, name: "이수진", job: "SCM 물류 담당자", career: "신입", date: "2025.01.19", viewed: true },
];

export default function CompanyDashboard() {
  return (
    <CompanyLayout activePage="dashboard">
      <div className="company-stat-grid">
        {STATS.map((stat) => (
          <div key={stat.label} className="company-stat-card">
            <div className="company-stat-icon" style={{ background: stat.color + "18", color: stat.color }}>
              <stat.icon size={22} />
            </div>
            <div className="company-stat-value">{stat.value}<span className="company-stat-unit">{stat.unit}</span></div>
            <div className="company-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="company-dashboard-grid">
        <div className="company-card">
          <div className="company-card-head">
            <h2 className="company-card-title">일별 지원자 추이 (최근 7일)</h2>
          </div>
          <div style={{padding:"16px 8px"}}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={APPLY_DATA}>
                <XAxis dataKey="day" tick={{fontSize:12}} />
                <YAxis tick={{fontSize:12}} />
                <Tooltip />
                <Bar dataKey="지원수" fill="#5f0080" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="company-card">
          <div className="company-card-head">
            <h2 className="company-card-title">최근 지원자</h2>
            <Link href="/company/dashboard/applicants" className="company-card-more">전체보기 →</Link>
          </div>
          <table className="company-table">
            <thead>
              <tr><th>이름</th><th>지원공고</th><th>경력</th><th>지원일</th><th>열람</th></tr>
            </thead>
            <tbody>
              {RECENT_APPLICANTS.map((a) => (
                <tr key={a.id}>
                  <td className="company-td-name">{a.name}</td>
                  <td className="company-td-sub">{a.job}</td>
                  <td className="company-td-sub">{a.career}</td>
                  <td className="company-td-sub">{a.date}</td>
                  <td><span className={`company-badge ${a.viewed ? "viewed" : "new"}`}>{a.viewed ? "열람" : "미열람"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="company-card">
        <div className="company-card-head">
          <h2 className="company-card-title">내 채용공고</h2>
          <Link href="/company/dashboard/jobs/new" className="company-primary-btn">
            <Plus size={15} /> 공고 등록
          </Link>
        </div>
        <table className="company-table">
          <thead>
            <tr><th>공고명</th><th>직군</th><th>마감일</th><th>지원자</th><th>조회수</th><th>상태</th></tr>
          </thead>
          <tbody>
            {MY_JOBS.map((job) => (
              <tr key={job.id}>
                <td className="company-td-name">{job.title}</td>
                <td className="company-td-sub">{job.category}</td>
                <td className="company-td-sub">{job.deadline}</td>
                <td className="company-td-sub">{job.applicants}명</td>
                <td className="company-td-sub">{job.views.toLocaleString()}</td>
                <td><span className={`company-badge ${job.status === "진행중" ? "active" : "closed"}`}>{job.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CompanyLayout>
  );
}
