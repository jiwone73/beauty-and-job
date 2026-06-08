"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import {
  Briefcase, Users, FileText, Settings,
  Bell, LogOut, Search, BookmarkCheck, Menu, X, ChevronDown
} from "lucide-react";



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
  const [companyInfo, setCompanyInfo] = useState({ name: "", category: "" });
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/company/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setCompanyInfo({
            name: res.data.company_name || "",
            category: res.data.company_type === "OFFICE" ? "기업·브랜드" : res.data.company_type === "STORE" ? "매장·살롱" : "기업+매장",
          });
        }
      })
      .catch((e) => console.error("[company info]", e));
  }, []);

  const loadNotifs = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/company/notifications", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setNotifs(res.data.notifications || []);
          setUnread(res.data.unread || 0);
        }
      })
      .catch((e) => console.error("[notifs]", e));
  };
  useEffect(() => { loadNotifs(); }, []);

  const handleNotifClick = async (n: any) => {
    const token = localStorage.getItem("access_token");
    if (!n.is_read && token) {
      await fetch(`/api/company/notifications/${n.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setNotifOpen(false);
    loadNotifs();
    if (n.related_type === "application") router.push(`${base}/applicants`);
  };

  const markAllRead = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch("/api/company/notifications", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    loadNotifs();
  };

  // /company/dashboard/* 이면 기존 base, 아니면 /{companyId} base

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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile) {
    return <PCOnlyNotice />;
  }

  return (
    <div className="company-layout">
      <aside className={`company-sidebar ${sidebarOpen ? "" : "company-sidebar-closed"}`}>
        <div className="company-sidebar-logo">
          <Link href={base} className="company-logo-link">
            <div className="company-logo-info">
              <span className="company-logo-name">{companyInfo.name}</span>
              <span className="company-logo-category">{companyInfo.category}</span>
            </div>
          </Link>
          <div style={{ marginLeft: "auto", position: "relative" }}>
            <button className="company-header-btn" onClick={() => setNotifOpen((v) => !v)} aria-label="알림">
              <Bell size={18} />
              {unread > 0 && <span className="company-notif-badge">{unread > 9 ? "9+" : unread}</span>}
            </button>
            {notifOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setNotifOpen(false)} />
                <div className="company-notif-dropdown">
                  <div className="company-notif-head">
                    <span>알림</span>
                    {unread > 0 && <button onClick={markAllRead} className="company-notif-readall">모두 읽음</button>}
                  </div>
                  <div className="company-notif-list">
                    {notifs.length === 0 ? (
                      <p className="company-notif-empty">새 알림이 없어요</p>
                    ) : (
                      notifs.map((n) => (
                        <button key={n.id} className={`company-notif-item ${n.is_read ? "" : "unread"}`}
                          onClick={() => handleNotifClick(n)}>
                          <span className="company-notif-title">{n.title}</span>
                          <span className="company-notif-msg">{n.message}</span>
                          <span className="company-notif-time">{new Date(n.created_at).toLocaleDateString("ko-KR")}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <nav className="company-nav">
          {NAV_ITEMS.map((item) => (
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
          <button className="company-nav-item" onClick={() => {
            localStorage.removeItem("access_token");
            useAuthStore.getState().logout();
            router.push("/company/login");
          }}>
            <LogOut size={20} />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      <div className="company-main">
        <header className="company-header">
          <h1 className="company-page-title">{PAGE_TITLES[activePage] || "대시보드"}</h1>
        </header>
        <main className="company-content">{children}</main>
      </div>
    </div>
  );
}
function PCOnlyNotice() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 24px",
      background: "linear-gradient(135deg, #f3e5f5 0%, #fff 100%)",
    }}>
      <div style={{ fontSize: "64px", marginBottom: "16px" }}>💻</div>
      <h1 style={{
        fontSize: "22px",
        fontWeight: 700,
        color: "#1a1a1a",
        marginBottom: "12px",
        textAlign: "center",
      }}>
        PC에서 이용해주세요
      </h1>
      <p style={{
        fontSize: "14px",
        color: "#666",
        textAlign: "center",
        marginBottom: "32px",
        lineHeight: 1.7,
        maxWidth: "320px",
      }}>
        기업 대시보드는 더 편한 사용 경험을 위해<br />
        <strong style={{ color: "#5f0080" }}>PC 환경에 최적화</strong>되어 있어요.<br /><br />
        PC에서 접속하시면 모든 기능을<br />
        편리하게 사용하실 수 있습니다.
      </p>
      <div style={{
        padding: "14px 20px",
        background: "#fff",
        border: "1px solid #ede0f8",
        borderRadius: "12px",
        marginBottom: "24px",
        maxWidth: "320px",
        width: "100%",
      }}>
        <p style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>
          접속 주소
        </p>
        <p style={{
          fontSize: "13px",
          color: "#5f0080",
          fontWeight: 600,
          wordBreak: "break-all",
        }}>
          beauty-and-job.vercel.app
        </p>
      </div>
      <Link href="/" style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "12px 24px",
        background: "#5f0080",
        color: "#fff",
        borderRadius: "10px",
        fontSize: "14px",
        fontWeight: 600,
        textDecoration: "none",
      }}>
        메인으로 가기
      </Link>
    </div>
  );
}