"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuthStore } from "@/lib/store/authStore";
import { useSignupStore } from "@/lib/store/signupStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import { useApplicationStore } from "@/lib/store/applicationStore";

/** 프로필 계열 네 화면이 함께 쓰는 껍데기.
 *
 * PC 는 왼쪽 사이드 메뉴, 폰은 위쪽 탭 줄. 좁은 화면에는 사이드를 놓을
 * 자리가 없어서 둘을 갈랐다.
 *
 * 이력서는 여기 없다 — 헤더 메뉴로 올라간 별개의 화면이라, 여기 또 두면
 * 같은 곳으로 가는 길이 둘이 되고 어느 메뉴가 켜져야 할지도 어긋난다.
 */
const 메뉴 = [
  { href: "/profile", 글: "프로필" },
  { href: "/profile/applied", 글: "지원현황" },
  // 지원현황이 '내가 움직인 것'이면 이건 '상대가 움직인 것'이라 바로 옆에 둔다.
  { href: "/profile/proposals", 글: "받은 제안" },
  { href: "/profile/bookmarks", 글: "관심공고" },
];

// 사이드에서 고른 메뉴 이름. PC 는 사이드가 늘 옆에 있어 뭘 보고 있는지
// 안 잊어버리지만, 본문 자체에는 지금 무엇을 보는지 말하는 줄이 없었다.
const 메뉴제목: Record<string, string> = {
  "/profile": "프로필",
  "/profile/applied": "지원현황",
  "/profile/proposals": "받은 제안",
  "/profile/bookmarks": "관심공고",
  "/profile/notifications": "알림",
};

export default function ProfileShell({ children }: { children: React.ReactNode }) {
  // 사이드 맨 위는 「누구의 화면인가」를 말하는 자리다. 이름만 있으면 그 말이
  // 반만 된다 — 사진을 같이 둔다. 비공개로 둔 사진은 여기서도 기본 그림으로
  // 바꾼다(프로필 화면과 같은 규칙).
  const [아바타, set아바타] = useState<string | null>(null);
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && res.data?.avatar_url && res.data?.avatar_public !== false) {
          set아바타(res.data.avatar_url);
        }
      })
      .catch(() => {});
  }, []);

  const router = useRouter();
  const pathname = usePathname();
  const { logout, userName } = useAuthStore();
  const 현재제목 = pathname && 메뉴제목[pathname]
    ? 메뉴제목[pathname]
    : pathname?.startsWith("/profile/settings") ? "설정" : "";



  return (
    <main className="profile-page">
      {/* 프로필만 다른 머리줄을 쓸 이유가 없다. 톱니는 사이드에 '설정'이
          있으니 없앴고, 알림은 사이드 위로 옮겼다. */}
      <Header />

      {/* 폰 — 위쪽 탭 줄. 계정 설정은 여기 없다(톱니바퀴로 간다). 그 화면에서는
          켤 탭이 없으니 줄 자체를 접는다. */}
      {메뉴.some((m) => m.href === pathname) && (
      <div className="profile-tabs pf-mob">
        {메뉴.map((m) => (
          <button key={m.href} className={`profile-tab ${pathname === m.href ? "active" : ""}`}
            onClick={() => router.push(m.href)}>{m.글}</button>
        ))}
      </div>
      )}

      <div className="pf-body">
        <div className="pf-wrap">
        {/* PC — 왼쪽 사이드 메뉴. 계정 설정과 로그아웃은 선 아래에 둔다.
            보는 화면을 고르는 일과 계정을 다루는 일은 성격이 다르다. */}
        <nav className="pf-side">
          {/* 누구의 화면인지 사이드가 먼저 말한다. 기업 사이드도 맨 위에 이름과
              매장/본사를 세운다 — 두 화면의 짜임을 같게 둔다.
              구직유형은 가입 때 정하고 여기서 바꾸지 않는다(바꾸면 직군·스킬이
              통째로 어긋난다). 아래 '직군' 이 무엇을 뜻하는지 이 값이 정한다. */}
          {userName && (
            <div className="pf-side-me">
              <span className="pf-side-me-av">
                {아바타 ? <img src={아바타} alt={userName} /> : <span>👤</span>}
              </span>
              <span className="pf-side-me-name">{userName}</span>
            </div>
          )}
          {userName && <span className="pf-side-sep" />}
          {/* 알림은 머리줄 종으로 옮겼다. 사이드는 프로필 안에서만 보이는데
              알림은 어느 화면에 있든 봐야 하는 것이라 자리가 맞지 않았다.
              /profile/notifications 자체는 그대로 둔다 — 종에서 '전체 보기'로 온다. */}
          {메뉴.map((m) => (
            <Link key={m.href} href={m.href} className={pathname === m.href ? "on" : undefined}>
              {m.글}
            </Link>
          ))}
          <span className="pf-side-sep" />
          <Link href="/profile/settings" className={pathname === "/profile/settings" ? "on" : undefined}>
            설정
          </Link>
          <button type="button" className="pf-side-out" onClick={() => {
            useSignupStore.getState().reset();
            useProfileStore.getState().reset();
            useBookmarkStore.getState().reset();
            useApplicationStore.getState().reset();
            logout();
            router.push("/");
          }}>로그아웃</button>
        </nav>

        <div className="pf-main">
          {/* 사이드의 'HA JIWON' 과 같은 높이에 둔다 — 사이드에서 고른 값이
              본문 왼쪽 위에도 그대로 보여야 지금 무엇을 보는지 안 놓친다. */}
          {현재제목 && <h1 className="pf-main-title">{현재제목}</h1>}
          {children}
        </div>
        </div>
      </div>
    </main>
  );
}
