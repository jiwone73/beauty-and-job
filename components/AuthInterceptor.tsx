"use client";
import { useEffect } from "react";

export default function AuthInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch;
    let handling = false; // 중복 처리 방지

    // 토큰 상태. '없음'과 '만료'는 다르다 — 없는 것은 아직 로그인을 안 한
    // 것뿐이라 내쫓을 이유가 없다. 예전에는 없는 것도 만료로 봐서, 관리자가
    // 사이트를 구경하다 401 이 한 번 나면 관리자 로그인까지 풀렸다.
    const 토큰상태 = (key: string): "없음" | "유효" | "만료" => {
      try {
        const t = localStorage.getItem(key);
        if (!t) return "없음";
        const payload = JSON.parse(atob(t.split(".")[1]));
        if (!payload?.exp) return "만료";
        return payload.exp * 1000 < Date.now() ? "만료" : "유효";
      } catch {
        return "만료";
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

      // API 호출인데 401 → "토큰이 실제로 만료됐을 때만" 세션 만료로 처리
      // (토큰이 유효한데 난 401은 권한 문제 등이므로 세션을 보존)
      const path0 = window.location.pathname;
      const tokenKey = path0.startsWith("/admin") ? "admin_token" : "access_token";
      const expired = 토큰상태(tokenKey) === "만료";
      if (res.status === 401 && isApi && !isAuthEndpoint && !handling && expired) {
        handling = true;

        const path = window.location.pathname;

        // 어느 영역인지에 따라 적절한 로그인 화면으로
        const isCompany = path.startsWith("/company");
        const isAdmin = path.startsWith("/admin");

        // 만료된 쪽만 지운다. 관리자 화면 밖에서 admin_token 까지 지우면,
        // 사이트를 구경하러 나갔다가 관리자 로그인이 같이 풀린다.
        try {
          localStorage.removeItem(tokenKey);
          if (tokenKey === "access_token") {
            localStorage.removeItem("beautynjob-auth");
            localStorage.removeItem("beautynjob-profile");
            localStorage.removeItem("beautynjob-applications");
          }
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