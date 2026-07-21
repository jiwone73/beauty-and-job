"use client";
import { useEffect } from "react";

// 방문 1건 기록(하루 중복은 서버에서 제거). 관리자 페이지·SSR 제외, 실패 무시.
export default function VisitBeacon() {
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (window.location.pathname.startsWith("/admin")) return;
      const token = localStorage.getItem("access_token");
      fetch("/api/visit", {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }, []);
  return null;
}
