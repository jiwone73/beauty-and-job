"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Building2, UserSearch } from "lucide-react";
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
      {/* 상단 바: 로고는 화면 맨 왼쪽이 아니라 가운데 컨테이너의 왼쪽에 붙인다.
          아래 '돌아가기'와 세로줄이 맞고, 화면마다 위치가 달라지지 않는다. */}
      <header className="h-14 border-b border-[#f0f0f0]">
        <div className="mx-auto w-full max-w-[1060px] h-full flex items-center px-5">
          <Link href="/" className="inline-flex items-center">
            <Image src="/images/logo.png" alt="뷰티워크" width={104} height={27} priority />
          </Link>
        </div>
      </header>

      {/* 여기는 로그인의 출발점이라 되돌아갈 앞 단계가 없다.
          나가려면 로고를 눌러 홈으로 가면 된다 — 별도 링크를 두지 않는다. */}

      <div className="flex-1 flex items-center justify-center px-5 pb-14">
      <div className="w-full max-w-[400px]">
        {/* 슬로건 */}
        <h1 className="text-center text-[22px] font-bold text-[#1a1a1a] mb-3">
          뷰티 커리어의 시작과 성장
        </h1>
        {/* 여기 온 사람이 궁금한 건 '내 일자리가 있느냐'다 —
            매장과 오피스 양쪽을 구체적으로 짚어 준다. */}
        <p className="text-center text-[14px] md:text-[15px] text-[#6b6b6b] leading-relaxed mb-11">
          살롱·샵 현장직부터 브랜드 본사까지<br />
          뷰티 업계 일자리를 한곳에서
        </p>

        {socialError && (
          <p className="mb-5 text-center text-[13px] md:text-[14px] text-[#e74c3c]">{socialError}</p>
        )}

        {/* 개인 로그인만 앞에 둔다 — 들어오는 사람 대부분이 구직자다.
            기업은 아래 링크로 보내고, 탭으로 먼저 고르게 하지 않는다. */}
        <button
          onClick={handleKakao}
          className="w-full h-[52px] bg-[#FEE500] text-[#1a1a1a] rounded-lg font-normal text-[15px] flex items-center justify-center gap-2 mb-4 hover:opacity-90 transition"
        >
          <span>💬</span>
          <span>카카오로 계속하기</span>
        </button>
        {/* 네이버 — 로그인용 앱 키가 준비된 환경에서만 보여 준다 */}
        {process.env.NEXT_PUBLIC_NAVER_LOGIN === "1" && (
          <button
            onClick={() => { window.location.href = "/api/auth/naver"; }}
            className="w-full h-[52px] bg-[#03C75A] text-white rounded-lg font-normal text-[15px] flex items-center justify-center gap-2 mb-4 hover:opacity-90 transition"
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
        <div className="mt-9 flex items-center justify-center gap-3 text-[13px] md:text-[14px] text-[#6b6b6b]">
          <Link href="/login/find-account" className="hover:text-[#5f0080] hover:underline inline-flex items-center gap-1">
            <UserSearch size={15} /> 계정 찾기
          </Link>
          <span className="text-[#e0e0e0]">|</span>
          <Link href="/company/login" className="hover:text-[#5f0080] hover:underline inline-flex items-center gap-1">
            <Building2 size={15} /> 기업 회원
          </Link>
        </div>

        {/* 하단 약관 */}
        <div className="mt-14 flex justify-center gap-4 text-[12px] md:text-[13px] text-[#9a9a9a]">
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
