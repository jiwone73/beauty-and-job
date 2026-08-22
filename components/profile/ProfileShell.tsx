"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Settings, Bell, X } from "lucide-react";
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
  { href: "/profile/bookmarks", 글: "관심공고" },
];

export default function ProfileShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const loadNotifs = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/users/me/notifications", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setNotifs(res.data.notifications || []);
          setUnreadNotif(res.data.unread || 0);
        }
      })
      .catch((e) => console.error("[notifs]", e));
  };
  useEffect(() => { loadNotifs(); }, []);

  const handleNotifClick = async (n: any) => {
    const token = localStorage.getItem("access_token");
    if (!n.is_read && token) {
      await fetch(`/api/users/me/notifications/${n.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setNotifOpen(false);
    loadNotifs();
    if (n.related_type === "application") router.push("/profile/applied");
  };

  const markAllReadNotif = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch("/api/users/me/notifications", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    loadNotifs();
  };
  const deleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch(`/api/users/me/notifications/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    loadNotifs();
  };
  const deleteAllNotif = async () => {
    if (!confirm("모든 알림을 삭제할까요?")) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch("/api/users/me/notifications", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    loadNotifs();
  };

  return (
    <main className="profile-page">
    <header className="profile-header">
      <div className="profile-header-inner">
        <Link href="/" className="profile-logo">
          <Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} priority />
        </Link>

        <Link href="/jobs" className="profile-header-nav">채용공고</Link>
        <div style={{ position: "relative", display: "inline-flex", marginLeft: "auto" }}>
          <button
            className="profile-settings-btn"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="알림"
          >
            <Bell size={22} />
            {unreadNotif > 0 && <span className="company-notif-badge">{unreadNotif > 9 ? "9+" : unreadNotif}</span>}
          </button>
          {notifOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setNotifOpen(false)} />
              <div className="company-notif-dropdown" style={{ left: "auto", right: 0 }}>
                <div className="company-notif-head">
                  <span>알림</span>
                  <span style={{ display: "flex", gap: 10 }}>
                    {unreadNotif > 0 && <button onClick={markAllReadNotif} className="company-notif-readall">모두 읽음</button>}
                    {notifs.length > 0 && <button onClick={deleteAllNotif} className="company-notif-readall" style={{ color: "#999" }}>전체 삭제</button>}
                  </span>
                </div>
                <div className="company-notif-list">
                  {notifs.length === 0 ? (
                    <p className="company-notif-empty">새 알림이 없어요</p>
                  ) : (
                    notifs.map((n) => (
                      <div key={n.id} className={`company-notif-item ${n.is_read ? "" : "unread"}`}
                        onClick={() => handleNotifClick(n)} style={{ position: "relative" }}>
                        <span className="company-notif-title">{n.title}</span>
                        <span className="company-notif-msg">{n.message}</span>
                        <span className="company-notif-time">{new Date(n.created_at).toLocaleDateString("ko-KR")}</span>
                        <button onClick={(e) => deleteNotif(n.id, e)} aria-label="삭제"
                          style={{ position: "absolute", top: 10, right: 10, border: "none", background: "transparent", color: "#bbb", cursor: "pointer", padding: 2, lineHeight: 0 }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        {/* 톱니는 계정 설정으로 간다. 알림 설정만 열던 자리였는데, 톱니를
            보고 기대하는 것은 알림 하나가 아니라 계정 전반이다.
            알림 설정은 그 페이지 안으로 옮겼다. */}
        <Link
          href="/profile/settings"
          className="profile-settings-btn"
          aria-label="계정 설정"
        >
          <Settings size={22} />
        </Link>
      </div>
    </header>

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
          {메뉴.map((m) => (
            <Link key={m.href} href={m.href} className={pathname === m.href ? "on" : undefined}>{m.글}</Link>
          ))}
          <span className="pf-side-sep" />
          <Link href="/profile/settings" className={pathname === "/profile/settings" ? "on" : undefined}>계정 설정</Link>
          <button type="button" className="pf-side-out" onClick={() => {
            useSignupStore.getState().reset();
            useProfileStore.getState().reset();
            useBookmarkStore.getState().reset();
            useApplicationStore.getState().reset();
            logout();
            router.push("/");
          }}>로그아웃</button>
        </nav>

        <div className="pf-main">{children}</div>
      </div>
    </main>
  );
}
