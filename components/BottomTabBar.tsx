"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Briefcase, FileText, BookOpen, User } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";

const TABS = [
  { href: "/",               label: "홈",    icon: Home,      auth: false },
  { href: "/jobs",           label: "채용",  icon: Briefcase, auth: false },
  { href: "/profile/resume", label: "이력서", icon: FileText,  auth: true  },
  { href: "/insights",       label: "인사이트", icon: BookOpen, auth: false },
  { href: "/profile",        label: "마이",  icon: User,      auth: true  },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn } = useAuthStore();

  const hideOn = ["/signup", "/login", "/company/signup"];
  if (hideOn.some((p) => pathname.startsWith(p))) return null;

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
