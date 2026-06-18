"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";

export default function KakaoCallbackPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const raw = document.cookie
      .split("; ")
      .find((c) => c.startsWith("kakao_auth="))
      ?.slice("kakao_auth=".length);

    if (!raw) {
      router.replace("/login?kakao_error=session");
      return;
    }

    document.cookie = "kakao_auth=; Max-Age=0; path=/";

    try {
      let b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const bin = atob(b64);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const json = new TextDecoder().decode(bytes);
      const data = JSON.parse(json);

      localStorage.setItem("access_token", data.access_token);
      login({
        ownerType: "user",
        userName: data.user.name,
        userPhone: data.user.phone,
        userJobType: data.user.job_type || "",
        userJobAreas: data.user.office_job_areas || [],
      });

      // ✅ 여기가 핵심 변경: job_type 없으면 온보딩, 있으면 프로필
      if (!data.user.job_type) {
        router.replace("/onboarding/job-type");
      } else {
        router.replace("/profile");
      }
    } catch (e) {
      console.error("[kakao parse]", e, raw);
      router.replace("/login?kakao_error=parse");
    }
  }, [router, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-[15px] text-[#6b6b6b]">로그인 처리 중...</p>
    </div>
  );
}