"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Briefcase, Users, FileText, Settings,
  Bell, LogOut, Search, BookmarkCheck, Menu, X
} from "lucide-react";

const COMPANY_INFO = { name: "(주)올리브영", category: "리테일" };

const PAGE_TITLES: Record<string, string> = {
  dashboard: "대시보드",
  jobs: "채용공고 관리",
  applicants: "지원자 관리",
  talent: "인재 검색",
  scrapped: "스크랩 인재",
  settings: "기업 정보",
};

export default function CompanyLayout({ children, activePage }: {
  children: React.ReactNode;
  activePage: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // /company/dashboard/* 이면 기존 base, 아니면 /{companyId} base
  const segments = pathname.split("/").filter(Boolean);
  const isLegacy = segments[0] === "company";
  const base = isLegacy ? "/company/dashboard" : `/${segments[0]}`;

  const NAV_ITEMS = [
    { id: "dashboard", label: "대시보드",      icon: Briefcase,    href: base },
    { id: "jobs",      label: "채용공고 관리", icon: FileText,     href: `${base}/jobs` },
    { id: "applicants",label: "지원자 관리",   icon: Users,        href: `${base}/applicants` },
    { id: "talent",    label: "인재 검색",     icon: Search,       href: `${base}/talent` },
    { id: "scrapped",  label: "스크랩 인재",   icon: BookmarkCheck,href: `${base}/talent/scrapped` },
    { id: "settings",  label: "기업 정보",     icon: Settings,     href: `${base}/settings` },
  ];

  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="company-layout">
      <aside className={`company-sidebar ${sidebarOpen ? "" : "company-sidebar-closed"}`}>
        <div className="company-sidebar-logo">
          <Link href={base} className="company-logo-link">
            <div className="company-logo-avatar">{COMPANY_INFO.name.slice(0, 1)}</div>
            {sidebarOpen && (
              <div className="company-logo-info">
                <span className="company-logo-name">{COMPANY_INFO.name}</span>
                <span className="company-logo-category">{COMPANY_INFO.category}</span>
              </div>
            )}
          </Link>
          <button className="company-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        <nav className="company-nav">
          {NAV_ITEMS.map((item) => (
            <Link key={item.id} href={item.href}
              className={`company-nav-item ${activePage === item.id ? "active" : ""}`}>
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="company-sidebar-bottom">
          <button className="company-nav-item" onClick={() => router.push("/")}>
            <LogOut size={20} />
            {sidebarOpen && <span>사이트로 이동</span>}
          </button>
        </div>
      </aside>

      <div className="company-main">
        <header className="company-header">
          <h1 className="company-page-title">{PAGE_TITLES[activePage] || "대시보드"}</h1>
          <div className="company-header-right">
            <button className="company-header-btn">
              <Bell size={18} />
              <span className="company-notif-dot" />
            </button>
            <div className="company-profile">
              <div className="company-avatar">{COMPANY_INFO.name.slice(0, 1)}</div>
              <span className="company-name">{COMPANY_INFO.name}</span>
            </div>
          </div>
        </header>
        <main className="company-content">{children}</main>
      </div>
    </div>
  );
}
