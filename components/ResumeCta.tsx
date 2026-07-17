"use client";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/authStore";

// 이력서 등록 CTA: 로그인/회원 유형에 따라 목적지 자동 분기
// - 로그아웃 → 회원가입(/signup/email)
// - 기업 회원 → 대시보드
// - 구직자 → 이력서 페이지(프로필 미완성 시 이력서 페이지가 프로필로 안내)
export default function ResumeCta({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { isLoggedIn, ownerType } = useAuthStore();
  const href = !isLoggedIn
    ? "/signup/email"
    : ownerType === "company"
    ? "/company/dashboard"
    : "/profile/resume";
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
