"use client";
import { usePathname } from "next/navigation";

export default function MemberTabs() {
  const pathname = usePathname();
  return (
    <div className="admin-member-tabs">
      <div className="admin-tab-row2">
        <a href="/admin/members/companies"
          className={`admin-tab2 ${pathname === "/admin/members/companies" ? "active" : ""}`}>
          기업목록
        </a>
        <a href="/admin/members/companies/blocked"
          className={`admin-tab2 ${pathname.includes("blocked") ? "active" : ""}`}>
          열람제한기업
        </a>
        <a href="/admin/members/companies/favorites"
          className={`admin-tab2 ${pathname.includes("favorites") ? "active" : ""}`}>
          관심기업
        </a>
      </div>
    </div>
  );
}