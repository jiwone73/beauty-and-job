"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";

// 소셜 로그인 공통 착지 화면 — 서버가 심어 준 1회용 쿠키를 읽어 토큰을 옮긴다.
// 카카오는 예전 쿠키 이름(kakao_auth)을 그대로 쓰고 있어 둘 다 본다.
export default function SocialCallbackPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const read = (name: string) =>
      document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);
    const raw = read("social_auth") || read("kakao_auth");

    if (!raw) {
      router.replace("/login?social_error=session");
      return;
    }
    document.cookie = "social_auth=; Max-Age=0; path=/";
    document.cookie = "kakao_auth=; Max-Age=0; path=/";

    try {
      let b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const bin = atob(b64);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const data = JSON.parse(new TextDecoder().decode(bytes));

      localStorage.setItem("access_token", data.access_token);
      login({
        ownerType: "user",
        userName: data.user.name,
        userPhone: data.user.phone,
        userJobType: data.user.job_type || "",
        userJobAreas: data.user.office_job_areas || [],
      });

      // 직군을 아직 안 골랐거나 번호가 없으면 온보딩에서 마저 받는다.
      if (!data.user.job_type || !data.user.phone) {
        router.replace("/onboarding/job-type");
      } else {
        router.replace("/profile");
      }
    } catch (e) {
      console.error("[social parse]", e, raw);
      router.replace("/login?social_error=parse");
    }
  }, [router, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-[15px] text-[#6b6b6b]">로그인 처리 중...</p>
    </div>
  );
}
