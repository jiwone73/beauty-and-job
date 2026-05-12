"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Briefcase, BookOpen, Building2,
  BarChart2, LogOut, Bell, ChevronRight, TrendingUp,
  TrendingDown, CheckCircle, Clock, XCircle, Plus,
  Search, Filter, Eye, Edit, Trash2, Menu, X
} from "lucide-react";

/* ============================================
   사이드바 메뉴 구조
   ============================================ */
const NAV_ITEMS = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard, href: "/admin" },
  { id: "jobs", label: "채용공고", icon: Briefcase, href: "/admin/jobs" },
  { id: "members", label: "회원관리", icon: Users, href: "/admin/members" },
  { id: "insights", label: "인사이트", icon: BookOpen, href: "/admin/insights" },
  { id: "brands", label: "브랜드", icon: Building2, href: "/admin/brands" },
  { id: "stats", label: "통계", icon: BarChart2, href: "/admin/stats" },
];

/* ============================================
   레이아웃 컴포넌트
   ============================================ */
export function AdminLayout({ children, activeMenu }: { children: React.ReactNode; activeMenu: string }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="admin-layout">
      {/* 사이드바 */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="admin-sidebar-logo">
          <Link href="/admin" className="admin-logo-link">
            <span className="admin-logo-icon">B</span>
            {sidebarOpen && <span className="admin-logo-text">뷰티앤잡 Admin</span>}
          </Link>
          <button className="admin-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`admin-nav-item ${activeMenu === item.id ? "active" : ""}`}
            >
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <button className="admin-nav-item" onClick={() => router.push("/")}>
            <LogOut size={20} />
            {sidebarOpen && <span>사이트로 이동</span>}
          </button>
        </div>
      </aside>

      {/* 메인 영역 */}
      <div className="admin-main">
        {/* 상단 헤더 */}
        <header className="admin-header">
          <div className="admin-header-left">
            <h1 className="admin-page-title">
              {NAV_ITEMS.find(n => n.id === activeMenu)?.label || "관리자"}
            </h1>
          </div>
          <div className="admin-header-right">
            <button className="admin-header-btn">
              <Bell size={18} />
              <span className="admin-notif-dot" />
            </button>
            <div className="admin-profile">
              <div className="admin-avatar">A</div>
              <span className="admin-name">관리자</span>
            </div>
          </div>
        </header>

        {/* 콘텐츠 */}
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ============================================
   대시보드 페이지
   ============================================ */
const STATS = [
  { label: "오늘 신규 가입", value: "24", unit: "명", trend: 12, icon: Users, color: "#5f0080" },
  { label: "진행중 채용공고", value: "142", unit: "건", trend: 5, icon: Briefcase, color: "#0ea5e9" },
  { label: "오늘 지원수", value: "87", unit: "건", trend: -3, icon: CheckCircle, color: "#10b981" },
  { label: "승인 대기 공고", value: "8", unit: "건", trend: 0, icon: Clock, color: "#f59e0b" },
];

const RECENT_JOBS = [
  { id: 1, company: "올리브영", title: "디지털 마케팅 매니저", date: "2025.01.20", status: "승인대기" },
  { id: 2, company: "아모레퍼시픽", title: "글로벌 브랜드 마케터", date: "2025.01.20", status: "승인완료" },
  { id: 3, company: "LG생활건강", title: "e커머스 MD", date: "2025.01.19", status: "승인완료" },
  { id: 4, company: "코스맥스", title: "화장품 연구원", date: "2025.01.19", status: "반려" },
  { id: 5, company: "에이피알", title: "퍼포먼스 마케터", date: "2025.01.18", status: "승인대기" },
];

const RECENT_MEMBERS = [
  { id: 1, name: "김지수", type: "개인", email: "jisoo@email.com", date: "2025.01.20" },
  { id: 2, name: "(주)올리브영", type: "기업", email: "hr@oliveyoung.com", date: "2025.01.20" },
  { id: 3, name: "박민준", type: "개인", email: "minjun@email.com", date: "2025.01.19" },
  { id: 4, name: "이수진", type: "개인", email: "sujin@email.com", date: "2025.01.19" },
];

export default function AdminDashboard() {
  return (
    <AdminLayout activeMenu="dashboard">
      {/* 통계 카드 */}
      <div className="admin-stat-grid">
        {STATS.map((stat) => (
          <div key={stat.label} className="admin-stat-card">
            <div className="admin-stat-top">
              <div className="admin-stat-icon" style={{ background: stat.color + "18", color: stat.color }}>
                <stat.icon size={22} />
              </div>
              <div className={`admin-stat-trend ${stat.trend > 0 ? "up" : stat.trend < 0 ? "down" : "neutral"}`}>
                {stat.trend > 0 ? <TrendingUp size={14} /> : stat.trend < 0 ? <TrendingDown size={14} /> : null}
                {stat.trend !== 0 && `${Math.abs(stat.trend)}%`}
              </div>
            </div>
            <div className="admin-stat-value">
              {stat.value}<span className="admin-stat-unit">{stat.unit}</span>
            </div>
            <div className="admin-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="admin-dashboard-grid">
        {/* 최근 채용공고 */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">최근 채용공고</h2>
            <Link href="/admin/jobs" className="admin-card-more">전체보기 →</Link>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>기업</th>
                <th>공고명</th>
                <th>등록일</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_JOBS.map((job) => (
                <tr key={job.id}>
                  <td className="admin-td-brand">{job.company}</td>
                  <td className="admin-td-title">{job.title}</td>
                  <td className="admin-td-date">{job.date}</td>
                  <td>
                    <span className={`admin-badge admin-badge-${
                      job.status === "승인완료" ? "success" :
                      job.status === "승인대기" ? "warning" : "danger"
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      {job.status === "승인대기" && (
                        <button className="admin-action-btn approve">승인</button>
                      )}
                      <button className="admin-action-icon"><Eye size={15} /></button>
                      <button className="admin-action-icon danger"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 최근 가입 회원 */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">최근 가입 회원</h2>
            <Link href="/admin/members" className="admin-card-more">전체보기 →</Link>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>이름</th>
                <th>유형</th>
                <th>이메일</th>
                <th>가입일</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_MEMBERS.map((m) => (
                <tr key={m.id}>
                  <td className="admin-td-brand">{m.name}</td>
                  <td>
                    <span className={`admin-badge ${m.type === "기업" ? "admin-badge-info" : "admin-badge-neutral"}`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="admin-td-date">{m.email}</td>
                  <td className="admin-td-date">{m.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
