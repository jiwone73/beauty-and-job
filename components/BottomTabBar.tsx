"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Briefcase, MapPin, BookOpen, FileText, User } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { 스토리공개 } from "@/lib/storiesGate";
const TABS = [
  { href: "/",           label: "홈",     icon: Home,      auth: false },
  { href: "/jobs",       label: "채용",   icon: Briefcase, auth: false },
  { href: "/jobs/nearby", label: "내 주변", icon: MapPin,   auth: false },
  // 현장이야기는 이번 오픈에서 비공개(lib/storiesGate.js) — 공개로 정해지면
  // 이 탭도 같이 켜야 하니 배열에는 남겨 두고 렌더링에서만 뺀다.
  { href: "/stories",    label: "이야기", icon: BookOpen,  auth: false },
  { href: "/profile/resume", label: "이력서", icon: FileText, auth: true },
  { href: "/profile",    label: "마이",   icon: User,      auth: true  },
];
export default function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, ownerType } = useAuthStore();
  const 탭들 = 스토리공개 ? TABS : TABS.filter((t) => t.href !== "/stories");
  const hideOn = ["/signup", "/login", "/company/signup"];
  if (hideOn.some((p) => pathname.startsWith(p))) return null;
  // 기업 영역에서는 개인 하단탭 숨김 (기업 전용 하단탭 사용)
  if (pathname.startsWith("/company")) return null;
  // 기업회원으로 로그인한 경우 개인회원용 하단 메뉴는 아예 노출하지 않음
  if (ownerType === "company") return null;
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    // 「내 주변」도 /jobs 로 시작해 「채용」과 겹친다 — 더 자세한 자리를 먼저 본다.
    if (href === "/jobs") return pathname === "/jobs" || (pathname.startsWith("/jobs/") && !pathname.startsWith("/jobs/nearby"));
    // 「이력서」도 /profile 로 시작해 「마이」와 겹친다 — 마이는 이력서 화면을 뺀 나머지 프로필 화면이다.
    if (href === "/profile") return pathname.startsWith("/profile") && !pathname.startsWith("/profile/resume");
    return pathname.startsWith(href);
  };
  const handleClick = (e: React.MouseEvent, tab: typeof TABS[0]) => {
    if (tab.auth && !isLoggedIn) {
      e.preventDefault();
      router.push("/login");
    }
  };
  return (
    <nav className="bottom-tab-bar">
      {탭들.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`bottom-tab-item ${isActive(tab.href) ? "active" : ""}`}
          onClick={(e) => handleClick(e, tab)}
        >
          <tab.icon size={22} strokeWidth={isActive(tab.href) ? 2.5 : 1.8} />
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
