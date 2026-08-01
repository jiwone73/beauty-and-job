"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Briefcase, BookOpen, User } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
const TABS = [
  { href: "/",         label: "홈",    icon: Home,      auth: false },
  { href: "/jobs",     label: "채용",  icon: Briefcase, auth: false },
  { href: "/stories",  label: "이야기", icon: BookOpen, auth: false },
  { href: "/profile",  label: "마이",  icon: User,      auth: true  },
];
export default function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, ownerType } = useAuthStore();
  const hideOn = ["/signup", "/login", "/company/signup"];
  if (hideOn.some((p) => pathname.startsWith(p))) return null;
  // 기업 영역에서는 개인 하단탭 숨김 (기업 전용 하단탭 사용)
  if (pathname.startsWith("/company")) return null;
  // 기업회원으로 로그인한 경우 개인회원용 하단 메뉴는 아예 노출하지 않음
  if (ownerType === "company") return null;
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
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
      {TABS.map((tab) => (
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
