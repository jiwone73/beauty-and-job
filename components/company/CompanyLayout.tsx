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
  const [companyInfo, setCompanyInfo] = useState({ name: "", category: "", logo: "", type: "", cover: "" });
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
            logo: res.data.logo_url || "",
            type: res.data.company_type || "",
            cover: (Array.isArray(res.data.cover_images) && res.data.cover_images[0]?.url) ? res.data.cover_images[0].url : "",
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
  const deleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch(`/api/company/notifications/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    loadNotifs();
  };
  const deleteAllNotif = async () => {
    if (!confirm("모든 알림을 삭제할까요?")) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch("/api/company/notifications", {
      method: "DELETE",
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
    { id: "talent",    label: "인재 검색",     icon: Search,       href: `${base}/talent` },
    { id: "scrapped",  label: "스크랩 인재",   icon: BookmarkCheck,href: `${base}/talent/scrapped` },
    { id: "applicants",label: "지원자 관리",   icon: Users,        href: `${base}/applicants` },
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
    const logoImg = companyInfo.logo || (companyInfo.type === "STORE" ? companyInfo.cover : "");
    const MTABS = [
      { id: "dashboard", label: "대시보드", icon: Briefcase, href: base },
      { id: "jobs", label: "공고", icon: FileText, href: `${base}/jobs` },
      { id: "applicants", label: "지원자", icon: Users, href: `${base}/applicants` },
      { id: "talent", label: "인재검색", icon: Search, href: `${base}/talent` },
      { id: "settings", label: "기업정보", icon: Settings, href: `${base}/settings` },
    ];
    return (
      <div className="co-m">
        <style>{`
          .co-m { min-height: 100vh; background: #f6f5f8; padding-bottom: 68px; }
          .co-m-header { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 11px 14px; background: #fff; border-bottom: 1px solid #eee; }
          .co-m-brand { display: flex; align-items: center; gap: 8px; text-decoration: none; color: #1a1a1a; min-width: 0; }
          .co-m-logo { width: 32px; height: 32px; border-radius: 8px; background: #f2f2f2; overflow: hidden; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #5f0080; flex-shrink: 0; }
          .co-m-logo img { width: 100%; height: 100%; object-fit: cover; }
          .co-m-name { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .co-m-actions { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
          .co-m-ibtn { position: relative; background: none; border: none; padding: 8px; color: #555; cursor: pointer; }
          .co-m-badge { position: absolute; top: 2px; right: 2px; background: #e74c3c; color: #fff; font-size: 9px; line-height: 1.4; border-radius: 8px; padding: 0 4px; }
          .co-m-title { padding: 14px 16px 4px; font-size: 18px; font-weight: 400; color: #1a1a1a; }
          .co-m-content { padding: 6px 14px 20px; }
          .co-m-content .company-content { padding: 0 !important; }
          .co-m-tabs { position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; display: flex; background: #fff; border-top: 1px solid #eee; padding-bottom: env(safe-area-inset-bottom); }
          .co-m-tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 9px 2px; text-decoration: none; color: #9a9a9a; font-size: 11px; }
          .co-m-tab.on { color: #5f0080; }
          .co-m-notif { position: fixed; left: 0; right: 0; top: 55px; z-index: 61; background: #fff; border-bottom: 1px solid #eee; max-height: 62vh; overflow-y: auto; box-shadow: 0 10px 24px rgba(0,0,0,0.1); }
          .co-m-notif-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f2f2f2; font-size: 14px; font-weight: 600; }
          .co-m-notif-item { display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left; padding: 12px 16px; border: none; border-bottom: 1px solid #f5f5f5; background: none; cursor: pointer; }
          .co-m-notif-item.unread { background: #faf5fc; }
          .co-m-notif-empty { padding: 28px; text-align: center; color: #aaa; font-size: 13px; }
        `}</style>

        <header className="co-m-header">
          <Link href={base} className="co-m-brand">
            <div className="co-m-logo">
              {logoImg ? <img src={logoImg} alt={companyInfo.name} /> : <span>{companyInfo.name?.[0] || "·"}</span>}
            </div>
            <span className="co-m-name">{companyInfo.name || "기업"}</span>
          </Link>
          <div className="co-m-actions">
            <button className="co-m-ibtn" onClick={() => setNotifOpen((v) => !v)} aria-label="알림">
              <Bell size={20} />
              {unread > 0 && <span className="co-m-badge">{unread > 9 ? "9+" : unread}</span>}
            </button>
            <button className="co-m-ibtn" onClick={() => { localStorage.removeItem("access_token"); useAuthStore.getState().logout(); router.push("/company/login"); }} aria-label="로그아웃">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {notifOpen && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 60 }} onClick={() => setNotifOpen(false)} />
            <div className="co-m-notif">
              <div className="co-m-notif-head">
                <span>알림</span>
                {unread > 0 && <button onClick={markAllRead} style={{ background: "none", border: "none", color: "#5f0080", fontSize: 13, cursor: "pointer" }}>모두 읽음</button>}
              </div>
              {notifs.length === 0 ? (
                <p className="co-m-notif-empty">새 알림이 없어요</p>
              ) : (
                notifs.map((n) => (
                  <button key={n.id} className={`co-m-notif-item ${n.is_read ? "" : "unread"}`} onClick={() => handleNotifClick(n)}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1a1a1a" }}>{n.title}</span>
                    <span style={{ fontSize: 12.5, color: "#777" }}>{n.message}</span>
                    <span style={{ fontSize: 11, color: "#aaa" }}>{new Date(n.created_at).toLocaleDateString("ko-KR")}</span>
                  </button>
                ))
              )}
            </div>
          </>
        )}

        <div className="co-m-title">{PAGE_TITLES[activePage] || "대시보드"}</div>
        <div className="co-m-content">{children}</div>

        <nav className="co-m-tabs">
          {MTABS.map((t) => (
            <Link key={t.id} href={t.href} className={`co-m-tab ${activePage === t.id ? "on" : ""}`}>
              <t.icon size={21} strokeWidth={activePage === t.id ? 2.4 : 1.8} />
              <span>{t.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="company-layout">
      <aside className={`company-sidebar ${sidebarOpen ? "" : "company-sidebar-closed"}`}>
        <div className="company-sidebar-logo">
          <Link href={base} className="company-logo-link">
            <div className="company-logo-mark">
              {(() => {
                const img = companyInfo.logo || (companyInfo.type === "STORE" ? companyInfo.cover : "");
                return img ? (
                  <img src={img} alt={`${companyInfo.name}`} />
                ) : (
                  <span>{companyInfo.name?.[0] || "·"}</span>
                );
              })()}
            </div>
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
