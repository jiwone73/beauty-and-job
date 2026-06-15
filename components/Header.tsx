"use client";
import Link from "next/link";
import Image from "next/image";
import { Search, Building2, Menu, X, ChevronDown } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import { useApplicationStore } from "@/lib/store/applicationStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { useSignupStore } from "@/lib/store/signupStore";
import { useAuthStore } from "@/lib/store/authStore";

function AuthButtons({ onLoginClick }: { onLoginClick: () => void }) {
  const router = useRouter();
  const { isLoggedIn, ownerType, userName, logout } = useAuthStore();
  const [open, setOpen] = useState(false);

  if (isLoggedIn) {
    return (
      <>
        <div className="auth-user-wrap">
          <button className="auth-user-btn" onClick={() => setOpen(!open)}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="16" fill="#f3e5f5"/>
              <circle cx="16" cy="13" r="5" fill="#5f0080"/>
              <path d="M6 28c0-5.5 4.5-9 10-9s10 3.5 10 9" fill="#5f0080"/>
            </svg>
          </button>
          {open && (
            <div className="auth-dropdown auth-dropdown-right">
              {ownerType === "user" && (
                <>
                  <button className="auth-dropdown-item" onClick={() => { setOpen(false); router.push("/profile"); }}>내 프로필</button>
                  <button className="auth-dropdown-item" onClick={() => { setOpen(false); router.push("/profile/resume"); }}>이력서</button>
                </>
              )}
              {ownerType === "company" && (
                <button className="auth-dropdown-item" onClick={() => { setOpen(false); router.push("/company/dashboard"); }}>대시보드</button>
              )}
              <div className="auth-dropdown-divider" />
              <button className="auth-dropdown-item auth-logout" onClick={() => {
                useSignupStore.getState().reset();
                useProfileStore.getState().reset();
                useBookmarkStore.getState().reset();
                useApplicationStore.getState().reset();
                logout();
                setOpen(false);
              }}>로그아웃</button>
            </div>
          )}
        </div>
        <Link href="/company" className="btn btn-outline-biz gnb-biz-btn">
          기업 서비스 <ChevronDown size={14} />
        </Link>
      </>
    );
  }

  return (
    <>
      <button className="btn btn-outline-auth" onClick={onLoginClick}>회원가입/로그인</button>
      <Link href="/company" className="btn btn-outline-biz gnb-biz-btn">
        기업 서비스 <ChevronDown size={14} />
      </Link>
    </>
  );
}

interface HeaderProps {
  onSearchClick?: () => void;
}

export default function Header({ onSearchClick }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, ownerType } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const handleSearch = () => {
    router.push("/search");
  };
  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <Image src="/images/logo.png" alt="뷰티앤잡" width={140} height={40} priority />
          </Link>
          <nav className="gnb">
            <Link href="/jobs" className={`gnb-with-tag ${pathname === "/jobs" ? "gnb-active" : ""}`}>채용공고</Link>
            <button
              type="button"
              className="gnb-with-tag"
              style={{ background: "none", border: "none", cursor: "pointer" }}
              onClick={() => {
                if (!isLoggedIn) router.push("/jobseeker");
                else if (ownerType === "company") router.push("/company/dashboard");
                else router.push("/profile");
              }}>
              이력서 등록
            </button>
            <Link href="/stories" className="gnb-with-tag">
              현장이야기
            </Link>
          </nav>
          <div className="header-right">
            <button className="icon-btn" aria-label="검색" onClick={handleSearch}>
              <Search size={20} />
            </button>
            <AuthButtons onLoginClick={() => router.push("/login")} />
            <button className="icon-btn mob-hamburger" aria-label="메뉴" onClick={() => setMenuOpen(true)}>
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>


      {/* 햄버거 메뉴 */}
      {menuOpen && (
        <div className="mob-menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="mob-menu-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mob-menu-head">
              <span className="mob-menu-title">메뉴</span>
              <button className="mob-menu-close" onClick={() => setMenuOpen(false)}><X size={22} /></button>
            </div>
            <nav className="mob-menu-nav">
              <button type="button" className="mob-menu-item" style={{ background: "none", border: "none", width: "100%", cursor: "pointer", font: "inherit" }}
                onClick={() => {
                  setMenuOpen(false);
                  if (!isLoggedIn) router.push("/jobseeker");
                  else if (ownerType === "company") router.push("/company/dashboard");
                  else router.push("/profile");
                }}>
                <span className="mob-menu-item-label">이력서 등록</span>
                <span className="mob-menu-badge gray">경력직</span>
              </button>
              <Link href="/company/login" className="mob-menu-item" onClick={() => setMenuOpen(false)}>
                <span className="mob-menu-item-label">기업 서비스</span>
                <span className="mob-menu-badge purple">기업</span>
              </Link>
              <div className="mob-menu-divider" />
              <Link href="/support/faq" className="mob-menu-item" onClick={() => setMenuOpen(false)}>
                <span className="mob-menu-item-label">고객지원</span>
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
