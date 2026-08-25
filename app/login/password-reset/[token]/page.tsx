"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react";
import { passwordError, PASSWORD_HINT } from "@/lib/password";

export default function PasswordResetTokenPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    const pwErr = passwordError(password);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "오류가 발생했습니다.");
        return;
      }
      setDone(true);
    } catch (e) {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <div className="flex-1 flex justify-center px-5 pt-6 md:pt-10 pb-16">
          <div className="w-full max-w-[400px] text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-[#f7f7f8] rounded-full flex items-center justify-center">
                <CheckCircle size={32} className="text-[#582681]" />
              </div>
            </div>
            <h1 className="text-[22px] md:text-[26px] font-normal text-[#1a1a1a] mb-3">
              비밀번호 변경 완료
            </h1>
            <p className="text-[14px] md:text-[15px] text-[#6b6b6b] mb-10">
              새 비밀번호로 다시 로그인해주세요
            </p>
            <Link href="/login/email">
              <button className="w-full h-[48px] bg-[#582681] text-white rounded-lg font-normal text-[14px] md:text-[15px] hover:opacity-90 transition">
                로그인하기
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          onClick={() => router.push("/login/email")}
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
            새 비밀번호 입력
          </h1>
          <p className="text-[13px] md:text-[14px] text-[#6b6b6b] text-center mb-10">
            새로 사용할 비밀번호를 입력해주세요
          </p>
          <div className="mb-4">
            <label className="block text-[13px] md:text-[14px] text-[#6b6b6b] mb-2">새 비밀번호</label>
            <div className="relative mb-2">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력해주세요"
                className="w-full h-[48px] px-4 pr-10 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[15px] focus:outline-none focus:border-[#582681]"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <input
              type={showPw ? "text" : "password"}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호 다시 입력"
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[15px] focus:outline-none focus:border-[#582681]"
            />
            <p className="text-[12px] md:text-[13px] text-[#9a9a9a] mt-1.5">
              {PASSWORD_HINT}
            </p>
          </div>
          {error && <p className="text-[13px] md:text-[14px] text-[#e74c3c] mt-3">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-[52px] mt-4 bg-[#582681] text-white rounded-lg font-normal text-[15px] disabled:opacity-50 hover:opacity-90 transition"
          >
            {loading ? "변경 중..." : "비밀번호 변경"}
          </button>
        </div>
      </div>
    </div>
  );
}
