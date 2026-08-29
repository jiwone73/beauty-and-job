"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import {
  Briefcase, Users, FileText, Settings, UserCog,
  Bell, LogOut, Search, BookmarkCheck, Menu, X, ChevronDown, ExternalLink, Plus
} from "lucide-react";



const PAGE_TITLES: Record<string, string> = {
  dashboard: "대시보드",
  jobs: "채용공고",
  "jobs-new": "채용공고 등록",
  applicants: "지원자 관리",
  talent: "인재 검색",
  scrapped: "스크랩 인재",
  settings: "기업 정보",
  account: "계정 설정",
  password: "비밀번호 변경",
  notifications: "알림 설정",
};

export default function CompanyLayout({ children, activePage }: {
  children: React.ReactNode;
  activePage: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // 매장 회원이면 '매장정보', 본사(기업) 회원이면 '기업정보'로 부른다.
  const infoLabel = (t: string) => (t === "OFFICE" ? "기업정보" : "매장정보"); // 매장·매장+본사는 매장으로 분류
  const [companyInfo, setCompanyInfo] = useState({ name: "", category: "", logo: "", type: "", cover: "", thumb: "", manager: "" });
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [logoMenuOpen, setLogoMenuOpen] = useState(false);
  const [meMenuOpen, setMeMenuOpen] = useState(false);
  const 나가기 = () => {
    setMeMenuOpen(false);
    localStorage.removeItem("access_token");
    useAuthStore.getState().logout();
    router.push("/company/login");
  };
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
            category: res.data.company_type === "OFFICE" ? "본사" : res.data.company_type === "STORE" ? "매장" : "매장·본사",
            logo: res.data.logo_url || "",
            type: res.data.company_type || "",
            cover: (Array.isArray(res.data.cover_images) && res.data.cover_images[0]?.url) ? res.data.cover_images[0].url : "",
            thumb: res.data.thumb_url || "",
            manager: res.data.manager_name || "",
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

  // 채용공고 등록을 독립 메뉴로 뺐었는데, 목록 페이지(신규 공고·복사 등록 버튼)에서
  // 이미 두 가지 방법으로 다 새 공고를 시작할 수 있게 되면서 같은 곳으로 가는 문이
  // 하나 더 있는 셈이 됐다("사이드 메뉴로 별도로 빼는게 의미가 없어보이는데") — 다시
  // 목록 메뉴 하나로 합치고, '관리'만으로는 등록도 여기서 된다는 게 안 드러나
  // "채용공고"로 이름을 줄였다("이름을 좀더 직관적인 이름으로 바꾸는건 어때").
  // group이 앞 항목과 달라지는 자리에 글씨 없이 구분선만 넣는다
  // ("글씨 빼는대신에 구분선 넣어서 구분만 해줘").
  const NAV_ITEMS = [
    { id: "dashboard", label: "대시보드",      icon: Briefcase,    href: base, group: "home" },
    { id: "jobs",      label: "채용공고",       icon: FileText,     href: `${base}/jobs`, group: "jobs" },
    { id: "talent",    label: "인재 검색",     icon: Search,       href: `${base}/talent`, group: "talent" },
    { id: "scrapped",  label: "스크랩 인재",   icon: BookmarkCheck,href: `${base}/talent/scrapped`, group: "talent" },
    { id: "applicants",label: "지원자 관리",   icon: Users,        href: `${base}/applicants`, group: "talent" },
    { id: "settings",  label: infoLabel(companyInfo.type), icon: Settings,     href: `${base}/settings`, group: "settings" },
    // 계정의 책임자는 담당자다 — 담당자 정보를 매장정보(프로필)에서 계정 설정으로 옮긴다
    // ("이 계정의 책임자는 담당자이지. 담당자 정보를 계정 설정으로 옮기자는거야?").
    { id: "account",   label: "계정 설정",                 icon: UserCog,      href: `${base}/account`, group: "settings" },
  ];

  // PC 는 왼쪽 사이드 대신 머리줄 하나로 간다 — 메인 사이트와 같은 판(.header,
  // .header-inner, .gnb)을 그대로 써서 두 화면이 한 서비스로 읽히게 한다.
  // 사이드에 흩어져 있던 것을 한 줄에 세우느라 항목 이름도 짧게 줄였다.
  const TOP_NAV = [
    { id: "dashboard",  label: "홈",          href: base },
    // 이 갈래에 든 넷 중 프로필은 매장정보 하나뿐이고 나머지는 계정·보안·알림이다.
    // 넷을 다 덮는 말은 '설정'이라 그렇게 부른다.
    { id: "settings",   label: "설정",         href: `${base}/settings` },
    { id: "jobs",       label: "채용공고",     href: `${base}/jobs` },
    { id: "talent",     label: "인재풀",       href: `${base}/talent` },
    { id: "applicants", label: "지원자",       href: `${base}/applicants` },
    { id: "ads",        label: "채용상품",     href: "/company/ads" },
  ];
  // 사이드 메뉴. 머리줄에서 한 갈래로 들어오면 그 안에서 다시 나뉜다.
  //   사이드는 짧게 훑는 자리라 이름만 적고, 무엇을 하는 곳인지는 오른쪽 제목이
  //   말한다(title). 라벨이 함수인 것은 매장/본사에 따라 이름이 갈리는 칸이 있어서다.
  //   묶음이 늘면 여기에 한 줄 더 넣으면 된다 — 껍데기는 손댈 것이 없다.
  const SIDE_NAV: Record<string, { id: string; label: (i: string) => string;
    title: (i: string) => string; href: string }[]> = {
    // 채용공고 — 셀렉미가 '채용 정보 등록 / 관리·수정'을 나눠 둔 것과 같은 짜임.
    //   목록이 들어오는 문이라 위에 두고, 등록을 아래에 둔다.
    jobs: [
      { id: "jobs",     label: () => "공고 관리", title: () => "채용공고 관리", href: `${base}/jobs` },
      { id: "jobs-new", label: () => "공고 등록", title: () => "채용공고 등록", href: `${base}/jobs/new` },
    ],
    // 설정 — 비밀번호만 이름과 제목이 같다. 여기서 하는 일이 설정이 아니라 변경
    //   하나뿐이라 "변경설정"처럼 겹쳐 쓸 말이 없다.
    settings: [
      { id: "settings",      label: (i: string) => i,      title: (i: string) => `${i} 설정`, href: `${base}/settings` },
      { id: "account",       label: () => "계정정보",       title: () => "계정정보 설정",      href: `${base}/account` },
      { id: "password",      label: () => "비밀번호 변경",   title: () => "비밀번호 변경",      href: `${base}/account/password` },
      { id: "notifications", label: () => "알림",           title: () => "알림 설정",          href: `${base}/notifications` },
    ],
  };
  /** 지금 화면이 어느 묶음에 드는지 — 사이드를 보일지, 머리줄 어느 메뉴를 켤지가 이걸로 정해진다. */
  const 묶음 = Object.keys(SIDE_NAV).find((k) => SIDE_NAV[k].some((m) => m.id === activePage));
  const 사이드 = 묶음 ? SIDE_NAV[묶음] : null;
  // 스크랩 인재는 인재풀의 갈래라 '인재풀'이 켜져 있어야 한다.
  // 계정정보·비밀번호·알림설정은 '설정'의 갈래라(옆 사이드로 들어간다) '설정'이 켜져 있어야 한다.
  const topActive = (id: string) =>
    id === "jobs" ? (activePage === "jobs" || activePage === "jobs-new")
    : id === "talent" ? (activePage === "talent" || activePage === "scrapped")
    : id === "settings" ? 묶음 === "settings"
    : activePage === id;
  // 공고 작성 화면(jobs-new)은 이제 독립 메뉴가 없다 — 목록 메뉴 "채용공고"의
  // 연장이니 그 메뉴가 계속 켜져 있어야 한다.
  const navActive = (id: string) => activePage === id || (id === "jobs" && activePage === "jobs-new");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile) {
    const logoImg = companyInfo.thumb || companyInfo.logo || (companyInfo.type === "STORE" ? companyInfo.cover : "");
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
          .co-m { min-height: 100vh; background: #fff; padding-bottom: 68px; }
          .co-m-header { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 11px 14px; background: #fff; border-bottom: 1px solid #eee; }
          .co-m-brand { display: flex; align-items: center; gap: 8px; text-decoration: none; color: #1a1a1a; min-width: 0; }
          .co-m-logo { width: 32px; height: 32px; border-radius: 8px; background: #f2f2f2; overflow: hidden; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #582681; flex-shrink: 0; }
          .co-m-logo img { width: 100%; height: 100%; object-fit: cover; }
          .co-m-nametype { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
          .co-m-name { font-size: 15px; font-weight: 400; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .co-m-type { font-size: 11px; color: #999; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .co-m-logobtn { background: none; border: none; padding: 0; cursor: pointer; flex-shrink: 0; }
          .co-m-logomenu { position: absolute; top: 54px; left: 14px; z-index: 61; background: #fff; border: 1px solid #eee; border-radius: 10px; box-shadow: 0 8px 22px rgba(0,0,0,0.14); overflow: hidden; min-width: 132px; }
          .co-m-logomenu button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 12px 14px; background: none; border: none; font-size: 14px; color: #333; cursor: pointer; }
          .co-m-logomenu button:active { background: #f7f7f8; }
          .co-m-actions { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
          .co-m-ibtn { position: relative; background: none; border: none; padding: 8px; color: #555; cursor: pointer; }
          .co-m-badge { position: absolute; top: 2px; right: 2px; background: #e74c3c; color: #fff; font-size: 9px; line-height: 1.4; border-radius: 8px; padding: 0 4px; }
          .co-m-title { padding: 14px 16px 4px; font-size: 18px; font-weight: 400; color: #1a1a1a; }
          .co-m-content { padding: 6px 14px 20px; }
          .co-m-content .company-content { padding: 0 !important; }
          .co-m-tabs { position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; display: flex; background: #fff; border-top: 1px solid #eee; padding-bottom: env(safe-area-inset-bottom); }
          .co-m-tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 9px 2px; text-decoration: none; color: #9a9a9a; font-size: 11px; }
          .co-m-tab.on { color: #582681; }
          .co-m-notif { position: fixed; left: 0; right: 0; top: 55px; z-index: 61; background: #fff; border-bottom: 1px solid #eee; max-height: 62vh; overflow-y: auto; box-shadow: 0 10px 24px rgba(0,0,0,0.1); }
          .co-m-notif-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f2f2f2; font-size: 14px; font-weight: 400; }
          .co-m-notif-item { display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left; padding: 12px 16px; border: none; border-bottom: 1px solid #f5f5f5; background: none; cursor: pointer; }
          .co-m-notif-item.unread { background: #f7f7f8; }
          .co-m-notif-empty { padding: 28px; text-align: center; color: #aaa; font-size: 13px; }
        `}</style>

        <header className="co-m-header">
          <div className="co-m-brand">
            <button className="co-m-logobtn" onClick={() => setLogoMenuOpen((v) => !v)} aria-label="메뉴">
              <div className="co-m-logo">
                {logoImg ? <img src={logoImg} alt={companyInfo.name} /> : <span>{companyInfo.name?.[0] || "·"}</span>}
              </div>
            </button>
            <Link href={base} className="co-m-nametype" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="co-m-name">{companyInfo.name || "기업"}</span>
              {companyInfo.category && <span className="co-m-type">{companyInfo.category}</span>}
            </Link>
          </div>
          <div className="co-m-actions">
            <div id="co-m-header-slot" style={{ display: "flex", alignItems: "center" }} />
            <button className="co-m-ibtn" onClick={() => setNotifOpen((v) => !v)} aria-label="알림">
              <Bell size={20} />
              {unread > 0 && <span className="co-m-badge">{unread > 9 ? "9+" : unread}</span>}
            </button>
          </div>
          {logoMenuOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 60 }} onClick={() => setLogoMenuOpen(false)} />
              <div className="co-m-logomenu">
                <button onClick={() => { setLogoMenuOpen(false); localStorage.removeItem("access_token"); useAuthStore.getState().logout(); router.push("/company/login"); }}>
                  <LogOut size={16} /> 로그아웃
                </button>
              </div>
            </>
          )}
        </header>

        {notifOpen && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 60 }} onClick={() => setNotifOpen(false)} />
            <div className="co-m-notif">
              <div className="co-m-notif-head">
                <span>알림</span>
                {unread > 0 && <button onClick={markAllRead} style={{ background: "none", border: "none", color: "#582681", fontSize: 13, cursor: "pointer" }}>모두 읽음</button>}
              </div>
              {notifs.length === 0 ? (
                <p className="co-m-notif-empty">새 알림이 없어요</p>
              ) : (
                notifs.map((n) => (
                  <button key={n.id} className={`co-m-notif-item ${n.is_read ? "" : "unread"}`} onClick={() => handleNotifClick(n)}>
                    <span style={{ fontSize: 13.5, fontWeight: 400, color: "#1a1a1a" }}>{n.title}</span>
                    <span style={{ fontSize: 12.5, color: "#777" }}>{n.message}</span>
                    <span style={{ fontSize: 11, color: "#aaa" }}>{new Date(n.created_at).toLocaleDateString("ko-KR")}</span>
                  </button>
                ))
              )}
            </div>
          </>
        )}

        <div className="co-m-title">{activePage === "settings" ? infoLabel(companyInfo.type) : (PAGE_TITLES[activePage] || "대시보드")}</div>
        <div className="co-m-content">{children}</div>

        <nav className="co-m-tabs">
          {MTABS.map((t) => (
            <Link key={t.id} href={t.href} className={`co-m-tab ${navActive(t.id) ? "on" : ""}`}>
              <t.icon size={21} strokeWidth={navActive(t.id) ? 2.4 : 1.8} />
              <span>{t.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    );
  }

  const logoImg = companyInfo.thumb || companyInfo.logo || (companyInfo.type === "STORE" ? companyInfo.cover : "");

  return (
    <div className="co-top">
      <style>{`
        /* 메인 사이트 머리줄(.header/.header-inner)과 같은 판·높이·여백을 쓴다.
           기업 화면만 다른 껍데기를 쓰면 같은 서비스로 안 읽힌다. */
        .co-top { min-height: 100vh; background: #fff; }
        /* 글자 크기·굵기·색은 메인 사이트 메뉴(.gnb)와 같은 값을 쓴다 */
        .co-top-nav { display: flex; gap: 28px; flex: 1; margin-left: 22px; }
        .co-top-nav a { font-size: 16px; font-weight: 500; color: #2b2b2b; text-decoration: none;
          white-space: nowrap; padding: 4px 0; transition: color .15s; }
        .co-top-nav a:hover { color: var(--color-primary); }
        .co-top-nav a.on { color: var(--color-primary); font-weight: 700;
          border-bottom: 2px solid var(--color-primary); padding-bottom: 2px; }
        /* 메인 사이트가 PC에서 메뉴 글자를 한 단계 키우는 것까지 같이 따른다 */
        @media (min-width: 769px) { .co-top-nav a { font-size: 18px; } }
        .co-top-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        /* 평소엔 테두리만, 마우스를 올렸을 때 뷰티워크 보라로 채운다 — 머리줄에 늘 떠 있는
           단추라 채워 두면 짙은 덩어리 하나가 화면에서 제일 먼저 읽힌다. */
        .co-top-post { display: inline-flex; align-items: center; gap: 5px; height: 36px; padding: 0 15px;
          border-radius: 8px; background: #fff; border: 1px solid var(--color-primary);
          color: var(--color-primary); font-size: 14px; text-decoration: none; white-space: nowrap;
          transition: background .15s, color .15s; }
        .co-top-post:hover { background: var(--color-primary); color: #fff; }
        .co-top-me { display: flex; align-items: center; gap: 8px; text-decoration: none; color: inherit; }
        .co-top-ava { width: 32px; height: 32px; border-radius: 7px; overflow: hidden; flex-shrink: 0;
          background: #f2f2f4; display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700; color: var(--color-primary); }
        .co-top-ava img { width: 100%; height: 100%; object-fit: cover; }
        .co-top-mename { font-size: 14px; color: #333; max-width: 120px; overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap; }
        .co-top-mewrap { position: relative; }
        .co-top-me { background: none; border: none; padding: 0; cursor: pointer; }
        .co-top-memask { position: fixed; inset: 0; z-index: 60; }
        .co-top-memenu { position: absolute; top: 42px; right: 0; z-index: 61; min-width: 132px;
          background: #fff; border: 1px solid #eee; border-radius: 10px; overflow: hidden;
          box-shadow: 0 8px 22px rgba(0,0,0,0.14); }
        .co-top-memenu button { display: flex; align-items: center; gap: 8px; width: 100%;
          padding: 11px 14px; background: none; border: none; font-size: 14px; color: #333;
          cursor: pointer; white-space: nowrap; }
        .co-top-memenu button:hover { background: #f7f7f8; }
        /* 왼쪽 사이드가 빠지면서 판이 넓어졌다. 좁게 짜인 화면(공고 관리·인재풀·프로필)이
           그대로 왼쪽에 붙어 오른쪽이 텅 비어 보여, 제목과 본문을 한 칸에 묶어 가운데에 놓는다.
           칸 너비는 본문이 필요한 만큼이되 판을 넘지 않는다(fit-content) — 그래서 넓은 화면은
           그대로 꽉 차고, 좁은 화면만 가운데로 모인다. 제목은 본문의 왼쪽 끝에 맞춰 선다. */
        .co-top-body { max-width: 1360px; margin: 0 auto; padding: 26px 32px 80px;
          display: grid; grid-template-columns: fit-content(100%); justify-content: center; }
        .co-top-title { font-size: 19px; color: #1a1a1a; margin: 0 0 18px; }
        /* 설정 계열 사이드 — 개인회원 프로필 사이드(.pf-side)와 같은 결로 맞춘다. */
        /* 폭을 못박는다(176 + 28 + 800). 판이 가운데 정렬이라, 화면마다 본문 폭이
           다르면 사이드까지 따라 움직여 메뉴를 누를 때마다 화면이 흔들린다. 기준은
           가장 내용이 많은 매장정보 관리(800px). 좁은 창에서는 같이 줄어든다.
           이 style 안에서는 자식 선택자(꺾쇠) 를 쓰지 않는다 — 서버가 그 글자를
           빠져나가게 적어 보내는 바람에 클라이언트 글자와 어긋나 hydration 오류가
           났다. 자식만 고르려면 여기 .co-set-main 처럼 class 를 하나 더 준다. */
        .co-set-wrap { display: flex; align-items: flex-start; gap: 28px;
          width: 1018px; max-width: 100%; }
        /* 판 폭은 묶음이 달라도 같게 둔다 — 머리줄에서 갈래를 옮길 때마다 본문 폭이
           바뀌면 화면이 흔들린다 — 공고 관리와 공고 등록도 같은 폭이다. */
        .co-set-side { width: 176px; flex-shrink: 0; display: flex; flex-direction: column; gap: 2px;
          position: sticky; top: 92px; }
        /* 사이드와 본문 사이 세로 구분선. 사이드가 아니라 본문 쪽에 붙인다 — 사이드는
           네 줄뿐이라 거기 붙이면 선이 중간에서 끊긴다(218px vs 894px). 선은 여백
           28px 의 한가운데에 서게 밀어 넣어 양쪽 거리를 같게 둔다. */
        .co-set-main { flex: 1; min-width: 0;
          border-left: 1px solid #eeeef0; margin-left: -14px; padding-left: 14px; }
        .co-set-title { font-size: 19px; color: #1a1a1a; margin: 0 0 18px; text-align: center; }
        /* 대분류는 오른쪽 화면 제목(.co-set-title)과 같은 크기·굵기·색으로 — 둘 다
           지금 어디에 있는지를 말하는 줄이라 한쪽만 작으면 곁다리로 보인다.
           선 대신 여백으로 아래 목록과 뗀다.
           (이 style 은 글자 그대로 나가므로 따옴표·꺾쇠·＆ 를 쓰지 않는다 — 서버가
            그 글자를 빠져나가게 적어 보내 클라이언트와 어긋나면서 hydration 오류가 난다.) */
        .co-set-item { display: block; padding: 10px 12px;
          border-radius: 8px; font-size: 16px; color: #555; text-decoration: none;
          white-space: nowrap; transition: background .15s, color .15s; }
        .co-set-item:hover { background: #f7f7f8; color: #1a1a1a; }
        .co-set-item.on { background: #f7f7f8; color: var(--color-primary); font-weight: 600; }
        /* 사이드가 없어져 본문이 제 폭을 갖는다 — 안쪽 여백은 이 판이 맡는다. */
        .co-top-body .company-content { padding: 0 !important; }
        /* 다만 설정 화면은 왼쪽에 구분선이 있어 그만큼 안쪽으로 밀어야 한다. 위 규칙이
           !important 라 같은 무게로 뒤에 한 번 더 적는다 — 안 그러면 선과 카드 테두리가
           1px 차이로 겹쳐 두 줄로 보인다. */
        .co-top-body .co-set-main { padding-left: 14px !important; }
      `}</style>

      <header className="header">
        <div className="header-inner">
          {/* 로고는 메인 사이트로 — 기업 화면에 갇히지 않게 하는 유일한 문이다. */}
          <Link href="/" className="logo" aria-label="뷰티워크 홈">
            <Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} priority />
          </Link>
          <nav className="co-top-nav">
            {TOP_NAV.map((t) => (
              <Link key={t.id} href={t.href} className={topActive(t.id) ? "on" : undefined}>{t.label}</Link>
            ))}
          </nav>
          <div className="co-top-right">
            <Link href={`${base}/jobs/new`} className="co-top-post">
              <Plus size={15} />공고 등록
            </Link>
            <div style={{ position: "relative" }}>
              <button className="company-header-btn" onClick={() => setNotifOpen((v) => !v)} aria-label="알림">
                <Bell size={20} />
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
            {/* 아바타와 매장 이름 — 누르면 로그아웃만 나온다. 계정 갈래는 '설정' 메뉴가
                맡으므로, 여기서 또 같은 곳으로 가는 문을 내지 않는다. */}
            <div className="co-top-mewrap">
              <button type="button" className="co-top-me" title="내 메뉴"
                aria-haspopup="menu" aria-expanded={meMenuOpen}
                onClick={() => setMeMenuOpen((v) => !v)}>
                <span className="co-top-ava">
                  {logoImg ? <img src={logoImg} alt={companyInfo.name} /> : <span>{companyInfo.name?.[0] || "·"}</span>}
                </span>
                <span className="co-top-mename">{companyInfo.name || "내 매장"}</span>
              </button>
              {meMenuOpen && (
                <>
                  {/* 바깥을 누르면 닫힌다 */}
                  <div className="co-top-memask" onClick={() => setMeMenuOpen(false)} />
                  <div className="co-top-memenu" role="menu">
                    <button type="button" role="menuitem" onClick={나가기}>
                      <LogOut size={15} />로그아웃
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="co-top-body">
        {/* 설정 계열은 제목을 여기 두지 않는다 — 왼쪽 사이드에서 고른 것이 무엇인지는
            그 옆 본문 위에서 말하는 게 맞다(아래 .co-set-title). */}
        {!사이드 && (
          <h1 className="co-top-title">{PAGE_TITLES[activePage] || "대시보드"}</h1>
        )}
        {사이드 ? (
          /* 설정 계열 세 화면은 서로 오가는 일이 잦다. 머리줄까지 올라갔다 내려오는
             대신 옆에 늘 세워 둔다 — 개인회원 프로필 사이드(.pf-side)와 같은 짜임. */
          <div className={`co-set-wrap co-set-${묶음}`}>
            <nav className="co-set-side">
              {사이드.map((m) => (
                <Link key={m.id} href={m.href} className={`co-set-item ${activePage === m.id ? "on" : ""}`}>
                  {m.label(infoLabel(companyInfo.type))}
                </Link>
              ))}
            </nav>
            <main className="company-content co-set-main">
              {/* 사이드 이름을 품되 무엇을 하는 곳인지까지 말한다(매장정보 → 매장정보 설정). */}
              <h1 className="co-set-title">
                {사이드.find((m) => m.id === activePage)?.title(infoLabel(companyInfo.type))}
              </h1>
              {children}
            </main>
          </div>
        ) : (
          <main className="company-content">{children}</main>
        )}
      </div>
    </div>
  );
}
