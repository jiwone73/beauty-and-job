"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard, Users, Briefcase, BookOpen,
  Building2, BarChart2, LogOut, Bell, Menu, X
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard, href: "/admin" },
  { id: "jobs", label: "채용공고", icon: Briefcase, href: "/admin/jobs" },
  { id: "members", label: "회원관리", icon: Users, href: "/admin/members" },
  { id: "insights", label: "인사이트", icon: BookOpen, href: "/admin/insights" },
  { id: "brands", label: "브랜드", icon: Building2, href: "/admin/brands" },
  { id: "stats", label: "통계", icon: BarChart2, href: "/admin/stats" },
];

export default function AdminLayout({ children, activeMenu }: { children: React.ReactNode; activeMenu: string }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="admin-sidebar-logo">
          <Link href="/admin" className="admin-logo-link">
            <span className="admin-logo-icon">B</span>
            {sidebarOpen && <span className="admin-logo-text">뷰티앤잡</span>}
          </Link>
          <button className="admin-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <Link key={item.id} href={item.href}
              className={`admin-nav-item ${activeMenu === item.id ? "active" : ""}`}>
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

      <div className="admin-main">
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
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
