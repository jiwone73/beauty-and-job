"use client";
import Link from "next/link";
import Image from "next/image";
import { Search, Building2, Menu, X, ChevronDown } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { useSignupStore } from "@/lib/store/signupStore";
import { useAuthStore } from "@/lib/store/authStore";
import LoginModal from "@/components/LoginModal";

function AuthButtons({ onLoginClick }: { onLoginClick: () => void }) {
  const router = useRouter();
  const { isLoggedIn, userName, logout } = useAuthStore();
  const [open, setOpen] = useState(false);

  if (isLoggedIn) {
    return (
      <>
        <div className="auth-user-wrap">
          <button className="auth-user-btn" onClick={() => setOpen(!open)}>
            <span className="auth-avatar auth-pc">{userName ? userName.slice(0,1).toUpperCase() : "U"}</span>
            <span className="auth-username auth-pc">{userName || "내 계정"}</span>
            <svg className="auth-pc" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 5l4 4 4-4" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <svg className="auth-mob" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </button>
          {open && (
            <div className="auth-dropdown auth-dropdown-right">
              <button className="auth-dropdown-item" onClick={() => { setOpen(false); router.push("/profile"); }}>내 프로필</button>
              <button className="auth-dropdown-item" onClick={() => { setOpen(false); router.push("/profile/resume"); }}>이력서</button>
              <div className="auth-dropdown-divider" />
              <button className="auth-dropdown-item auth-logout" onClick={() => { useSignupStore.getState().reset(); logout(); setOpen(false); }}>로그아웃</button>
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
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleSearch = () => {
    if (onSearchClick) onSearchClick();
    else router.push("/jobs");
  };

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <Image src="/images/logo.png" alt="뷰티앤잡" width={140} height={40} priority />
          </Link>
          <nav className="gnb">
            <Link href="/jobs" className={pathname === "/jobs" ? "gnb-active" : ""}>채용공고</Link>
            <Link href="/profile/resume" className="gnb-with-tag">
              이력서 등록
            </Link>
            <Link href="/insights" className="gnb-with-tag">
              뷰티 인사이트
            </Link>
          </nav>
          <div className="header-right">
            <button className="icon-btn" aria-label="검색" onClick={handleSearch}>
              <Search size={20} />
            </button>
            <AuthButtons onLoginClick={() => setShowModal(true)} />
            <button className="icon-btn mob-hamburger" aria-label="메뉴" onClick={() => setMenuOpen(true)}>
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* 로그인 모달 */}
      {showModal && <LoginModal onClose={() => setShowModal(false)} />}

      {/* 햄버거 메뉴 */}
      {menuOpen && (
        <div className="mob-menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="mob-menu-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mob-menu-head">
              <span className="mob-menu-title">메뉴</span>
              <button className="mob-menu-close" onClick={() => setMenuOpen(false)}><X size={22} /></button>
            </div>
            <nav className="mob-menu-nav">
              <Link href="/profile/resume" className="mob-menu-item" onClick={() => setMenuOpen(false)}>
                <span className="mob-menu-item-label">이력서 등록</span>
                <span className="mob-menu-badge gray">경력직</span>
              </Link>
              <Link href="/brands" className="mob-menu-item" onClick={() => setMenuOpen(false)}>
                <span className="mob-menu-item-label">회사 탐색</span>
              </Link>
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
