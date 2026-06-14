"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard, Users, Briefcase, BookOpen, Megaphone, Mail,
  LogOut, Menu, X, ChevronDown, ChevronRight
} from "lucide-react";
const NAV_ITEMS = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard, href: "/admin" },
  {
    id: "jobs", label: "채용공고", icon: Briefcase, href: "/admin/jobs",
    children: [
      { id: "jobs", label: "채용공고 목록", href: "/admin/jobs" },
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
  { id: "newsletters", label: "뉴스레터", icon: Mail, href: "/admin/newsletters" },
  { id: "ads", label: "문의 관리", icon: Megaphone, href: "/admin/ads" },
];

const PAGE_TITLES: Record<string, string> = {
  "dashboard": "대시보드",
  "jobs": "채용공고",
  "jobs-scrapped": "스크랩 채용공고",
  "jobs-viewed": "열람한 채용공고",
  "members": "회원관리",
  "members-companies": "기업회원",
  "members-blocked": "열람제한기업",
  "members-favorites": "관심기업",
  "resumes": "인재정보",
  "resumes-scrapped": "스크랩 이력서",
  "resumes-viewed": "열람 이력서",
  "resumes-applications": "입사지원 관리",
  "stories": "현장이야기",
  "newsletters": "뉴스레터",
  "ads": "문의 관리",
};

export default function AdminLayout({ children, activeMenu }: { children: React.ReactNode; activeMenu: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openMenus, setOpenMenus] = useState<string[]>(["jobs", "members", "resumes"]);
  const [authChecked, setAuthChecked] = useState(false);
  const [newInquiries, setNewInquiries] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.replace("/admin/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  // 미처리(신규) 문의 개수 — 사이드바 "문의 관리" 배지용
  useEffect(() => {
    if (!authChecked) return;
    const fetchNewInquiries = () => {
      const token = localStorage.getItem("admin_token");
      fetch("/api/admin/ads/inquiries?status=new", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => setNewInquiries(d?.data?.items?.length || 0))
        .catch(() => {});
    };
    fetchNewInquiries();
    window.addEventListener("admin:inquiries-changed", fetchNewInquiries);
    return () => window.removeEventListener("admin:inquiries-changed", fetchNewInquiries);
  }, [authChecked, pathname]);

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
          {NAV_ITEMS.map((item) => {
            const badgeCount = item.id === "ads" ? newInquiries : 0;
            return (
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
                  className={`admin-nav-item ${activeMenu === item.id ? "active" : ""}`}
                  style={{ position: "relative" }}>
                  <item.icon size={20} />
                  {sidebarOpen && <span style={{ flex: 1 }}>{item.label}</span>}
                  {badgeCount > 0 && (
                    sidebarOpen ? (
                      <span style={{
                        marginLeft: "auto", minWidth: "18px", height: "18px", padding: "0 6px",
                        borderRadius: "999px", background: "#ef4444", color: "#fff",
                        fontSize: "11px", fontWeight: 700, lineHeight: "18px", textAlign: "center",
                      }}>
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    ) : (
                      <span style={{
                        position: "absolute", top: "8px", right: "10px",
                        width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444",
                      }} />
                    )
                  )}
                </Link>
              )}
            </div>
            );
          })}
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
              {PAGE_TITLES[activeMenu] || "관리자"}
            </h1>
          </div>
          <div className="admin-header-right">
            
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