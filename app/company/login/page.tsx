"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { setLoginPersistence } from "@/lib/auth/session";
import { ChevronLeft, Eye, EyeOff, Building2, KeyRound, UserSearch } from "lucide-react";
export default function CompanyLoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  // 매장 카운터처럼 여러 사람이 쓰는 PC를 염두에 두고 기본은 꺼 둔다.
  const [keepLogin, setKeepLogin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/company/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "로그인에 실패했습니다.");
        return;
      }
      localStorage.setItem("access_token", data.data.access_token);
      setLoginPersistence(keepLogin);
      login({
        ownerType: "company",
        userName: data.data.company.company_name,
        userPhone: data.data.company.phone || "",
      });
      router.push("/company/dashboard");
    } catch (e) {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 헤더 */}
      <header className="h-14 flex items-center px-4 border-b border-[#ececec]">
        <button onClick={() => router.back()} className="p-2">
          <ChevronLeft size={22} />
        </button>
      </header>
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="w-full max-w-[400px]">
          {/* 로고 */}
          <div className="flex justify-center mb-8">
            <Link href="/"><Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} /></Link>
          </div>
          <h1 className="text-[22px] md:text-[26px] font-normal text-[#1a1a1a] text-center mb-8">
            기업회원 로그인
          </h1>
          {/* 이메일 입력 */}
          <div className="mb-3">
            <label className="block text-[13px] md:text-[14px] text-[#6b6b6b] mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력해주세요"
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[15px] focus:outline-none focus:border-[#5f0080]"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          {/* 비밀번호 입력 */}
          <div className="mb-2">
            <label className="block text-[13px] md:text-[14px] text-[#6b6b6b] mb-1.5">비밀번호</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력해주세요"
                className="w-full h-[48px] px-4 pr-10 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[15px] focus:outline-none focus:border-[#5f0080]"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <label className="mt-2.5 inline-flex items-center gap-2 cursor-pointer text-[13px] md:text-[14px] text-[#3a3a3a] select-none">
              <input
                type="checkbox"
                checked={keepLogin}
                onChange={(e) => setKeepLogin(e.target.checked)}
                className="w-4 h-4 accent-[#5f0080]"
              />
              로그인 유지
            </label>
          </div>
          {/* 에러 메시지 */}
          {error && (
            <p className="text-[13px] md:text-[14px] text-[#e74c3c] mb-3">{error}</p>
          )}
          {/* 로그인 버튼 */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-[52px] bg-[#5f0080] text-white rounded-lg font-normal text-[15px] mt-4 disabled:opacity-50 hover:opacity-90 transition"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
          {/* 하단 링크 — 셋을 한 줄에 두므로 아이콘은 14px, 글자와의 사이는 좁게 */}
          <div className="mt-6 flex flex-nowrap items-center justify-center gap-2 text-[12px] md:text-[13px] text-[#6b6b6b]">
            <Link href="/company/signup" className="inline-flex items-center gap-1 whitespace-nowrap hover:text-[#5f0080] hover:underline">
              <Building2 size={14} /> 기업 회원가입
            </Link>
            <span className="text-[#d0d0d0]">·</span>
            <Link href="/login/password-reset?type=company" className="inline-flex items-center gap-1 whitespace-nowrap hover:text-[#5f0080] hover:underline">
              <KeyRound size={14} /> 비밀번호 재설정
            </Link>
            <span className="text-[#d0d0d0]">·</span>
            <Link href="/company/login/find-account" className="inline-flex items-center gap-1 whitespace-nowrap hover:text-[#5f0080] hover:underline">
              <UserSearch size={14} /> 계정 찾기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}