"use client";
import { useEffect } from "react";

// 방문 1건 기록(하루 중복은 서버에서 제거). 관리자 페이지·SSR 제외, 실패 무시.
//
// referrer와 URL의 utm_* 값을 같이 보낸다 — 서버는 그날의 첫 핑(새 줄을 만들
// 때)에만 이 값으로 유입 채널을 정하고, 같은 날 재방문에는 손대지 않는다.
export default function VisitBeacon() {
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (window.location.pathname.startsWith("/admin")) return;
      const token = localStorage.getItem("access_token");
      const sp = new URLSearchParams(window.location.search);
      fetch("/api/visit", {
        method: "POST",
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          referrer: document.referrer || null,
          utm_source: sp.get("utm_source"),
          utm_medium: sp.get("utm_medium"),
          utm_campaign: sp.get("utm_campaign"),
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }, []);
  return null;
}
