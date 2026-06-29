"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Eye, EyeOff, CheckCircle } from "lucide-react";

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

  const isPasswordValid = (pw: string) => {
    if (pw.length < 8 || pw.length > 16) return false;
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pw);
    return [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length >= 3;
  };

  const handleSubmit = async () => {
    if (!isPasswordValid(password)) {
      setError("비밀번호 규칙을 확인해주세요.");
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
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="w-full max-w-[400px] text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-[#f5ebfa] rounded-full flex items-center justify-center">
                <CheckCircle size={32} className="text-[#5f0080]" />
              </div>
            </div>
            <h1 className="text-[20px] font-bold text-[#1a1a1a] mb-3">
              비밀번호 변경 완료
            </h1>
            <p className="text-[14px] text-[#6b6b6b] mb-8">
              새 비밀번호로 다시 로그인해주세요
            </p>
            <Link href="/login/email">
              <button className="w-full h-[48px] bg-[#5f0080] text-white rounded-lg font-semibold text-[14px] hover:opacity-90 transition">
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
      <header className="h-14 flex items-center px-4 border-b border-[#ececec]">
        <button onClick={() => router.push("/login/email")} className="p-2">
          <ChevronLeft size={22} />
        </button>
      </header>
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="w-full max-w-[400px]">
          <div className="flex justify-center mb-6">
            <Link href="/"><Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} /></Link>
          </div>
          <h1 className="text-[22px] font-bold text-[#1a1a1a] text-center mb-2">
            새 비밀번호 입력
          </h1>
          <p className="text-[13px] text-[#6b6b6b] text-center mb-8">
            새로 사용할 비밀번호를 입력해주세요
          </p>
          <div className="mb-2">
            <label className="block text-[13px] text-[#6b6b6b] mb-1.5">새 비밀번호</label>
            <div className="relative mb-2">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력해주세요"
                className="w-full h-[48px] px-4 pr-10 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]"
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
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]"
            />
            <p className="text-[12px] text-[#9a9a9a] mt-1.5">
              영문 대소문자, 숫자, 특수문자를 3가지 이상으로 조합해 8~16자
            </p>
          </div>
          {error && <p className="text-[13px] text-[#e74c3c] mt-3">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-[52px] mt-4 bg-[#5f0080] text-white rounded-lg font-semibold text-[15px] disabled:opacity-50 hover:opacity-90 transition"
          >
            {loading ? "변경 중..." : "비밀번호 변경"}
          </button>
        </div>
      </div>
    </div>
  );
}
