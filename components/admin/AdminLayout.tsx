"use client";
import { useState, useEffect } from "react";
import { ALBA_ADMIN_ID } from "@/lib/alba";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard, Users, Briefcase, BookOpen, Megaphone, Mail, Bell,
  LogOut, Menu, X, ChevronDown, ChevronRight, MessageSquare, Building2, Download, Clock, Bug, Rocket } from "lucide-react";
const NAV_ITEMS = [
  // 오픈까지 남은 일이 제일 먼저 보여야 한다.
  { id: "launch", label: "상용화 일정", icon: Rocket, href: "/admin/launch" },
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard, href: "/admin" },
  
  {
    id: "members", label: "회원관리", icon: Users, href: "/admin/members",
    children: [
      { id: "members", label: "개인회원", href: "/admin/members" },
      { id: "members-companies", label: "기업회원", href: "/admin/members/companies" },
    ]
  },
  // 「공고 직접 등록」은 메뉴에서 뺐다. 공고를 만드는 길은 「외부공고 불러오기」에서
  // 고른 뒤 열리는 폼 하나뿐이라, 빈 폼을 따로 여는 자리가 필요 없다.
  // (/admin/jobs/new 는 그대로 살아 있다 — 그 폼으로 가는 길이다.)
  { id: "jobs", label: "채용공고", icon: Briefcase, href: "/admin/jobs" },
  {
    id: "resumes", label: "입사지원", icon: Users, href: "/admin/resumes/applications",
    children: [
      { id: "resumes-applications", label: "입사지원 목록", href: "/admin/resumes/applications" },
    ]
  },
  { id: "members-alba", label: "알바 근무현황", icon: Clock, href: "/admin/members/alba" },
  // 시험하다 나온 것을 모으는 자리. 공고 등록 이슈도 여기 「공고등록」 영역으로 들어온다.
  { id: "test-team", label: "클로드 테스트팀", icon: Bug, href: "/admin/test-team" },
  { id: "test-reports", label: "테스트 리포트", icon: Bug, href: "/admin/test-reports" },
  {
    id: "import", label: "외부공고 불러오기", icon: Download, href: "/admin/import/hairinjob",
    children: [
      { id: "import-hairinjob", label: "헤어인잡", href: "/admin/import/hairinjob" },
      { id: "import-selectme", label: "셀렉미", href: "/admin/import/selectme" },
      { id: "import-work24", label: "고용24", href: "/admin/import/work24" },
      // 카페는 목록을 만들 수 없다 — 알바가 글을 찾아 붙여넣는 자리로 바로 보낸다.
      { id: "import-cafe", label: "맨사 / 뷰앤잡", href: "/admin/jobs/new?paste=1" },
    ]
  },
  { id: "outreach", label: "브랜드 리스트", icon: Building2, href: "/admin/outreach" },
  { id: "stories", label: "현장이야기", icon: BookOpen, href: "/admin/stories" },
  { id: "newsletters", label: "뉴스레터", icon: Mail, href: "/admin/newsletters" },
  { id: "notices", label: "공지사항", icon: Bell, href: "/admin/notices" },
  { id: "ads", label: "사업문의", icon: Megaphone, href: "/admin/ads" },
  { id: "inquiries", label: "1:1 문의", icon: MessageSquare, href: "/admin/inquiries" },
];


/** 화면 제목. 사이드에서 켜질 메뉴(activeMenu)로 찾는다. */
const PAGE_SUBTITLES: Record<string, string> = {
  "launch": "상용화 일정",
  "dashboard": "대시보드",
  "members": "개인회원",
  "members-companies": "기업회원",
  "members-alba": "알바 근무현황",
  "jobs": "채용공고 목록",
  "jobs-new": "공고 직접 등록",
  "resumes-applications": "입사지원 목록",
  // 외부공고 불러오기는 소스마다 화면이 달라, 어느 소스를 보고 있는지 제목이 말해 준다.
  "import-hairinjob": "헤어인잡 공고 불러오기",
  "import-selectme": "셀렉미 공고 불러오기",
  "import-work24": "고용24 공고 불러오기",
  "test-team": "클로드 테스트팀",
  "test-reports": "테스트 리포트",
  "jobs-issues": "등록 이슈",
  "outreach": "브랜드 리스트",
  "stories": "현장이야기",
  "newsletters": "뉴스레터",
  "notices": "공지사항",
  "ads": "사업문의",
  "inquiries": "1:1 문의",
};

