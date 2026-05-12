"use client";
import { usePathname } from "next/navigation";

export default function ResumeTabs() {
  const pathname = usePathname();

  const sub = [
    { label: "전체 이력서", href: "/admin/resumes" },
    { label: "스크랩 이력서", href: "/admin/resumes/scrapped" },
    { label: "열람 이력서", href: "/admin/resumes/viewed" },
    { label: "입사지원 관리", href: "/admin/resumes/applications" },
  ];

  return (
    <div className="admin-tab-row1">
      {sub.map((tab) => (
        <a key={tab.href} href={tab.href}
          className={`admin-tab1 ${pathname === tab.href ? "active" : ""}`}>
          {tab.label}
        </a>
      ))}
    </div>
  );
}
