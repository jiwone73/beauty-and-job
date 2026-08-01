"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";

// 구직자(개인) 전용 경로 — 기업회원이 직접 들어오면 기업 대시보드로 되돌린다.
const SEEKER_ONLY = ["/profile"];

export default function RoleGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, ownerType } = useAuthStore();

  useEffect(() => {
    if (!isLoggedIn || !ownerType) return;
    const inSeekerOnly = SEEKER_ONLY.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (ownerType === "company" && inSeekerOnly) {
      router.replace("/company/dashboard");
    }
  }, [pathname, isLoggedIn, ownerType, router]);

  return null;
}
