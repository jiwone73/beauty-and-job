"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Building2, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useEffect, Suspense } from "react";

function LoginStartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn } = useAuthStore();

  // 카카오·네이버 화면에서 취소하거나 막히면 이 화면으로 돌아온다. 이유를 한 줄로 알려 준다.
  const socialError = (() => {
    const k = searchParams.get("kakao_error");
    const n = searchParams.get("naver_error");
    const code = k || n;
    if (!code) return "";
    const who = k ? "카카오" : "네이버";
    if (code === "cancelled") return `${who} 로그인을 취소했어요. 다른 방법으로도 시작할 수 있어요.`;
    if (code === "inactive") return "정지된 계정이에요. 고객센터로 문의해 주세요.";
    if (code === "not_configured") return `${who} 로그인은 준비 중이에요.`;
    return `${who} 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.`;
  })();

  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/profile");
    }
  }, [isLoggedIn, router]);

  const handleKakao = () => {
    window.location.href = "/api/auth/kakao";
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 상단 바: 로고는 왼쪽 위 고정 자리 — 화면마다 위치가 달라지지 않게 한다 */}
      <header className="h-14 flex items-center px-5 border-b border-[#f0f0f0]">
        <Link href="/" className="inline-flex items-center">
          <Image src="/images/logo.png" alt="뷰티워크" width={104} height={27} priority />
        </Link>
      </header>

      {/* 나가는 길 — 이력서 CTA 등으로 들어오면 여기가 막다른 화면이 된다.
          사이트 안에서 왔으면 뒤로, 새 탭·외부 유입이면 홈으로. */}
      <div className="px-5 pt-4">
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) router.back();
            else router.push("/");
          }}
          className="inline-flex items-center gap-1.5 text-[13px] md:text-[14px] text-[#6b6b6b] hover:text-[#1a1a1a]"
        >
          <ArrowLeft size={16} /> 취소하고 돌아가기
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 pb-14">
      <div className="w-full max-w-[400px]">
        {/* 슬로건 */}
        <h1 className="text-center text-[20px] font-normal text-[#1a1a1a] mb-2">
          뷰티 커리어의 시작과 성장
        </h1>
        <p className="text-center text-[14px] md:text-[15px] text-[#6b6b6b] mb-8">
          전문가 채용부터 업계 트렌드까지, 뷰티워크
        </p>

        {socialError && (
          <p className="mb-4 text-center text-[13px] md:text-[14px] text-[#e74c3c]">{socialError}</p>
        )}

        {/* 개인 로그인만 앞에 둔다 — 들어오는 사람 대부분이 구직자다.
            기업은 아래 링크로 보내고, 탭으로 먼저 고르게 하지 않는다. */}
        <button
          onClick={handleKakao}
          className="w-full h-[52px] bg-[#FEE500] text-[#1a1a1a] rounded-lg font-normal text-[15px] flex items-center justify-center gap-2 mb-3 hover:opacity-90 transition"
        >
          <span>💬</span>
          <span>카카오로 계속하기</span>
        </button>
        {/* 네이버 — 로그인용 앱 키가 준비된 환경에서만 보여 준다 */}
        {process.env.NEXT_PUBLIC_NAVER_LOGIN === "1" && (
          <button
            onClick={() => { window.location.href = "/api/auth/naver"; }}
            className="w-full h-[52px] bg-[#03C75A] text-white rounded-lg font-normal text-[15px] flex items-center justify-center gap-2 mb-3 hover:opacity-90 transition"
          >
            <span className="font-bold">N</span>
            <span>네이버로 계속하기</span>
          </button>
        )}
        <Link href="/login/email">
          <button className="w-full h-[52px] bg-white border border-[#c0c0c0] text-[#1a1a1a] rounded-lg font-normal text-[15px] hover:border-[#5f0080] hover:bg-[#fafafa] transition flex items-center justify-center gap-2">
            <Mail size={18} />
            <span>이메일로 계속하기</span>
          </button>
        </Link>

        {/* 보조 경로 — 처음 온 사람이 아니라 '길을 못 찾은 사람'에게 필요한 링크들 */}
        <div className="mt-7 flex items-center justify-center gap-3 text-[13px] md:text-[14px] text-[#6b6b6b]">
          <Link href="/login/find-account" className="hover:text-[#5f0080] hover:underline">계정 찾기</Link>
          <span className="text-[#e0e0e0]">|</span>
          <Link href="/company/login" className="hover:text-[#5f0080] hover:underline inline-flex items-center gap-1">
            <Building2 size={15} /> 기업 회원
          </Link>
        </div>

        {/* 하단 약관 */}
        <div className="mt-12 flex justify-center gap-4 text-[12px] md:text-[13px] text-[#9a9a9a]">
          <Link href="/support/terms" className="hover:underline">이용약관</Link>
          <span>·</span>
          <Link href="/support/privacy" className="hover:underline">개인정보처리방침</Link>
        </div>
      </div>
      </div>
    </div>
  );
}

// useSearchParams 는 Suspense 경계 안에서만 쓸 수 있다.
export default function LoginStartPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LoginStartContent />
    </Suspense>
  );
}
