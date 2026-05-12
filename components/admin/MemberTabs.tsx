"use client";
import { usePathname } from "next/navigation";

export default function MemberTabs() {
  const pathname = usePathname();
  const isCompany = pathname.startsWith("/admin/members/companies");

  return (
    <div className="admin-member-tabs">
      {/* 1단 탭 */}
      <div className="admin-tab-row1">
        <a href="/admin/members"
          className={`admin-tab1 ${!isCompany ? "active" : ""}`}>
          개인회원
        </a>
        <a href="/admin/members/companies"
          className={`admin-tab1 ${isCompany ? "active" : ""}`}>
          기업회원
        </a>
      </div>

      {/* 2단 탭 - 기업회원 선택 시만 표시 */}
      {isCompany && (
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
      )}
    </div>
  );
}
