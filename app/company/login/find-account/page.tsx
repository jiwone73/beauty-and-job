// app/company/login/find-account/page.tsx
"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, LogIn, Building2 } from "lucide-react";

export default function CompanyFindAccountPage() {
  const router = useRouter();
  const [bizNum, setBizNum] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ found: boolean; email?: string } | null>(null);

  const handleFind = async () => {
    if (!bizNum.trim() || !password.trim()) {
      setError("사업자등록번호와 비밀번호를 모두 입력해주세요.");
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/find-company-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_number: bizNum, password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "조회에 실패했습니다.");
        return;
      }
      setResult(data.data);
    } catch (e) {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 로고와 뒤로는 다른 로그인 화면과 같은 자리에 둔다 */}
      <header className="h-14 border-b border-[#f0f0f0]">
        <div className="mx-auto w-full max-w-[1060px] h-full flex items-center px-5">
          <Link href="/" className="inline-flex items-center">
            <Image src="/images/logo.png" alt="뷰티워크" width={104} height={27} />
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

          <h1 className="text-[22px] md:text-[26px] font-normal text-[#1a1a1a] text-center mb-3">
            기업 계정 찾기
          </h1>
          <p className="text-center text-[13px] md:text-[14px] text-[#6b6b6b] mb-10">
            가입 시 등록한 사업자등록번호와 비밀번호로<br />가입된 이메일을 확인하세요.
          </p>

          {/* 사업자등록번호 */}
          <div className="mb-5">
            <label className="block text-[13px] md:text-[14px] text-[#6b6b6b] mb-2">사업자등록번호</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={12}
              value={bizNum}
              onChange={(e) => setBizNum(e.target.value)}
              placeholder="10자리 숫자 (- 없이 입력)"
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[15px] focus:outline-none focus:border-[#5f0080]"
            />
          </div>

          {/* 비밀번호 */}
          <div className="mb-4">
            <label className="block text-[13px] md:text-[14px] text-[#6b6b6b] mb-2">비밀번호</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="가입 시 설정한 비밀번호"
                className="w-full h-[48px] px-4 pr-10 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[15px] focus:outline-none focus:border-[#5f0080]"
                onKeyDown={(e) => e.key === "Enter" && handleFind()}
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

          {/* 에러 */}
          {error && <p className="text-[13px] md:text-[14px] text-[#e74c3c] mb-3">{error}</p>}

          {/* 찾기 버튼 */}
          <button
            onClick={handleFind}
            disabled={loading}
            className="w-full h-[52px] bg-[#5f0080] text-white rounded-lg font-normal text-[15px] mt-7 disabled:opacity-50 hover:opacity-90 transition"
          >
            {loading ? "조회 중..." : "이메일 찾기"}
          </button>

          {/* 결과: 확인됨 */}
          {result?.found && (
            <div className="mt-6 p-5 bg-[#faf5ff] border border-[#e9d5ff] rounded-lg text-center">
              <p className="text-[13px] md:text-[14px] text-[#6b6b6b] mb-1">가입하신 이메일이에요</p>
              <p className="text-[18px] font-normal text-[#5f0080] mb-4 break-all">{result.email}</p>
              <Link href="/company/login">
                <button className="w-full h-[46px] bg-[#5f0080] text-white rounded-lg font-normal text-[14px] md:text-[15px] hover:opacity-90 transition">
                  로그인하러 가기
                </button>
              </Link>
            </div>
          )}

          {/* 결과: 불일치 */}
          {result && !result.found && (
            <div className="mt-6 p-5 bg-[#f8f8f8] border border-[#e8e8e8] rounded-lg text-center">
              <p className="text-[14px] md:text-[15px] text-[#1a1a1a] font-normal mb-1">정보가 일치하지 않아요</p>
              <p className="text-[13px] md:text-[14px] text-[#6b6b6b] mb-4">
                사업자등록번호 또는 비밀번호를 다시 확인해주세요.<br />
                비밀번호도 기억나지 않으시면 고객센터로 문의해주세요.
              </p>
              <Link href="/about/contact" className="text-[13px] md:text-[14px] text-[#5f0080] font-normal hover:underline">
                고객센터 문의하기
              </Link>
            </div>
          )}

          {/* 하단 링크 — 기업 로그인과 같은 아이콘·크기를 쓴다 */}
          <div className="mt-8 flex flex-nowrap items-center justify-center gap-2 text-[12px] md:text-[13px] text-[#6b6b6b]">
            <Link href="/company/login" className="inline-flex items-center gap-1 whitespace-nowrap hover:text-[#5f0080] hover:underline">
              <LogIn size={14} /> 로그인
            </Link>
            <span className="text-[#d0d0d0]">·</span>
            <Link href="/company/signup" className="inline-flex items-center gap-1 whitespace-nowrap hover:text-[#5f0080] hover:underline">
              <Building2 size={14} /> 기업 회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}