"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Building2 } from "lucide-react";
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
      <header className="auth-header border-b border-[#f0f0f0]">
        <div className="mx-auto w-full max-w-[1060px] h-full flex items-center px-5">
          <Link href="/" className="inline-flex items-center">
            <Image src="/images/logo.png" className="auth-logo" alt="뷰티워크" width={140} height={36} priority />
          </Link>
        </div>
      </header>

      {/* 여기는 로그인의 출발점이라 되돌아갈 앞 단계가 없다.
          나가려면 로고를 눌러 홈으로 가면 된다 — 별도 링크를 두지 않는다. */}

      {/* 다른 로그인 화면과 같이 위쪽 정렬 — 화면 높이에 따라 자리가 흔들리지 않는다 */}
      <div className="flex-1 flex justify-center px-5 pt-10 md:pt-14 pb-16">
      <div className="w-full max-w-[400px]">
        {/* 슬로건 */}
        <h1 className="text-[22px] md:text-[26px] font-normal text-[#555] text-center mb-3">
          뷰티 커리어의 시작과 성장
        </h1>
        {/* 여기 온 사람이 궁금한 건 '내 일자리가 있느냐'다 —
            매장과 본사 양쪽을 구체적으로 짚어 준다. */}
        <p className="text-center text-[14px] md:text-[15px] text-[#6b6b6b] leading-relaxed mb-11">
          살롱·샵 현장직부터 브랜드 본사까지<br />
          뷰티 업계 일자리를 한곳에서
        </p>

        {socialError && (
          <p className="mb-5 text-center text-[13px] md:text-[14px] text-[#e74c3c]">{socialError}</p>
        )}

        {/* 아래 '채용하시나요?'와 짝을 이루는 물음. 이게 없으면 위 세 버튼이
            누구 것인지 말해 주는 데가 없어, 아래까지 읽고 나서야 되짚게 된다.

            '개인회원'이라 쓰지 않는다. 사람들은 자기를 회원 종류로 생각하지
            않고 '일자리를 찾는 사람'으로 생각한다. 물음으로 걸어야 자기
            얘기로 읽힌다. */}
        <div className="mb-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#ececec]" />
          <span className="text-[12px] md:text-[13px] text-[#9a9a9a]">일자리를 찾으시나요?</span>
          <span className="h-px flex-1 bg-[#ececec]" />
        </div>

        {/* 개인 로그인을 앞에 둔다 — 들어오는 사람 대부분이 구직자다.
            기업은 아래 링크로 보내고, 탭으로 먼저 고르게 하지 않는다. */}
        <button
          onClick={handleKakao}
          className="w-full h-[52px] bg-[#FEE500] text-[#555] rounded-lg font-normal text-[15px] flex items-center justify-center gap-2 mb-4 hover:opacity-90 transition"
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
          <button className="w-full h-[52px] bg-white border border-[#c0c0c0] text-[#555] rounded-lg font-normal text-[15px] hover:border-[#582681] hover:bg-[#fafafa] transition flex items-center justify-center gap-2">
            <Mail size={18} />
            <span>이메일로 계속하기</span>
          </button>
        </Link>

        {/* 여기서 갈라놓지 않으면, 채용하러 온 사람이 위 버튼을 눌러
            개인 계정을 만들어 버린다. 그 이메일로는 기업 가입이 다시 안 된다.
            선을 그어 '다른 로그인 방법'이 아니라 '다른 사람'임을 드러낸다. */}
        <div className="my-7 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#ececec]" />
          <span className="text-[12px] md:text-[13px] text-[#9a9a9a]">채용하시나요?</span>
          <span className="h-px flex-1 bg-[#ececec]" />
        </div>

        <Link href="/company/login">
          <button className="w-full h-[52px] bg-white border border-[#efeff1] text-[#582681] rounded-lg font-normal text-[15px] hover:border-[#582681] hover:bg-[#f7f7f8] transition flex items-center justify-center gap-2">
            <Building2 size={18} />
            {/* 위 세 버튼과 같은 '계속하기' — 다른 건 무엇을 하느냐가 아니라 누구냐다.
                그 구분은 위의 선이 이미 하고 있다. '시작하기'는 신규만 부르는데,
                여기를 누르는 사람은 대개 이미 가입한 채용 담당자다. */}
            <span>기업회원으로 계속하기</span>
          </button>
        </Link>

        {/* 계정 찾기는 여기 두지 않는다 — 아직 아무도 막히지 않은 화면이다.
            막히는 곳은 이메일 로그인 화면이고 거기에 이미 있다.
            소셜로 가입한 사람에게는 이메일을 찾아 줘도 쓸 데가 없다. */}

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
