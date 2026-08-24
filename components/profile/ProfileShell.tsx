"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import { Bell, X, Store, Building2, User, Send, Bookmark, Settings, LogOut } from "lucide-react";
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
  { href: "/profile", 글: "프로필", 그림: User },
  { href: "/profile/applied", 글: "지원현황", 그림: Send },
  { href: "/profile/bookmarks", 글: "관심공고", 그림: Bookmark },
];

export default function ProfileShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, userName, userJobType } = useAuthStore();
  const [unreadNotif, setUnreadNotif] = useState(0);

  const loadNotifs = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/users/me/notifications", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        // 개수만 쓴다 — 목록은 /profile/notifications 가 제 것을 불러온다.
        if (res.success && res.data) setUnreadNotif(res.data.unread || 0);
      })
      .catch((e) => console.error("[notifs]", e));
  };
  useEffect(() => { loadNotifs(); }, []);



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
        {/* PC — 왼쪽 사이드 메뉴. 계정 설정과 로그아웃은 선 아래에 둔다.
            보는 화면을 고르는 일과 계정을 다루는 일은 성격이 다르다. */}
        <nav className="pf-side">
          {/* 누구의 화면인지 사이드가 먼저 말한다. 기업 사이드도 맨 위에 이름과
              매장/본사를 세운다 — 두 화면의 짜임을 같게 둔다.
              구직유형은 가입 때 정하고 여기서 바꾸지 않는다(바꾸면 직군·스킬이
              통째로 어긋난다). 아래 '직군' 이 무엇을 뜻하는지 이 값이 정한다. */}
          {userName && (
            <div className="pf-side-me">
              <span className="pf-side-me-name">{userName}</span>
              {userJobType && (
                <span className="pf-side-me-type">
                  {userJobType === "STORE" ? <Store size={12} /> : <Building2 size={12} />}
                  {userJobType === "STORE" ? "매장" : "본사"}
                </span>
              )}
            </div>
          )}
          {userName && <span className="pf-side-sep" />}
          {/* 알림 — PC 는 본문에 편다. 사이드가 220px 이라 300px 짜리 판이 화면
              밖으로 잘렸고, 지원현황·관심공고는 본문에 펴는데 알림만 판으로 뜰
              이유도 없다(모바일은 지금 판 그대로 — 위 탭 줄에서 연다). */}
          <Link href="/profile/notifications" className={pathname === "/profile/notifications" ? "on" : undefined}>
            <Bell size={17} />알림
            {unreadNotif > 0 && <em className="pf-side-badge">{unreadNotif > 9 ? "9+" : unreadNotif}</em>}
          </Link>
          {메뉴.map((m) => (
            <Link key={m.href} href={m.href} className={pathname === m.href ? "on" : undefined}>
              <m.그림 size={17} />{m.글}
            </Link>
          ))}
          <span className="pf-side-sep" />
          <Link href="/profile/settings" className={pathname === "/profile/settings" ? "on" : undefined}>
            <Settings size={17} />설정
          </Link>
          <button type="button" className="pf-side-out" onClick={() => {
            useSignupStore.getState().reset();
            useProfileStore.getState().reset();
            useBookmarkStore.getState().reset();
            useApplicationStore.getState().reset();
            logout();
            router.push("/");
          }}><LogOut size={17} />로그아웃</button>
        </nav>

        <div className="pf-main">{children}</div>
      </div>
    </main>
  );
}