export default function AdminLayout({ children, activeMenu, pageTitle }: {
  children: React.ReactNode;
  activeMenu: string;
  /** 사이드에서 켜질 메뉴와 화면 제목이 다를 때. 목록에서 넘어온 공고 등록 폼이
   *  그렇다 — 사이드는 그 소스를 켜 두어야 어디서 왔는지 보이지만, 제목은
   *  「셀렉미 공고 불러오기」가 아니라 「공고 등록」이어야 한다. */
  pageTitle?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openMenus, setOpenMenus] = useState<string[]>(["jobs", "members", "resumes", "import"]);
  const [authChecked, setAuthChecked] = useState(false);
  const [newInquiries, setNewInquiries] = useState(0);
  const [newSupportInquiries, setNewSupportInquiries] = useState(0);
  // 머리줄에 세우는 '지금 밀린 것' — 어느 화면에 있든 쌓이는 값이라 메뉴 배지로
  // 흩어 두면 메뉴를 훑어야 알 수 있었다.
  const [jobIssues, setJobIssues] = useState(0);
  const [newApplications, setNewApplications] = useState(0);
  const [meOpen, setMeOpen] = useState(false);
  const [adminId, setAdminId] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    // 토큰 유효성 서버 검증 (만료/무효면 강제 로그아웃)
    fetch("/api/admin/verify", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("admin_token");
          router.replace("/admin/login");
        } else {
          setAuthChecked(true);
          res.json().then((d) => setAdminId(d?.data?.adminId || "")).catch(() => {});
        }
      })
      .catch(() => {
        setAuthChecked(true);
      });
  }, [router]);

  // 등록 이슈·새 지원 — 머리줄 표시용
  useEffect(() => {
    if (!authChecked) return;
    const token = localStorage.getItem("admin_token");
    const h = { Authorization: `Bearer ${token}` };
    fetch("/api/admin/app-notes?list=jobissue", { headers: h })
      .then((r) => r.json())
      .then((d) => setJobIssues(Array.isArray(d?.data) ? d.data.length : (d?.data?.items?.length || 0)))
      .catch(() => {});
    fetch("/api/admin/applications", { headers: h })
      .then((r) => r.json())
      .then((d) => {
        const items = d?.data?.items || d?.data || [];
        setNewApplications(Array.isArray(items) ? items.filter((x: any) => (x.status || "").toUpperCase() === "APPLIED").length : 0);
      })
      .catch(() => {});
  }, [authChecked]);

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
      fetch("/api/admin/inquiries?status=new", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => setNewSupportInquiries(d?.data?.items?.length || 0))
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
        minHeight: "100vh", background: "#fff",
        fontSize: "14px", color: "#582681", fontWeight: 600,
      }}>
        로딩 중...
      </div>
    );
  }

  const toggleMenu = (id: string) => {
    setOpenMenus(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  // 지금 보고 있는 화면이 든 묶음은 늘 펴 둔다. 하위 메뉴를 누르면 화면이 바뀌며
  // 사이드가 다시 그려지는데, 접힌 채로 시작하면 방금 누른 자리가 사라져 버린다.
  const isMenuOpen = (id: string) => openMenus.includes(id) || activeMenu === id || activeMenu.startsWith(`${id}-`);

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="admin-sidebar-logo">
          <Link href="/admin" className="admin-logo-link">
            {sidebarOpen ? (
              <Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} priority />
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
            const badgeCount = item.id === "ads" ? newInquiries : item.id === "inquiries" ? newSupportInquiries : 0;
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

      </aside>

      <div className="admin-main">
        {/* 대분류는 사이드에서 이미 켜져 있다 — 머리줄에 또 적으면 같은 말이 두 번이다.
            화면 이름은 본문 위로 내리고, 머리줄에는 어느 화면에 있든 쌓이는 것만 둔다. */}
        <header className="admin-header">
          <div className="admin-header-inner">
            <div className="admin-header-left" />
            <div className="admin-header-right">
              <div className="admin-todo">
                <button type="button" className={`admin-todo-item ${jobIssues ? "on" : ""}`}
                  onClick={() => router.push("/admin/jobs/issues")}>
                  등록 이슈 <b>{jobIssues}</b>
                </button>
                <button type="button" className={`admin-todo-item ${newApplications ? "on" : ""}`}
                  onClick={() => router.push("/admin/resumes/applications")}>
                  새 지원 <b>{newApplications}</b>
                </button>
                <button type="button" className={`admin-todo-item ${newInquiries + newSupportInquiries ? "on" : ""}`}
                  onClick={() => router.push("/admin/inquiries")}>
                  문의 <b>{newInquiries + newSupportInquiries}</b>
                </button>
              </div>
              <div className="admin-me">
                <button type="button" className="admin-me-btn" onClick={() => setMeOpen((v) => !v)}>
                  <span className="admin-me-ava">{(adminId || "?")[0].toUpperCase()}</span>
                  {adminId || "…"}
                  <em className="admin-me-role">{adminId === ALBA_ADMIN_ID ? "알바" : "관리자"}</em>
                  <ChevronDown size={13} />
                </button>
                {meOpen && (
                  <>
                    <div className="admin-me-mask" onClick={() => setMeOpen(false)} />
                    <div className="admin-me-menu">
                      <button type="button" onClick={() => router.push("/")}>사이트로 이동</button>
                      <button type="button" onClick={() => {
                        localStorage.removeItem("admin_token");
                        router.push("/admin/login");
                      }}>로그아웃</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="admin-content">
          {(pageTitle || PAGE_SUBTITLES[activeMenu]) && (
            <h1 className="admin-page-title">{pageTitle || PAGE_SUBTITLES[activeMenu]}</h1>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}