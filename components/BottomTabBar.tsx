"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Briefcase, FileText, BookOpen, User } from "lucide-react";

const TABS = [
  { href: "/", label: "홈", icon: Home },
  { href: "/jobs", label: "채용", icon: Briefcase },
  { href: "/profile/resume", label: "이력서", icon: FileText },
  { href: "/insights", label: "인사이트", icon: BookOpen },
  { href: "/profile", label: "마이", icon: User },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  // 탭바 숨길 페이지
  const hideOn = ["/signup", "/login", "/company/signup"];
  if (hideOn.some((p) => pathname.startsWith(p))) return null;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="bottom-tab-bar">
      {TABS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`bottom-tab-item ${isActive(href) ? "active" : ""}`}
          onClick={(e) => handleTabClick(e, href)}
        >
          <Icon size={22} strokeWidth={isActive(href) ? 2.5 : 1.8} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
