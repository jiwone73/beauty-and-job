"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import {
  Briefcase, Users, FileText, Settings, UserCog,
  Bell, LogOut, Search, BookmarkCheck, Menu, X, ChevronDown, ExternalLink, Send
} from "lucide-react";



const PAGE_TITLES: Record<string, string> = {
  dashboard: "대시보드",
  jobs: "공고·지원자 관리",
  "jobs-new": "공고 작성",
  applicants: "지원자",
  talent: "인재 검색",
  scrapped: "스크랩 인재",
  // 「공고별」이 붙어야 제목이 화면 이름으로 읽힌다. 그냥 「보낸 제안」이면
  // 바로 아래 공고명과 같은 크기·같은 성격이라 둘 다 제목처럼 보여 무엇이
  // 이 화면의 주인인지 헷갈렸다. 공고·지원자도 제목에 「관리」를 붙여 같은
  // 층을 만든다.
  proposals: "공고별 보낸 제안",
  settings: "기업 정보",
  account: "계정 설정",
  password: "비밀번호 변경",
  notifications: "알림 설정",
  billing: "내 이용권",
};

export default function CompanyLayout({ children, activePage, title, 제목숨김, side, sideExtra }: {
  children: React.ReactNode;
  activePage: string;
  /** 화면 제목을 갈아 끼운다 — 한 사람의 이력서처럼 제목이 내용마다 달라지는 곳. */
  title?: string;
  /** 본문 제목(h1)을 세우지 않는다. 본문이 제 이름을 스스로 적는 화면용 —
   *  상품 상세가 그렇다. 두 번 적으면 어느 쪽이 그 화면 이름인지 흐려진다. */
  제목숨김?: boolean;
  /** 화면이 제 사이드를 직접 그린다. 지원자처럼 사이드에 세울 것이 고정 메뉴가
   *  아니라 그때그때 달라지는 목록(공고)인 경우에 쓴다. */
  side?: React.ReactNode;
  /** 고정 메뉴 아래에 덧붙일 것(인재검색의 필터 판). 메뉴를 통째로 갈아 끼우는
   *  side 와 달리, 메뉴는 그대로 두고 아래에 더한다 — 메뉴를 화면마다 다시 적으면
   *  이름이 갈라진다. */
  sideExtra?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // 매장 회원이면 '매장정보', 오피스(기업) 회원이면 '기업정보'로 부른다.
  const infoLabel = (t: string) => (t === "OFFICE" ? "기업정보" : "매장정보"); // 매장·매장+오피스는 매장으로 분류
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
            category: res.data.company_type === "OFFICE" ? "오피스" : res.data.company_type === "STORE" ? "매장" : "매장·오피스",
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
    else if (n.related_type === "proposal") router.push(`${base}/proposals`);
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
    { id: "proposals", label: "제안·스크랩",  icon: Send,         href: `${base}/proposals`, group: "proposals" },
    { id: "scrapped",  label: "스크랩 인재",   icon: BookmarkCheck,href: `${base}/proposals/scrapped`, group: "proposals" },
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
    // 공고와 지원자는 한 덩어리다 — 공고를 올리는 이유가 지원자를 받는 것이다.
    // 잡코리아도 「공고·지원자 관리」로 묶어 부른다.
    { id: "jobs",       label: "공고·지원자",  href: `${base}/jobs` },
    { id: "talent",     label: "인재풀",       href: `${base}/talent` },
    // 제안은 공고를 골라 그 공고로 보낸 사람들을 관리하는 일이라, 인재를 찾는
    // 인재풀과 하는 일이 다르다. 인재풀은 「누구에게 보낼까」, 보낸 제안은
    // 「보낸 뒤 어떻게 되고 있나」다.
    //
    // 머리줄은 「제안·스크랩」, 화면 제목은 「보낸 제안」이다. 공고·지원자도 같은
    // 방식이다(머리줄 「공고·지원자」, 제목 「공고·지원자 관리」) — 머리줄은
    // 어느 갈래인지를, 제목은 그 안에서 무엇을 보는지를 말한다.
    //
    // 「보낸 제안」은 구직자 쪽 「받은 제안」(/profile/proposals)과 짝이다.
    //   「채용」은 우리가 모은 공고 256건 중 68%가 쓰는 말이고, 「스카웃」은 한
    //   건도 없었다(리멤버 말투다). 사람인 「후보자 관리」·잡코리아 「포지션
    //   제안」은 경력직 사무직 말투라 헤어 스텝·네일 인턴에는 무겁다.
    { id: "proposals",  label: "제안·스크랩",  href: `${base}/proposals` },
    // 「상품안내」는 요금제로 간다. 예전에는 광고 상품(/company/ads)으로 갔는데,
    // 채용 상품과 광고 상품은 다른 물건이라 사장님이 공고 상품을 찾다 광고 판을 봤다.
    // 이름이 「채용상품」이었을 때는 그 아래 배너광고가 있는 줄을 몰랐다 — 파는
    // 것이 둘이면 머리줄 이름은 둘을 다 품는 말이어야 한다.
    { id: "plans",      label: "상품안내",     href: `${base}/plans` },
  ];
  // 사이드 메뉴. 머리줄에서 한 갈래로 들어오면 그 안에서 다시 나뉜다.
  //   사이드는 짧게 훑는 자리라 이름만 적고, 무엇을 하는 곳인지는 오른쪽 제목이
  //   말한다(title). 라벨이 함수인 것은 매장/오피스에 따라 이름이 갈리는 칸이 있어서다.
  //   묶음이 늘면 여기에 한 줄 더 넣으면 된다 — 껍데기는 손댈 것이 없다.
  const SIDE_NAV: Record<string, { id: string; label: (i: string) => string;
    title: (i: string) => string; href: string; 아래?: boolean }[]> = {
    // 채용공고 — 셀렉미가 '채용 정보 등록 / 관리·수정'을 나눠 둔 것과 같은 짜임.
    //   목록이 들어오는 문이라 위에 두고, 등록을 아래에 둔다.
    jobs: [
      { id: "jobs",     label: () => "공고·지원자 관리", title: () => "공고·지원자 관리", href: `${base}/jobs` },
      // 폼을 여는 자리는 「작성」, 폼 안에서 실제로 올리는 단추는 「공고 등록」이다 —
      // 한 화면에 같은 이름의 단추가 둘이라 어느 것이 진짜 등록인지 헷갈렸다.
      { id: "jobs-new", label: () => "공고 작성",        title: () => "공고 작성",        href: `${base}/jobs/new` },
    ],
    // 제안·스크랩 — 모아 둔 사람과 보낸 사람. 인재풀은 찾는 데서 끝나고(카드의 북마크로
    //   담는 데까지), 담아 둔 사람을 보는 일은 여기서 한다. 사람인도 인재풀 화면에는
    //   저장 목록을 두지 않고 「후보자 저장」 버튼만 둔 뒤 저장한 사람은 따로 관리한다.
    //   셀렉미도 「찜한 인재」를 「보낸제안」 옆에 둔다. 보낸 제안이 이 갈래의 첫 화면이라 앞에 둔다.
    proposals: [
      { id: "proposals", label: () => "보낸 제안",   title: () => "보낸 제안",   href: `${base}/proposals` },
      { id: "scrapped",  label: () => "스크랩 인재", title: () => "스크랩 인재", href: `${base}/proposals/scrapped` },
    ],
    // 설정 — 비밀번호만 이름과 제목이 같다. 여기서 하는 일이 설정이 아니라 변경
    //   하나뿐이라 "변경설정"처럼 겹쳐 쓸 말이 없다.
    // 채용상품 — 첫 화면은 요금제(카드 넉 장)고, 그 아래는 상품 하나하나다.
    //   카드의 「자세히 보기」와 이 사이드가 같은 곳으로 간다. 스타트는 사는
    //   물건이 아니라 가입하면 놓이는 자리라 상세 화면이 없다.
    // 채용상품 — 파는 물건이 둘이다. 공고를 거는 상품(채용공고)과 자리를 파는
    //   상품(배너광고). 한 화면에 같이 두었더니 요금제 카드 아래에 광고가 딸린
    //   꼴이라 둘째 물건이 곁다리로 읽혔다. 페이지를 나눠 각자 제 제목을 갖는다.
    //   파는 물건이 둘이라 둘을 같은 높이에 세우고, 그 아래에 낱개를 단다.
    //   다섯을 한 높이로 늘어놓았더니 라이트·스탠다드·프리미엄이 배너광고와
    //   같은 종류의 물건처럼 보였다.
    plans: [
      // 오픈이벤트는 여기 두지 않는다. 이 옆줄은 이미 가입한 사장님이 보는
      // 자리라 「어떻게 참여하나」는 지난 이야기다 — 이벤트 안내는 가입 전에
      // 보는 것이고, 그 길(메인 배너·기업 서비스 소개의 「자세히 보기」)은
      // 그대로 살아 있다. 페이지(/plans/event)도 지우지 않았다.
      { id: "plans",          label: () => "채용공고 상품", title: () => "채용공고 상품 안내", href: `${base}/plans` },
      { id: "plan-light",     label: () => "라이트",   title: () => "라이트",   href: `${base}/plans/light`,    아래: true },
      { id: "plan-standard",  label: () => "스탠다드", title: () => "스탠다드", href: `${base}/plans/standard`, 아래: true },
      { id: "plan-premium",   label: () => "프리미엄", title: () => "프리미엄", href: `${base}/plans/premium`,  아래: true },
      { id: "plans-ads",      label: () => "배너광고 상품", title: () => "배너광고 상품 안내", href: `${base}/plans/ads` },
      { id: "ads-main",       label: () => "메인페이지 노출", title: () => "메인페이지 노출 광고",
        href: `${base}/plans/ads/main`, 아래: true },
      { id: "ads-jobs",       label: () => "공고페이지 노출", title: () => "공고페이지 노출 광고",
        href: `${base}/plans/ads/jobs`, 아래: true },
    ],
    settings: [
      { id: "settings",      label: (i: string) => i,      title: (i: string) => `${i} 설정`, href: `${base}/settings` },
      { id: "account",       label: () => "계정정보",       title: () => "계정정보 설정",      href: `${base}/account` },
      { id: "password",      label: () => "비밀번호 변경",   title: () => "비밀번호 변경",      href: `${base}/account/password` },
      { id: "notifications", label: () => "알림",           title: () => "알림 설정",          href: `${base}/notifications` },
      // 무엇을 언제까지 쓰는지는 설정이 아니라 영수증에 가깝지만, 사장님이 찾으러
      // 오는 자리는 결국 계정 쪽이다. 「채용상품」(머리줄)은 사러 가는 길이고
      // 여기는 산 것을 보는 길이다.
      { id: "billing",       label: () => "이용권",         title: () => "내 이용권",          href: `${base}/billing` },
    ],
  };
  /** 지금 화면이 어느 묶음에 드는지 — 사이드를 보일지, 머리줄 어느 메뉴를 켤지가 이걸로 정해진다. */
  const 묶음 = Object.keys(SIDE_NAV).find((k) => SIDE_NAV[k].some((m) => m.id === activePage));
  const 사이드 = 묶음 ? SIDE_NAV[묶음] : null;
  const 사이드있나 = !!(사이드 || side);

  /* 평평한 목록을 머리줄과 그 아래로 묶는다 — 「아래: true」가 바로 앞 머리줄에
     딸린다는 뜻이다. 묶어 두어야 여닫을 수 있다. */
  const 옆줄줄기 = (() => {
    const 줄기: { 머리: NonNullable<typeof 사이드>[number]; 아래: NonNullable<typeof 사이드> }[] = [];
    for (const m of 사이드 ?? []) {
      if (m.아래 && 줄기.length) 줄기[줄기.length - 1].아래.push(m);
      else 줄기.push({ 머리: m, 아래: [] });
    }
    return 줄기;
  })();

  // 스크랩 인재는 제안·스크랩의 갈래라 '제안·스크랩'이 켜져 있어야 한다.
  // 계정정보·비밀번호·알림설정은 '설정'의 갈래라(옆 사이드로 들어간다) '설정'이 켜져 있어야 한다.
  const topActive = (id: string) =>
    // 채용상품은 그 안의 상품 상세까지 한 갈래다.
    id === "plans" ? 묶음 === "plans"
    : id === "jobs" ? (activePage === "jobs" || activePage === "jobs-new" || activePage === "applicants")
    : id === "talent" ? activePage === "talent"
    : id === "proposals" ? (activePage === "proposals" || activePage === "scrapped")
    : id === "settings" ? 묶음 === "settings"
    : activePage === id;
  // 공고 작성 화면(jobs-new)은 이제 독립 메뉴가 없다 — 목록 메뉴 "채용공고"의
  // 연장이니 그 메뉴가 계속 켜져 있어야 한다.
  const navActive = (id: string) => activePage === id || (id === "jobs" && activePage === "jobs-new");
  // 옆줄에서 접은 묶음만 적어 둔다 — 처음에는 다 펴져 있다.
  const [접은것, set접은것] = useState<string[]>([]);
  const 접기 = (id: string) =>
    set접은것((앞) => (앞.includes(id) ? 앞.filter((x) => x !== id) : [...앞, id]));
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
                    <span style={{ fontSize: 13.5, fontWeight: 400, color: "#555" }}>{n.title}</span>
                    <span style={{ fontSize: 12.5, color: "#555" }}>{n.message}</span>
                    <span style={{ fontSize: 11, color: "#555" }}>{new Date(n.created_at).toLocaleDateString("ko-KR")}</span>
                  </button>
                ))
              )}
            </div>
          </>
        )}

        <div className="co-m-title">{title || (activePage === "settings" ? infoLabel(companyInfo.type) : (PAGE_TITLES[activePage] || "대시보드"))}</div>
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
              새 공고 작성
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
        {/* 옆줄이 있는 화면은 제목을 본문 판 안에 둔다 — 판 밖에 두면 옆줄 꼭대기가
            제목 줄에 걸려 판과 어긋난다. 인재 검색도 옆줄(필터 기둥)이 있어 같다. */}
        {/* 제목숨김은 옆줄 없는 화면에도 걸린다. 오픈이벤트처럼 제 머리를 들고
            오는 화면이 여기서 「대시보드」라는 제목을 하나 더 얻고 있었다. */}
        {!사이드있나 && !제목숨김 && activePage !== "talent" && (
          <h1 className="co-top-title">{title || PAGE_TITLES[activePage] || "대시보드"}</h1>
        )}
        {activePage === "talent" ? (
          /* 인재 검색은 한 갈래라 탭 없이, 필터 기둥과 목록만 선다. */
          <div className="co-set-wrap co-tal">
            <div className="co-tal-body">
              {sideExtra && <aside className="co-set-side co-tal-side">{sideExtra}</aside>}
              <main className={`company-content co-set-main${sideExtra ? "" : " co-tal-solo"}`}>
                <h1 className="co-set-title">{title || PAGE_TITLES[activePage] || "대시보드"}</h1>
                {children}
              </main>
            </div>
          </div>
        ) : 사이드있나 ? (
          /* 설정 계열 세 화면은 서로 오가는 일이 잦다. 머리줄까지 올라갔다 내려오는
             대신 옆에 늘 세워 둔다 — 개인회원 프로필 사이드(.pf-side)와 같은 짜임. */
          <div className={`co-set-wrap co-set-${묶음 || activePage}`}>
            {/* 옆줄은 어느 화면이든 같은 모양이다 — 설정도 제안·스크랩도 같은 글줄
                목록. 제안·스크랩만 「보낸 제안 | 스크랩 인재」를 한 줄 세그먼트로
                두었더니 같은 자리에 선 메뉴가 화면마다 달라 보였다. */}
            <nav className="co-set-side">
              {/* 화면이 제 사이드를 주면 그것이 먼저다 — 고정 메뉴를 우선하면
                  넘겨준 사이드가 조용히 무시된다. */}
              {side ? side : 옆줄줄기.map((줄기) => (
                <div key={줄기.머리.id} className="co-set-branch">
                  {/* 머리 글자는 그 화면으로 가고, 화살표는 접는다. 한 자리에
                      둘을 겹치면 누르기 전에 무엇이 일어날지 알 수 없다.
                      처음에는 다 펴져 있다. */}
                  <div className={줄기.아래.length > 0 ? "co-set-row" : undefined}>
                    <Link href={줄기.머리.href}
                          className={`co-set-item${줄기.아래.length > 0 ? " head" : ""}${activePage === 줄기.머리.id ? " on" : ""}`}>
                      {줄기.머리.label(infoLabel(companyInfo.type))}
                    </Link>
                    {줄기.아래.length > 0 && (
                      <button type="button" className="co-set-fold"
                              onClick={() => 접기(줄기.머리.id)}
                              aria-expanded={!접은것.includes(줄기.머리.id)}
                              aria-label={접은것.includes(줄기.머리.id) ? "펴기" : "접기"}>
                        <ChevronDown size={15} style={{ transform: 접은것.includes(줄기.머리.id) ? "rotate(-90deg)" : "none" }} />
                      </button>
                    )}
                  </div>
                  {!접은것.includes(줄기.머리.id) && 줄기.아래.map((m) => (
                    <Link key={m.id} href={m.href}
                          className={`co-set-item sub ${activePage === m.id ? "on" : ""}`}>
                      {m.label(infoLabel(companyInfo.type))}
                    </Link>
                  ))}
                </div>
              ))}
              {sideExtra}
            </nav>
            <main className="company-content co-set-main">
              {/* 제목은 본문 판 안 맨 위에 선다 — 고객센터와 같은 짜임이다. 판 밖에
                  두면 옆줄 꼭대기가 제목 줄에 걸려 본문 판과 어긋난다. */}
              {!제목숨김 && (
                <h1 className="co-set-title">
                  {title || 사이드?.find((m) => m.id === activePage)?.title(infoLabel(companyInfo.type)) || PAGE_TITLES[activePage]}
                </h1>
              )}
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
