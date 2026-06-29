"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, CheckCircle } from "lucide-react";

function PasswordResetRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountType = searchParams.get("type") === "company" ? "company" : "user";
  const isCompany = accountType === "company";
  const loginPath = isCompany ? "/company/login" : "/login/email";

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("올바른 이메일 형식이 아닙니다.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, accountType }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "오류가 발생했습니다.");
        return;
      }
      setSent(true);
    } catch (e) {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <header className="h-14 flex items-center px-4 border-b border-[#ececec]">
          <button onClick={() => router.push(loginPath)} className="p-2">
            <ChevronLeft size={22} />
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="w-full max-w-[400px] text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-[#f5ebfa] rounded-full flex items-center justify-center">
                <CheckCircle size={32} className="text-[#5f0080]" />
              </div>
            </div>
            <h1 className="text-[20px] font-bold text-[#1a1a1a] mb-3">
              이메일을 확인해주세요
            </h1>
            <p className="text-[14px] text-[#6b6b6b] leading-relaxed mb-2">
              <strong className="text-[#1a1a1a]">{email}</strong>으로<br />
              비밀번호 재설정 링크를 보냈어요
            </p>
            <p className="text-[13px] text-[#9a9a9a] mb-8">
              메일이 안 오면 스팸 메일함을 확인해주세요<br />
              링크는 30분간 유효합니다
            </p>
            <Link href={loginPath}>
              <button className="w-full h-[48px] bg-[#5f0080] text-white rounded-lg font-semibold text-[14px] hover:opacity-90 transition">
                로그인으로 돌아가기
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="h-14 flex items-center px-4 border-b border-[#ececec]">
        <button onClick={() => router.back()} className="p-2">
          <ChevronLeft size={22} />
        </button>
      </header>
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="w-full max-w-[400px]">
          <div className="flex justify-center mb-6">
            <Link href="/"><Image src="/images/logo.png" alt="뷰티워크" width={120} height={32} /></Link>
          </div>
          <h1 className="text-[22px] font-bold text-[#1a1a1a] text-center mb-3">
            {isCompany ? "기업 비밀번호 재설정" : "비밀번호 재설정"}
          </h1>
          <p className="text-[13px] text-[#6b6b6b] text-center mb-8">
            {isCompany ? "기업회원으로 가입하신 이메일을 입력해주세요" : "가입하신 이메일을 입력해주세요"}<br />
            비밀번호 재설정 링크를 보내드릴게요
          </p>
          <div className="mb-4">
            <label className="block text-[13px] text-[#6b6b6b] mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력해주세요"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]"
            />
          </div>
          {error && <p className="text-[13px] text-[#e74c3c] mb-3">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-[52px] mt-2 bg-[#5f0080] text-white rounded-lg font-semibold text-[15px] disabled:opacity-50 hover:opacity-90 transition"
          >
            {loading ? "발송 중..." : "재설정 메일 보내기"}
          </button>
          <div className="mt-6 text-center">
            <Link href={loginPath} className="text-[13px] text-[#6b6b6b] hover:text-[#5f0080] hover:underline">
              로그인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PasswordResetRequestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <PasswordResetRequestForm />
    </Suspense>
  );
}