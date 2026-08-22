"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { setLoginPersistence } from "@/lib/auth/session";
import { ArrowLeft, Eye, EyeOff, Building2, KeyRound, UserSearch } from "lucide-react";
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

  // 이메일 로그인과 같은 규칙 — 둘 다 채우기 전에는 버튼을 잠가 둔다.
  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

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
      {/* 로고와 뒤로는 다른 로그인 화면과 같은 자리에 둔다 */}
      <header className="auth-header border-b border-[#f0f0f0]">
        <div className="mx-auto w-full max-w-[1060px] h-full flex items-center px-5">
          <Link href="/" className="inline-flex items-center">
            <Image src="/images/logo.png" className="auth-logo" alt="뷰티워크" width={140} height={36} />
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1060px] px-5 pt-4">
        <button
          onClick={() => router.back()}
          aria-label="뒤로"
          title="뒤로"
          className="-ml-1.5 inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6b6b6b] hover:bg-[#f5f5f5] hover:text-[#1a1a1a] transition"
        >
          <ArrowLeft size={26} />
        </button>
      </div>
      <div className="flex-1 flex justify-center px-5 pt-6 md:pt-10 pb-16">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[22px] md:text-[26px] font-normal text-[#1a1a1a] text-center mb-10">
            기업회원 로그인
          </h1>
          {/* 이메일 입력 */}
          <div className="mb-5">
            <label className="block text-[13px] md:text-[14px] text-[#6b6b6b] mb-2">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력해주세요"
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[15px] focus:outline-none focus:border-[#582681]"
              onKeyDown={(e) => e.key === "Enter" && canSubmit && handleLogin()}
            />
          </div>
          {/* 비밀번호 입력 */}
          <div className="mb-4">
            <label className="block text-[13px] md:text-[14px] text-[#6b6b6b] mb-2">비밀번호</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력해주세요"
                className="w-full h-[48px] px-4 pr-10 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[15px] focus:outline-none focus:border-[#582681]"
                onKeyDown={(e) => e.key === "Enter" && canSubmit && handleLogin()}
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
                className="w-4 h-4 accent-[#582681]"
              />
              로그인 저장하기
            </label>
          </div>
          {/* 에러 메시지 */}
          {error && (
            <p className="text-[13px] md:text-[14px] text-[#e74c3c] mb-3">{error}</p>
          )}
          {/* 로그인 버튼 */}
          <button
            onClick={handleLogin}
            disabled={!canSubmit}
            className="w-full h-[52px] rounded-lg font-normal text-[15px] mt-7 transition bg-[#582681] text-white hover:opacity-90 disabled:bg-[#f2f2f2] disabled:text-[#b0b0b0] disabled:hover:opacity-100"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
          {/* 아직 계정이 없는 기업의 갈래 — 이메일 로그인 화면과 같은 모양으로 둔다.
              첫 화면에서 '기업 회원으로 계속하기'로 온 신규가 여기서 길을 잃으면 안 된다. */}
          <div className="my-7 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#ececec]" />
            <span className="text-[12px] md:text-[13px] text-[#9a9a9a]">또는</span>
            <span className="h-px flex-1 bg-[#ececec]" />
          </div>

          <Link href="/company/signup">
            <button className="w-full h-[52px] bg-white border border-[#c0c0c0] text-[#582681] rounded-lg font-normal text-[15px] hover:border-[#582681] hover:bg-[#faf7fc] transition">
              기업회원으로 가입하기
            </button>
          </Link>

          {/* 하단 링크 — 아이콘은 14px, 글자와의 사이는 좁게 */}
          <div className="mt-8 flex flex-nowrap items-center justify-center gap-2 text-[12px] md:text-[13px] text-[#6b6b6b]">
            <Link href="/login/password-reset?type=company" className="inline-flex items-center gap-1 whitespace-nowrap hover:text-[#582681] hover:underline">
              <KeyRound size={14} /> 비밀번호 재설정
            </Link>
            <span className="text-[#d0d0d0]">·</span>
            <Link href="/company/login/find-account" className="inline-flex items-center gap-1 whitespace-nowrap hover:text-[#582681] hover:underline">
              <UserSearch size={14} /> 계정 찾기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}