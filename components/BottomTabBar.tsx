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
  // 기업 대시보드 안에서는 공개 하단탭 숨김 (기업 전용 하단탭 사용)
  if (pathname.startsWith("/company/dashboard")) return null;
  const isCompany = ownerType === "company";
  // 기업회원은 "마이"를 기업 대시보드로 연결
  const tabHref = (href: string) => (href === "/profile" && isCompany ? "/company/dashboard" : href);
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
      {TABS.map((tab) => {
        const href = tabHref(tab.href);
        return (
          <Link
            key={tab.href}
            href={href}
            className={`bottom-tab-item ${isActive(href) ? "active" : ""}`}
            onClick={(e) => handleClick(e, tab)}
          >
            <tab.icon size={22} strokeWidth={isActive(href) ? 2.5 : 1.8} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
