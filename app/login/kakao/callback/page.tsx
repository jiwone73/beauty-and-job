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
      ?.split("=")[1];

    if (!raw) {
      router.replace("/login?kakao_error=session");
      return;
    }

    // 쿠키 즉시 폐기
    document.cookie = "kakao_auth=; Max-Age=0; path=/";

    try {
      const data = JSON.parse(decodeURIComponent(raw));
      localStorage.setItem("access_token", data.access_token);
      login({
        ownerType: "user",
        userName: data.user.name,
        userPhone: data.user.phone,
        userJobType: data.user.job_type || "",
        userJobAreas: data.user.office_job_areas || [],
      });
      router.replace("/profile");
    } catch (e) {
      router.replace("/login?kakao_error=parse");
    }
  }, [router, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-[15px] text-[#6b6b6b]">로그인 처리 중...</p>
    </div>
  );
}