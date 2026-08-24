"use client";
import Link from "next/link";
import Image from "next/image";
import { Building2, FilePlus, LayoutDashboard, ChevronDown, MapPin } from "lucide-react";
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
  // 로고 주소가 죽어 있으면 브라우저가 깨진 그림(?)을 그린다. 기본 그림으로 물러선다.
  const [그림깨짐, set그림깨짐] = useState(false);
  useEffect(() => { set그림깨짐(false); }, [avatarUrl]);

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
    // 헤더 아바타는 걷었다 — 개인은 사이드 맨 위에, 기업은 사이드 로고에 같은
    //   사진이 이미 서 있어 한 화면에 두 번 나왔다.
    // 개인 회원에게 '기업 서비스' 소개는 볼 일이 없다. 기업 회원에게만 남긴다
    //   (대시보드는 사이드 로고가 맡으니 여기는 요금·기능 소개 자리).
    if (ownerType !== "company") return null;
    return (
      <Link href="/company" className="btn btn-outline-biz gnb-biz-btn">
        기업 서비스 <ChevronDown size={14} />
      </Link>
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

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, ownerType } = useAuthStore();
  const isCompany = isLoggedIn && ownerType === "company";
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
