"use client";
import Link from "next/link";
import Image from "next/image";
import { Search, Building2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/lib/store/authStore";

function AuthButtons() {
  const router = useRouter();
  const { isLoggedIn, userName, logout } = useAuthStore();
  const [open, setOpen] = useState(false);

  if (isLoggedIn) {
    return (
      <>
        <div className="auth-user-wrap">
          <button className="auth-user-btn" onClick={() => setOpen(!open)}>
            <span className="auth-avatar">
              {userName ? userName.slice(0, 1).toUpperCase() : "U"}
            </span>
            <span className="auth-username">{userName || "내 계정"}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 5l4 4 4-4" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          {open && (
            <div className="auth-dropdown">
              <button className="auth-dropdown-item" onClick={() => { setOpen(false); router.push("/profile"); }}>내 프로필</button>
              <button className="auth-dropdown-item" onClick={() => { setOpen(false); router.push("/profile/resume"); }}>이력서</button>
              <div className="auth-dropdown-divider" />
              <button className="auth-dropdown-item auth-logout" onClick={() => { logout(); setOpen(false); }}>로그아웃</button>
            </div>
          )}
        </div>
        <Link href="/company/login" className="btn btn-dark"><Building2 size={16} />기업 서비스</Link>
      </>
    );
  }

  return (
    <>
      <Link href="/login" className="btn btn-text">로그인</Link>
      <Link href="/signup" className="btn btn-primary">회원가입</Link>
      <Link href="/company/login" className="btn btn-dark"><Building2 size={16} />기업 서비스</Link>
    </>
  );
}

interface HeaderProps {
  onSearchClick?: () => void;
}

export default function Header({ onSearchClick }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="logo">
          <Image src="/images/logo.png" alt="뷰티앤잡" width={140} height={40} priority />
        </Link>
        <nav className="gnb">
          <Link href="/jobs" className={pathname === "/jobs" ? "gnb-active" : ""}>채용공고</Link>
          <Link href="/salary" className="gnb-with-tag">
            연봉어택<span className="tag tag-gray">경력직</span>
          </Link>
          <Link href="/insights" className="gnb-with-tag">
            인사이트<span className="tag tag-new">NEWS</span>
          </Link>
        </nav>
        <div className="header-right">
          <button className="icon-btn" aria-label="검색" onClick={onSearchClick}>
            <Search size={20} />
          </button>
          <AuthButtons />
        </div>
      </div>
    </header>
  );
}
