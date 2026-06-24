"use client";
import { useEffect } from "react";

export default function AuthInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch;
    let handling = false; // 중복 처리 방지

    // 토큰이 실제로 만료됐는지 확인 (없거나 깨졌으면 만료로 간주)
    const isTokenExpired = (key: string) => {
      try {
        const t = localStorage.getItem(key);
        if (!t) return true;
        const payload = JSON.parse(atob(t.split(".")[1]));
        if (!payload?.exp) return true;
        return payload.exp * 1000 < Date.now();
      } catch {
        return true;
      }
    };

    window.fetch = async (...args) => {
      const res = await originalFetch(...args);

      // 응답 URL 파악
      let url = "";
      try {
        const input = args[0];
        url = typeof input === "string" ? input : (input as Request)?.url || (input as URL)?.toString() || "";
      } catch { /* noop */ }

      const isApi = url.includes("/api/");
      const isAuthEndpoint = url.includes("/api/auth/"); // 로그인·회원가입 등은 제외
      const isAdminLogin = url.includes("/api/auth/admin");

      // API 호출인데 401 → "토큰이 실제로 만료됐을 때만" 세션 만료로 처리
      // (토큰이 유효한데 난 401은 권한 문제 등이므로 세션을 보존)
      const path0 = window.location.pathname;
      const tokenKey = path0.startsWith("/admin") ? "admin_token" : "access_token";
      const expired = isTokenExpired(tokenKey);
      if (res.status === 401 && isApi && !isAuthEndpoint && !handling && expired) {
        handling = true;

        const path = window.location.pathname;

        // 어느 영역인지에 따라 적절한 로그인 화면으로
        const isCompany = path.startsWith("/company");
        const isAdmin = path.startsWith("/admin");

        // 토큰 + zustand 인증/프로필 상태 모두 정리
        try {
          localStorage.removeItem("access_token");
          localStorage.removeItem("admin_token");
          localStorage.removeItem("beautynjob-auth");
          localStorage.removeItem("beautynjob-profile");
          localStorage.removeItem("beautynjob-applications");
        } catch { /* noop */ }

        // 이미 로그인 화면이면 알림 생략
        const onLoginPage = path.includes("/login");

        if (!onLoginPage) {
          alert("로그인 세션이 만료되었어요. 다시 로그인해주세요.");
          if (isAdmin) {
            window.location.href = "/admin/login";
          } else if (isCompany) {
            window.location.href = "/company/login";
          } else {
            window.location.href = "/login";
          }
        }
      }

      return res;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}