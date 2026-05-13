"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase, Users, Eye, BookmarkCheck,
  TrendingUp, Plus, Bell, LogOut, ChevronRight,
  FileText, Settings
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

/* ============================================
   더미 데이터
   ============================================ */
const COMPANY = {
  name: "(주)올리브영",
  category: "리테일",
  logo: null,
};

const STATS = [
  { label: "진행중 공고", value: "5", unit: "건", icon: Briefcase, color: "#5f0080" },
  { label: "총 지원자", value: "128", unit: "명", icon: Users, color: "#0ea5e9" },
  { label: "오늘 지원", value: "12", unit: "명", icon: TrendingUp, color: "#10b981" },
  { label: "스크랩한 인재", value: "24", unit: "명", icon: BookmarkCheck, color: "#f59e0b" },
];

const APPLY_DATA = [
  { day: "1/14", 지원수: 8 },
  { day: "1/15", 지원수: 15 },
  { day: "1/16", 지원수: 11 },
  { day: "1/17", 지원수: 19 },
  { day: "1/18", 지원수: 14 },
  { day: "1/19", 지원수: 9 },
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
  { id: 5, name: "정다은", job: "MD - 색조 카테고리", career: "경력 2년", date: "2025.01.18", viewed: false },
];

/* ============================================
   레이아웃
   ============================================ */
function CompanyLayout({ children, activePage }: { children: React.ReactNode; activePage: string }) {
  const router = useRouter();

  const NAV = [
    { id: "dashboard", label: "대시보드", icon: Briefcase, href: "/company/dashboard" },
    { id: "jobs", label: "채용공고 관리", icon: FileText, href: "/company/dashboard/jobs" },
    { id: "applicants", label: "지원자 관리", icon: Users, href: "/company/dashboard/applicants" },
    { id: "settings", label: "기업 정보", icon: Settings, href: "/company/dashboard/settings" },
  ];

  const PAGE_TITLES: Record<string, string> = {
    dashboard: "대시보드",
    jobs: "채용공고 관리",
    applicants: "지원자 관리",
    settings: "기업 정보",
  };

  return (
    <div className="company-layout">
      {/* 사이드바 */}
      <aside className="company-sidebar">
        <div className="company-sidebar-logo">
          <Link href="/company/dashboard" className="company-logo-link">
            <div className="company-logo-avatar">
              {COMPANY.name.slice(0, 1)}
            </div>
            <div className="company-logo-info">
              <span className="company-logo-name">{COMPANY.name}</span>
              <span className="company-logo-category">{COMPANY.category}</span>
            </div>
          </Link>
        </div>

        <nav className="company-nav">
          {NAV.map((item) => (
            <Link key={item.id} href={item.href}
              className={`company-nav-item ${activePage === item.id ? "active" : ""}`}>
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="company-sidebar-bottom">
          <button className="company-nav-item" onClick={() => router.push("/")}>
            <LogOut size={20} />
            <span>사이트로 이동</span>
          </button>
        </div>
      </aside>

      {/* 메인 */}
      <div className="company-main">
        <header className="company-header">
          <h1 className="company-page-title">{PAGE_TITLES[activePage] || "대시보드"}</h1>
          <div className="company-header-right">
            <button className="company-header-btn">
              <Bell size={18} />
              <span className="company-notif-dot" />
            </button>
            <div className="company-profile">
              <div className="company-avatar">{COMPANY.name.slice(0, 1)}</div>
              <span className="company-name">{COMPANY.name}</span>
            </div>
          </div>
        </header>
        <main className="company-content">{children}</main>
      </div>
    </div>
  );
}

/* ============================================
   대시보드 페이지
   ============================================ */
export default function CompanyDashboard() {
  return (
    <CompanyLayout activePage="dashboard">
      {/* 통계 카드 */}
      <div className="company-stat-grid">
        {STATS.map((stat) => (
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

      <div className="company-dashboard-grid">
        {/* 지원자 추이 */}
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

        {/* 최근 지원자 */}
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
                  <td>
                    {a.viewed
                      ? <span className="company-badge viewed">열람</span>
                      : <span className="company-badge new">미열람</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 내 채용공고 */}
      <div className="company-card">
        <div className="company-card-head">
          <h2 className="company-card-title">내 채용공고</h2>
          <Link href="/company/dashboard/jobs/new" className="company-primary-btn">
            <Plus size={15} /> 공고 등록
          </Link>
        </div>
        <table className="company-table">
          <thead>
            <tr><th>공고명</th><th>직군</th><th>마감일</th><th>지원자</th><th>조회수</th><th>상태</th><th>관리</th></tr>
          </thead>
          <tbody>
            {MY_JOBS.map((job) => (
              <tr key={job.id}>
                <td className="company-td-name">{job.title}</td>
                <td className="company-td-sub">{job.category}</td>
                <td className="company-td-sub">{job.deadline}</td>
                <td className="company-td-sub">{job.applicants}명</td>
                <td className="company-td-sub">{job.views.toLocaleString()}</td>
                <td>
                  <span className={`company-badge ${job.status === "진행중" ? "active" : "closed"}`}>
                    {job.status}
                  </span>
                </td>
                <td>
                  <div style={{display:"flex", gap:"6px"}}>
                    <Link href={`/company/dashboard/applicants`} className="company-action-btn">
                      <Users size={14} /> 지원자
                    </Link>
                    <button className="company-action-btn secondary">수정</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CompanyLayout>
  );
}
