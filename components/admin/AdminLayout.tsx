"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard, Users, Briefcase, BookOpen, Megaphone,
  LogOut, Bell, Menu, X, ChevronDown, ChevronRight
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard, href: "/admin" },
  {
    id: "jobs", label: "채용공고", icon: Briefcase, href: "/admin/jobs",
    children: [
      { id: "jobs", label: "채용공고 목록", href: "/admin/jobs" },
      { id: "jobs-upload", label: "채용공고 업로드", href: "/admin/jobs/upload" },
    ]
  },
  {
    id: "members", label: "회원관리", icon: Users, href: "/admin/members",
    children: [
      { id: "members", label: "개인회원", href: "/admin/members" },
      { id: "members-companies", label: "기업회원", href: "/admin/members/companies" },
    ]
  },
  {
    id: "resumes", label: "인재정보", icon: Users, href: "/admin/resumes",
    children: [
      { id: "resumes", label: "이력서 관리", href: "/admin/resumes" },
      { id: "resumes-applications", label: "입사지원 관리", href: "/admin/resumes/applications" },
    ]
  },
  { id: "stories", label: "현장이야기", icon: BookOpen, href: "/admin/stories" },
  { id: "ads", label: "문의 관리", icon: Megaphone, href: "/admin/ads" },
];

const PAGE_TITLES: Record<string, string> = {
  "dashboard": "대시보드",
  "jobs": "채용공고",
  "jobs-scrapped": "스크랩 채용공고",
  "jobs-viewed": "열람한 채용공고",
  "jobs-upload": "채용공고 업로드",
  "members": "회원관리",
  "members-companies": "기업회원",
  "members-blocked": "열람제한기업",
  "members-favorites": "관심기업",
  "resumes": "인재정보",
  "resumes-scrapped": "스크랩 이력서",
  "resumes-viewed": "열람 이력서",
  "resumes-applications": "입사지원 관리",
  "stories": "현장이야기",
  "ads": "문의 관리",
};

export default function AdminLayout({ children, activeMenu }: { children: React.ReactNode; activeMenu: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openMenus, setOpenMenus] = useState<string[]>(["jobs", "members", "resumes"]);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.replace("/admin/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  if (!authChecked) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: "#faf8fc",
        fontSize: "14px", color: "#5f0080", fontWeight: 600,
      }}>
        로딩 중...
      </div>
    );
  }

  const toggleMenu = (id: string) => {
    setOpenMenus(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const isMenuOpen = (id: string) => openMenus.includes(id);

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="admin-sidebar-logo">
          <Link href="/admin" className="admin-logo-link">
            {sidebarOpen ? (
              <Image src="/images/logo.png" alt="뷰티앤잡" width={110} height={28} priority />
            ) : (
              <span className="admin-logo-icon">B</span>
            )}
          </Link>
          <button className="admin-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <div key={item.id}>
              {item.children ? (
                <>
                  {/* 부모 메뉴 */}
                  <button
                    className={`admin-nav-item ${activeMenu.startsWith(item.id) ? "active" : ""}`}
                    onClick={() => {
                      if (sidebarOpen) toggleMenu(item.id);
                      else router.push(item.href);
                    }}
                    style={{width:"100%"}}
                  >
                    <item.icon size={20} />
                    {sidebarOpen && (
                      <>
                        <span style={{flex:1, textAlign:"left"}}>{item.label}</span>
                        {isMenuOpen(item.id)
                          ? <ChevronDown size={14} />
                          : <ChevronRight size={14} />
                        }
                      </>
                    )}
                  </button>
                  {/* 서브메뉴 */}
                  {sidebarOpen && isMenuOpen(item.id) && (
                    <div className="admin-sub-nav">
                      {item.children.map((child) => (
                        <Link key={child.id} href={child.href}
                          className={`admin-sub-nav-item ${activeMenu === child.id ? "active" : ""}`}>
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link href={item.href}
                  className={`admin-nav-item ${activeMenu === item.id ? "active" : ""}`}>
                  <item.icon size={20} />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              )}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <button className="admin-nav-item" onClick={() => router.push("/admin/login")}>
            <LogOut size={20} />
            {sidebarOpen && <span>로그아웃</span>}
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header-left">
            <h1 className="admin-page-title">
              {PAGE_TITLES[activeMenu] || "관리자"}
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