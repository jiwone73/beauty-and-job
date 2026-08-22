"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { setLoginPersistence } from "@/lib/auth/session";
import { ArrowLeft, Eye, EyeOff, KeyRound, UserSearch } from "lucide-react";

// 이메일 로그인 — 한 화면에서 끝낸다.
// 이메일과 비밀번호를 한 폼에 두어야 브라우저·비밀번호 관리자의 자동완성이 걸린다.
// (단계를 가르면 자동완성이 걸리다 말아 재방문 로그인이 매번 손입력이 된다.)
// 회원가입은 '또는' 아래 별도 버튼으로 두어 두 갈래를 눈에 보이게 한다.
export default function LoginEmailPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  // 끄면 브라우저를 닫을 때 로그아웃된다. 공용 PC를 염두에 두고 기본은 꺼 둔다.
  const [keepLogin, setKeepLogin] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ text: string; providers: string[]; company: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  // 로그인이 안 될 때, 비밀번호를 틀린 건지 아예 다른 곳 계정인지 갈라 준다.
  // 그냥 '틀렸습니다'만 주면 소셜로 가입한 사람이 없는 비밀번호를 계속 친다.
  const explainFailure = async (v: string) => {
    try {
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(v)}&scope=user`);
      const data = await res.json();
      if (!data.success) return false;
      const { available, kind, hasPassword, providers } = data.data;

      if (kind === "company") {
        setNotice({ text: "기업회원으로 가입된 이메일이에요. 기업 로그인으로 이동해 주세요.", providers: [], company: true });
        return true;
      }
      if (available) {
        setNotice({ text: "아직 가입하지 않은 이메일이에요. 아래에서 회원가입해 주세요.", providers: [], company: false });
        return true;
      }
      if (!hasPassword && providers.length) {
        setNotice({ text: "소셜 계정으로 가입한 이메일이에요. 아래 버튼으로 로그인해 주세요.", providers, company: false });
        return true;
      }
    } catch {
      /* 안내는 거들 뿐 — 실패하면 원래 오류 문구를 쓴다 */
    }
    return false;
  };

  const handleLogin = async () => {
    const v = email.trim();
    setError("");
    setNotice(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: v, password }),
      });
      const data = await res.json();
      if (!data.success) {
        const explained = await explainFailure(v);
        if (!explained) setError(data.error?.message || "이메일 또는 비밀번호가 올바르지 않습니다.");
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
      <header className="auth-header border-b border-[#f0f0f0]">
        <div className="mx-auto w-full max-w-[1060px] h-full flex items-center px-5">
          <Link href="/" className="inline-flex items-center">
            <Image src="/images/logo.png" className="auth-logo" alt="뷰티워크" width={140} height={36} />
          </Link>
        </div>
      </header>

      {/* 뒤로 — 글자 없이 화살표만. 뜻은 화면 흐름으로 충분히 읽힌다. */}
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
            이메일로 로그인
          </h1>

          <div className="mb-5">
            <label className="block text-[13px] md:text-[14px] text-[#6b6b6b] mb-2">이메일</label>
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); setNotice(null); }}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && handleLogin()}
              placeholder="이메일을 입력해주세요"
              autoFocus
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[15px] focus:outline-none focus:border-[#582681]"
            />
          </div>

          <div className="mb-4">
            <label className="block text-[13px] md:text-[14px] text-[#6b6b6b] mb-2">비밀번호</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); setNotice(null); }}
                onKeyDown={(e) => e.key === "Enter" && canSubmit && handleLogin()}
                placeholder="비밀번호를 입력해주세요"
                className="w-full h-[48px] px-4 pr-10 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[15px] focus:outline-none focus:border-[#582681]"
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
                className="w-4 h-4 accent-[#582681]"
              />
              로그인 저장하기
            </label>
          </div>

          {error && <p className="text-[13px] md:text-[14px] text-[#e74c3c] mb-3">{error}</p>}

          {/* 왜 안 됐는지 — 비밀번호가 아니라 계정 종류가 문제인 경우 */}
          {notice && (
            <div className="mb-3 rounded-lg bg-[#f7f7f8] border border-[#f7f7f8] p-3">
              <p className="text-[13px] md:text-[14px] text-[#582681] mb-2">{notice.text}</p>
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
              {notice.company && (
                <Link href="/company/login">
                  <button className="w-full h-[44px] border border-[#582681] text-[#582681] rounded-lg text-[14px]">
                    기업 로그인으로 이동
                  </button>
                </Link>
              )}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={!canSubmit}
            className="w-full h-[52px] rounded-lg font-normal text-[15px] mt-7 transition bg-[#582681] text-white hover:opacity-90 disabled:bg-[#f2f2f2] disabled:text-[#b0b0b0] disabled:hover:opacity-100"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>

          {/* 아직 계정이 없는 사람의 갈래 — 숨기지 않고 나란히 둔다.
              친 이메일이 있으면 그대로 들고 간다. */}
          <div className="my-7 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#ececec]" />
            <span className="text-[12px] md:text-[13px] text-[#9a9a9a]">또는</span>
            <span className="h-px flex-1 bg-[#ececec]" />
          </div>

          <Link href={email.trim() ? `/signup/email?email=${encodeURIComponent(email.trim())}` : "/signup/email"}>
            <button className="w-full h-[52px] bg-white border border-[#c0c0c0] text-[#582681] rounded-lg font-normal text-[15px] hover:border-[#582681] hover:bg-[#f7f7f8] transition">
              이메일로 가입하기
            </button>
          </Link>

          <div className="mt-8 flex flex-nowrap items-center justify-center gap-2 text-[12px] md:text-[13px] text-[#6b6b6b]">
            <Link href="/login/password-reset" className="inline-flex items-center gap-1 whitespace-nowrap hover:text-[#582681] hover:underline">
              <KeyRound size={14} /> 비밀번호 재설정
            </Link>
            <span className="text-[#d0d0d0]">·</span>
            <Link href="/login/find-account" className="inline-flex items-center gap-1 whitespace-nowrap hover:text-[#582681] hover:underline">
              <UserSearch size={14} /> 계정 찾기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
