// app/company/login/find-account/page.tsx
"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function CompanyFindAccountPage() {
  const router = useRouter();
  const [bizNum, setBizNum] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ found: boolean; email?: string } | null>(null);

  const handleFind = async () => {
    if (!bizNum.trim()) {
      setError("사업자등록번호를 입력해주세요.");
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/find-company-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_number: bizNum }),
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

          <h1 className="text-[22px] font-bold text-[#1a1a1a] text-center mb-2">
            기업 계정 찾기
          </h1>
          <p className="text-center text-[13px] text-[#6b6b6b] mb-8">
            가입 시 등록한 사업자등록번호로<br />가입된 이메일을 찾아드려요.
          </p>

          {/* 사업자등록번호 */}
          <div className="mb-2">
            <label className="block text-[13px] text-[#6b6b6b] mb-1.5">사업자등록번호</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={12}
              value={bizNum}
              onChange={(e) => setBizNum(e.target.value)}
              placeholder="10자리 숫자 (- 없이 입력)"
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]"
              onKeyDown={(e) => e.key === "Enter" && handleFind()}
            />
          </div>

          {/* 에러 */}
          {error && <p className="text-[13px] text-[#e74c3c] mb-3">{error}</p>}

          {/* 찾기 버튼 */}
          <button
            onClick={handleFind}
            disabled={loading}
            className="w-full h-[52px] bg-[#5f0080] text-white rounded-lg font-semibold text-[15px] mt-4 disabled:opacity-50 hover:opacity-90 transition"
          >
            {loading ? "조회 중..." : "이메일 찾기"}
          </button>

          {/* 결과: 매칭됨 */}
          {result?.found && (
            <div className="mt-6 p-5 bg-[#faf5ff] border border-[#e9d5ff] rounded-lg text-center">
              <p className="text-[13px] text-[#6b6b6b] mb-1">가입하신 이메일이에요</p>
              <p className="text-[18px] font-bold text-[#5f0080] mb-4">{result.email}</p>
              <Link href="/company/login">
                <button className="w-full h-[46px] bg-[#5f0080] text-white rounded-lg font-semibold text-[14px] hover:opacity-90 transition">
                  로그인하러 가기
                </button>
              </Link>
            </div>
          )}

          {/* 결과: 매칭 없음 */}
          {result && !result.found && (
            <div className="mt-6 p-5 bg-[#f8f8f8] border border-[#e8e8e8] rounded-lg text-center">
              <p className="text-[14px] text-[#1a1a1a] font-semibold mb-1">일치하는 계정이 없어요</p>
              <p className="text-[13px] text-[#6b6b6b] mb-4">
                입력하신 사업자등록번호로 가입된 계정을 찾을 수 없습니다.
              </p>
              <Link href="/company/signup" className="text-[13px] text-[#5f0080] font-semibold hover:underline">
                기업회원 가입하러 가기
              </Link>
            </div>
          )}

          {/* 하단 링크 */}
          <div className="mt-6 flex flex-nowrap items-center justify-center gap-2 text-[12px] text-[#6b6b6b]">
            <Link href="/company/login" className="whitespace-nowrap hover:text-[#5f0080] hover:underline">
              로그인
            </Link>
            <span className="text-[#d0d0d0]">·</span>
            <Link href="/login/password-reset" className="whitespace-nowrap hover:text-[#5f0080] hover:underline">
              비밀번호 재설정
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}