"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";

export default function CompanyLoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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
      login({
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
            <Link href="/"><Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} /></Link>
          </div>

          <h1 className="text-[22px] font-bold text-[#1a1a1a] text-center mb-8">
            기업회원 로그인
          </h1>

          {/* 이메일 입력 */}
          <div className="mb-3">
            <label className="block text-[13px] text-[#6b6b6b] mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력해주세요"
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          {/* 비밀번호 입력 */}
          <div className="mb-2">
            <label className="block text-[13px] text-[#6b6b6b] mb-1.5">비밀번호</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력해주세요"
                className="w-full h-[48px] px-4 pr-10 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]"
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
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p className="text-[13px] text-[#e74c3c] mb-3">{error}</p>
          )}

          {/* 로그인 버튼 */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-[52px] bg-[#5f0080] text-white rounded-lg font-semibold text-[15px] mt-4 disabled:opacity-50 hover:opacity-90 transition"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>

          {/* 하단 링크 */}
          <div className="mt-6 flex justify-center gap-4 text-[13px] text-[#6b6b6b]">
            <Link href="/company/signup" className="hover:text-[#5f0080] hover:underline">
              기업회원 가입
            </Link>
            <span>·</span>
            <Link href="/login/password-reset" className="hover:text-[#5f0080] hover:underline">
              비밀번호 재설정
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}