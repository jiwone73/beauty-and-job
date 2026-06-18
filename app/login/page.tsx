"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mail, Building2 } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useEffect, useState } from "react";

export default function LoginStartPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuthStore();
  const [tab, setTab] = useState<"personal" | "company">("personal");

  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/profile");
    }
  }, [isLoggedIn, router]);

  const handleKakao = () => {
    window.location.href = "/api/auth/kakao";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-5">
      <div className="w-full max-w-[400px]">
        {/* 로고 */}
        <div className="flex justify-center mb-6">
          <Link href="/"><Image src="/images/logo.png" alt="뷰티앤잡" width={140} height={40} priority /></Link>
        </div>

        {/* 슬로건 */}
        <h1 className="text-center text-[20px] font-bold text-[#1a1a1a] mb-2">
          뷰티 커리어의 시작과 성장
        </h1>
        <p className="text-center text-[14px] text-[#6b6b6b] mb-8">
          전문가 채용부터 업계 트렌드까지, 뷰티앤잡
        </p>

        {/* 탭 */}
        <div className="flex mb-8 border-b border-[#e0e0e0]">
          <button
            onClick={() => setTab("personal")}
            className={`flex-1 pb-3 text-[15px] font-semibold transition ${
              tab === "personal"
                ? "text-[#5f0080] border-b-2 border-[#5f0080]"
                : "text-[#9a9a9a]"
            }`}
          >
            개인회원
          </button>
          <button
            onClick={() => setTab("company")}
            className={`flex-1 pb-3 text-[15px] font-semibold transition ${
              tab === "company"
                ? "text-[#5f0080] border-b-2 border-[#5f0080]"
                : "text-[#9a9a9a]"
            }`}
          >
            기업회원
          </button>
        </div>

        {tab === "personal" && (
          <>
            {/* 카카오 */}
            <button
              onClick={handleKakao}
              className="w-full h-[52px] bg-[#FEE500] text-[#1a1a1a] rounded-lg font-semibold text-[15px] flex items-center justify-center gap-2 mb-3 hover:opacity-90 transition"
            >
              <span>💬</span>
              <span>카카오로 시작하기</span>
            </button>
            {/* 이메일 로그인 */}
            <Link href="/login/email">
              <button className="w-full h-[52px] bg-white border border-[#c0c0c0] text-[#1a1a1a] rounded-lg font-semibold text-[15px] hover:border-[#5f0080] hover:bg-[#fafafa] transition flex items-center justify-center gap-2">
                <Mail size={18} />
                <span>이메일로 로그인</span>
              </button>
            </Link>
            {/* 회원가입 */}
            <div className="mt-6 text-center">
              <span className="text-[13px] text-[#6b6b6b]">아직 회원이 아니신가요? </span>
              <Link href="/signup/email" className="text-[13px] text-[#5f0080] font-semibold hover:underline">
                회원가입하기
              </Link>
            </div>
          </>
        )}
        {tab === "company" && (
          <>
            {/* 기업 이메일 로그인 */}
            <Link href="/company/login">
              <button className="w-full h-[52px] bg-white border border-[#c0c0c0] text-[#1a1a1a] rounded-lg font-semibold text-[15px] hover:border-[#5f0080] hover:bg-[#fafafa] transition flex items-center justify-center gap-2">
                <Building2 size={18} />
                <span>이메일로 로그인</span>
              </button>
            </Link>
            {/* 기업 회원가입 */}
            <div className="mt-6 text-center">
              <span className="text-[13px] text-[#6b6b6b]">아직 회원이 아니신가요? </span>
              <Link href="/company/signup" className="text-[13px] text-[#5f0080] font-semibold hover:underline">
                회원가입하기
              </Link>
            </div>
          </>
        )}

        {/* 하단 약관 */}
        <div className="mt-12 flex justify-center gap-4 text-[12px] text-[#9a9a9a]">
          <Link href="/support/terms" className="hover:underline">이용약관</Link>
          <span>·</span>
          <Link href="/support/privacy" className="hover:underline">개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}