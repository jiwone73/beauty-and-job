"use client";
import Link from "next/link";
import Image from "next/image";
import { Search, Building2, FilePlus, ChevronDown } from "lucide-react";
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
                  <button className="auth-dropdown-item" onClick={() => { setOpen(false); router.push("/profile/settings"); }}>계정 설정</button>
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
  const handleSearch = () => {
    router.push("/search");
  };
  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} priority />
          </Link>
          <nav className="gnb">
            <Link href="/jobs" className={`gnb-with-tag ${pathname === "/jobs" ? "gnb-active" : ""}`}>채용공고</Link>
            <button
              type="button"
              className="gnb-with-tag"
              style={{ background: "none", border: "none", cursor: "pointer" }}
              onClick={() => {
                if (!isLoggedIn) router.push("/signup/email");
                else if (ownerType === "company") router.push("/company/dashboard");
                else router.push("/profile/resume");
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
            <button className="icon-btn mob-hamburger" aria-label="이력서 등록" onClick={() => {
              if (!isLoggedIn) router.push("/signup/email");
              else if (ownerType === "company") router.push("/company/dashboard");
              else router.push("/profile/resume");
            }}>
              <FilePlus size={22} />
            </button>
          </div>
        </div>
      </header>


      
    </>
  );
}
