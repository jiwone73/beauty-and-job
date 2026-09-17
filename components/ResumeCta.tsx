"use client";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/authStore";

// 이력서 등록 CTA: 로그인/회원 유형에 따라 목적지 자동 분기
// - 로그아웃 → /login. 여기는 로그인 벽이 아니라 출발점이다 — 카카오·네이버·
//   이메일이 다 있고, 소셜은 가입과 로그인이 한 동작이라 처음 온 사람도
//   막히지 않는다. /signup/email 로 보내면 이메일 갈래 하나로 좁아진다.
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
    ? "/login"
    : ownerType === "company"
    ? "/company/dashboard"
    : "/profile/resume";
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
