"use client";
import { usePathname } from "next/navigation";
export default function ResumeTabs() {
  const pathname = usePathname();
  const sub = [
    { label: "전체 이력서", href: "/admin/resumes" },
    { label: "스크랩 이력서", href: "/admin/resumes/scrapped" },
    { label: "열람 이력서", href: "/admin/resumes/viewed" },
  ];
  return (
    <div className="admin-member-tabs">
      {/* 1단 */}
      <div className="admin-tab-row1">
        <a href="/admin/resumes" className="admin-tab1 active">인재정보</a>
      </div>
      {/* 2단 */}
      <div className="admin-tab-row2">
        {sub.map((tab) => (
          <a key={tab.href} href={tab.href}
            className={`admin-tab2 ${pathname === tab.href ? "active" : ""}`}>
            {tab.label}
          </a>
        ))}
      </div>
    </div>
  );
}