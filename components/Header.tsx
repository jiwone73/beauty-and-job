"use client";
import Link from "next/link";
import Image from "next/image";
import { Search, Building2, FilePlus, LayoutDashboard, ChevronDown, MapPin } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import { useApplicationStore } from "@/lib/store/applicationStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { useSignupStore } from "@/lib/store/signupStore";
import { useAuthStore } from "@/lib/store/authStore";

function AuthButtons({ onLoginClick }: { onLoginClick: () => void }) {
  const router = useRouter();
  const { isLoggedIn, ownerType, userName, avatarUrl, setAvatar } = useAuthStore();

  // 헤더에서도 자기 얼굴을 본다. 개인은 프로필 사진, 기업은 대표 사진
  // (매장=공고 배너 첫 장, 본사=로고). 로그인 후 한 번만 읽어 스토어에 담아 둔다.
  useEffect(() => {
    if (!isLoggedIn || !ownerType) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    let alive = true;
    const url = ownerType === "company" ? "/api/company/me" : "/api/users/me";
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (!alive || !res.success) return;
        setAvatar(ownerType === "company" ? (res.data?.thumb_url || "") : (res.data?.avatar_url || ""));
      })
      .catch(() => { /* 아바타는 없어도 되는 정보라 조용히 넘어간다 */ });
    return () => { alive = false; };
  }, [isLoggedIn, ownerType, setAvatar]);

  if (isLoggedIn) {
    return (
      <>
        {/* 아바타를 누르면 바로 간다. 메뉴에 담긴 것이 '내 프로필·계정 설정'
            둘뿐이었는데, 그 둘을 보자고 한 번 더 누르게 하는 것은 낭비다.
            계정 설정과 로그아웃은 프로필 페이지 안으로 옮겼다. */}
        <div className="auth-user-wrap">
          <button className="auth-user-btn" aria-label={ownerType === "company" ? "기업 대시보드" : "내 프로필"}
            onClick={() => router.push(ownerType === "company" ? "/company/dashboard" : "/profile")}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName ? `${userName} 프로필` : "프로필"}
                style={{ width: 32, height: 32, borderRadius: ownerType === "company" ? 7 : "50%", objectFit: "cover", display: "block", background: "#f3e5f5" }} />
            ) : (
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="16" fill="#f3e5f5"/>
                <circle cx="16" cy="13" r="5" fill="#582681"/>
                <path d="M6 28c0-5.5 4.5-9 10-9s10 3.5 10 9" fill="#582681"/>
              </svg>
            )}
          </button>
        </div>
        {/* 이미 로그인한 기업에게 '기업 서비스' 소개 페이지는 의미가 없다. 돌아갈 자리로 바꾼다. */}
        {ownerType === "company" ? (
          <Link href="/company/dashboard" className="btn btn-outline-biz gnb-biz-btn">
            대시보드로 <ChevronDown size={14} style={{ transform: "rotate(-90deg)" }} />
          </Link>
        ) : (
          <Link href="/company" className="btn btn-outline-biz gnb-biz-btn">
            기업 서비스 <ChevronDown size={14} />
          </Link>
        )}
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
  const isCompany = isLoggedIn && ownerType === "company";
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
            {/* 목록과 지도는 같은 공고를 보는 두 방식이라 나란히 둔다. 이름은
                수단(지도)이 아니라 이득(가까움)을 말한다 — 구직자가 원하는 건
                지도가 아니라 다닐 만한 거리의 일자리다. 무엇으로 보여주는지는
                핀 아이콘이 대신 말한다. */}
            <Link href="/jobs/nearby" className={`gnb-with-tag gnb-shine ${pathname === "/jobs/nearby" ? "gnb-active" : ""}`}>
              <MapPin size={15} style={{ flexShrink: 0 }} />
              {/* 새 기능이라 눈에 걸려야 한다. 딱지를 달면 메뉴 줄이 길어지고
                  글자보다 딱지가 먼저 읽히므로, 글자 자체에 빛을 흘린다. */}
              <span className="gnb-shine-t">내 주변 공고</span>
            </Link>
            {/* 이력서는 구직자가 가장 자주 손대는 것인데 프로필 안 두 단계에
                있었다. 메뉴로 올려 지름길을 낸다. 프로필에서 '현재 프로필로
                이력서 만들기'로 넘어가는 길은 그대로 두어, 처음 온 사람의
                순서(프로필 → 이력서)는 흐트러지지 않는다. */}
            <Link href="/profile/resume" className={`gnb-with-tag ${pathname === "/profile/resume" ? "gnb-active" : ""}`}>
              이력서
            </Link>
            <Link href="/stories" className="gnb-with-tag">
              현장이야기
            </Link>
          </nav>
          <div className="header-right">
            <button className="icon-btn" aria-label="검색" onClick={handleSearch}>
              <Search size={20} />
            </button>
            <AuthButtons onLoginClick={() => router.push("/login")} />
            <button className="icon-btn mob-hamburger" aria-label={isCompany ? "기업 대시보드" : "이력서 등록"}
              onClick={() => router.push(isCompany ? "/company/dashboard" : isLoggedIn ? "/profile/resume" : "/login")}>
              {isCompany ? <LayoutDashboard size={22} /> : <FilePlus size={22} />}
            </button>
          </div>
        </div>
      </header>


      
    </>
  );
}
