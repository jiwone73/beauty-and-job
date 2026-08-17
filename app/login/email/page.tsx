"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { setLoginPersistence } from "@/lib/auth/session";
import { ArrowLeft, Eye, EyeOff, KeyRound, UserSearch } from "lucide-react";

// 이메일 하나로 로그인·가입을 함께 처리한다.
//  1단계: 이메일을 받아 계정이 있는지 본다
//  2단계: 있으면 비밀번호, 없으면 가입 화면으로 (이미 입력한 이메일을 들고 간다)
// 소셜로만 만든 계정은 비밀번호가 없으므로 그 소셜 버튼을 안내한다.
export default function LoginEmailPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  // 끄면 브라우저를 닫을 때 로그아웃된다. 공용 PC를 염두에 두고 기본은 꺼 둔다.
  const [keepLogin, setKeepLogin] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ text: string; providers: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleContinue = async () => {
    const v = email.trim();
    if (!EMAIL_RE.test(v)) {
      setError("이메일 형식을 다시 확인해주세요.");
      return;
    }
    setError("");
    setNotice(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(v)}&scope=user`);
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "확인에 실패했습니다.");
        return;
      }
      const { available, kind, hasPassword, providers } = data.data;

      if (available) {
        router.push(`/signup/email?email=${encodeURIComponent(v)}`);
        return;
      }
      if (kind === "company") {
        setNotice({ text: "기업회원으로 가입된 이메일이에요. 기업 로그인으로 이동해 주세요.", providers: [] });
        return;
      }
      if (!hasPassword) {
        setNotice({
          text: providers.length
            ? "소셜 계정으로 가입한 이메일이에요. 아래 버튼으로 로그인해 주세요."
            : "비밀번호가 없는 계정이에요. 비밀번호 재설정으로 만들어 주세요.",
          providers,
        });
        return;
      }
      setStep("password");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!password.trim()) {
      setError("비밀번호를 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "로그인에 실패했습니다.");
        return;
      }
      localStorage.setItem("access_token", data.data.access_token);
      setLoginPersistence(keepLogin);
      login({
        ownerType: "user",
        userName: data.data.user.name,
        userPhone: data.data.user.phone,
        userJobType: data.data.user.job_type || "",
        userJobAreas: data.data.user.office_job_areas || [],
      });
      router.push("/profile");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 로고는 가운데 컨테이너의 왼쪽 — 로그인 첫 화면과 같은 자리 */}
      <header className="h-14 border-b border-[#f0f0f0]">
        <div className="mx-auto w-full max-w-[1060px] h-full flex items-center px-5">
          <Link href="/" className="inline-flex items-center">
            <Image src="/images/logo.png" alt="뷰티워크" width={104} height={27} />
          </Link>
        </div>
      </header>

      {/* 뒤로 — 글자 없이 화살표만. 뜻은 화면 흐름으로 충분히 읽힌다.
          비밀번호 단계에서는 화면을 뜨지 않고 이메일 단계로만 되돌린다. */}
      <div className="mx-auto w-full max-w-[1060px] px-5 pt-4">
        <button
          onClick={() => (step === "password" ? (setStep("email"), setPassword(""), setError("")) : router.back())}
          aria-label={step === "password" ? "이메일 다시 입력" : "뒤로"}
          title={step === "password" ? "이메일 다시 입력" : "뒤로"}
          className="-ml-1.5 inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6b6b6b] hover:bg-[#f5f5f5] hover:text-[#1a1a1a] transition"
        >
          <ArrowLeft size={26} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-5">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[22px] md:text-[26px] font-normal text-[#1a1a1a] text-center mb-3">
            {step === "password" ? "다시 오셨네요" : "이메일로 계속하기"}
          </h1>
          <p className="text-center text-[13px] md:text-[14px] text-[#6b6b6b] mb-10">
            {step === "password"
              ? "비밀번호를 입력하면 로그인돼요."
              : "가입하셨다면 로그인, 처음이시면 회원가입으로 이어져요."}
          </p>

          {/* 이메일 — 2단계에서는 잠그고 값만 보여 준다 */}
          <div className="mb-5">
            <label className="block text-[13px] md:text-[14px] text-[#6b6b6b] mb-2">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); setNotice(null); }}
              onKeyDown={(e) => e.key === "Enter" && step === "email" && handleContinue()}
              placeholder="이메일을 입력해주세요"
              disabled={step === "password"}
              autoFocus
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[15px] focus:outline-none focus:border-[#5f0080] disabled:bg-[#f7f7f7] disabled:text-[#6b6b6b]"
            />
          </div>

          {step === "password" && (
            <div className="mb-4">
              <label className="block text-[13px] md:text-[14px] text-[#6b6b6b] mb-2">비밀번호</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력해주세요"
                  autoFocus
                  className="w-full h-[48px] px-4 pr-10 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[15px] focus:outline-none focus:border-[#5f0080]"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]"
                  aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
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
          )}

          {error && <p className="text-[13px] md:text-[14px] text-[#e74c3c] mb-3">{error}</p>}

          {/* 다른 방법으로 가입한 계정 안내 */}
          {notice && (
            <div className="mb-3 rounded-lg bg-[#faf7fc] border border-[#eee4f5] p-3">
              <p className="text-[13px] md:text-[14px] text-[#5f0080] mb-2">{notice.text}</p>
              {notice.providers.includes("kakao") && (
                <button
                  onClick={() => { window.location.href = "/api/auth/kakao"; }}
                  className="w-full h-[44px] bg-[#FEE500] text-[#1a1a1a] rounded-lg text-[14px] mb-2"
                >
                  카카오로 계속하기
                </button>
              )}
              {notice.providers.includes("naver") && (
                <button
                  onClick={() => { window.location.href = "/api/auth/naver"; }}
                  className="w-full h-[44px] bg-[#03C75A] text-white rounded-lg text-[14px] mb-2"
                >
                  네이버로 계속하기
                </button>
              )}
              {notice.text.includes("기업회원") && (
                <Link href="/company/login">
                  <button className="w-full h-[44px] border border-[#5f0080] text-[#5f0080] rounded-lg text-[14px]">
                    기업 로그인으로 이동
                  </button>
                </Link>
              )}
            </div>
          )}

          <button
            onClick={step === "email" ? handleContinue : handleLogin}
            disabled={loading}
            className="w-full h-[52px] bg-[#5f0080] text-white rounded-lg font-normal text-[15px] mt-7 disabled:opacity-50 hover:opacity-90 transition"
          >
            {loading ? "확인 중..." : step === "email" ? "계속하기" : "로그인"}
          </button>

          {/* 하단 링크 — 기업 로그인과 같은 아이콘·크기를 쓴다 */}
          <div className="mt-8 flex flex-nowrap items-center justify-center gap-2 text-[12px] md:text-[13px] text-[#6b6b6b]">
            <Link href="/login/password-reset" className="inline-flex items-center gap-1 whitespace-nowrap hover:text-[#5f0080] hover:underline">
              <KeyRound size={14} /> 비밀번호 재설정
            </Link>
            <span className="text-[#d0d0d0]">·</span>
            <Link href="/login/find-account" className="inline-flex items-center gap-1 whitespace-nowrap hover:text-[#5f0080] hover:underline">
              <UserSearch size={14} /> 계정 찾기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
