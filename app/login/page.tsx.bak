"use client";
import { Suspense } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";

const TEST_ACCOUNTS: Record<string, { name: string; password: string; redirect: string }> = {
  "010-1234-5678":    { name: "김지수", password: "1234", redirect: "/profile" },
  "01012345678":      { name: "김지수", password: "1234", redirect: "/profile" },
  "jisoo":            { name: "김지수", password: "1234", redirect: "/profile" },
  "jisoo@beauty.com": { name: "김지수", password: "1234", redirect: "/profile" },
};

function LoginPageInner() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saveLogin, setSaveLogin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 휴대전화 간편로그인 상태
  const [phoneMode, setPhoneMode] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneSent, setPhoneSent] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const handleLogin = async () => {
    if (!id.trim()) { setError("아이디를 입력해주세요."); return; }
    if (!password.trim()) { setError("비밀번호를 입력해주세요."); return; }
    setLoading(true); setError("");
    await new Promise((r) => setTimeout(r, 400));
    setLoading(false);
    const account = TEST_ACCOUNTS[id.trim()];
    if (account && account.password === password) {
      login({ userName: account.name, userPhone: id });
      router.push(account.redirect);
    } else {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 7) return `${d.slice(0,3)}-${d.slice(3)}`;
    return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
  };

  const handlePhoneSend = async () => {
    if (phone.replace(/\D/g,"").length < 10) { setPhoneError("올바른 번호를 입력해주세요."); return; }
    setPhoneError("");
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (data.success) {
        setPhoneSent(true);
      } else {
        setPhoneError(data.error?.message || '인증번호 발송에 실패했습니다.');
      }
    } catch (e) {
      setPhoneError('네트워크 오류가 발생했습니다.');
    }
  };

  const handlePhoneVerify = async () => {
    setPhoneError("");
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });
      const data = await res.json();
      if (!data.success) {
        setPhoneError(data.error?.message || '인증에 실패했습니다.');
        return;
      }
      if (data.data.is_new_user) {
        // 미가입 → 회원가입 페이지로
        router.push(`/signup?phone=${encodeURIComponent(phone)}`);
        return;
      }
      // 토큰 저장 + 로그인 처리
      localStorage.setItem('access_token', data.data.access_token);
      login({ userName: data.data.user.name, userPhone: phone });
      router.push('/profile');
    } catch (e) {
      setPhoneError('네트워크 오류가 발생했습니다.');
    }
  };

  return (
    <div className="baj-login-page">
      <div className="baj-login-wrap">

        {/* 로고 */}
        <div className="baj-login-logo">
          <Link href="/"><Image src="/images/logo.png" alt="뷰티앤잡" width={140} height={38} priority /></Link>
        </div>

        {/* 휴대전화 간편로그인 모드 */}
        {phoneMode ? (
          <div>
            <button className="baj-back-btn" onClick={() => { setPhoneMode(false); setPhoneSent(false); setPhone(""); setCode(""); setPhoneError(""); }}>
              ← 돌아가기
            </button>
            <div className="baj-login-fields">
              <input className="baj-login-input" type="tel"
                placeholder="휴대전화 번호"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                disabled={phoneSent}
              />
              {phoneSent && (
                <div className="baj-login-pw-wrap">
                  <input className="baj-login-input" type="text"
                    placeholder="인증번호 6자리"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
                    maxLength={6}
                  />
                </div>
              )}
            </div>
            {phoneError && <p className="baj-login-error">{phoneError}</p>}
            <button className="baj-login-btn" onClick={phoneSent ? handlePhoneVerify : handlePhoneSend}>
              {phoneSent ? "확인" : "인증번호 받기"}
            </button>
            <p className="baj-login-hint">테스트: 010-1234-5678 / 인증번호: 123456</p>
          </div>
        ) : (
          <>
            {/* 일반 로그인 폼 */}
            <div className="baj-login-fields">
              <input className="baj-login-input" type="text"
                placeholder="아이디 · 이메일 · 휴대폰 번호"
                value={id} onChange={(e) => setId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
              <div className="baj-login-pw-wrap">
                <input className="baj-login-input" type={showPw ? "text" : "password"}
                  placeholder="비밀번호"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
                <button className="baj-login-eye" type="button" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <label className="baj-login-save">
              <input type="checkbox" checked={saveLogin} onChange={(e) => setSaveLogin(e.target.checked)} />
              <span>로그인 정보 저장</span>
              <span className="baj-save-info" title="내 기기에서만 사용하세요">ⓘ</span>
            </label>

            {error && <p className="baj-login-error">{error}</p>}

            <button className="baj-login-btn" onClick={handleLogin} disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </button>

            <p className="baj-login-hint">테스트: jisoo / 1234</p>

            {/* 구분선 */}
            <div className="baj-login-or">
              <span />또는<span />
            </div>

            {/* 간편로그인 */}
            <div className="baj-social-btns">
              <a href="https://kauth.kakao.com/oauth/authorize?client_id=KAKAO_APP_KEY&redirect_uri=https://beauty-and-job.vercel.app/api/auth/kakao&response_type=code"
                className="baj-kakao-btn">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2C5.58 2 2 4.92 2 8.5c0 2.3 1.52 4.32 3.82 5.48L4.9 17.1c-.08.3.22.54.48.38L9.1 14.9c.3.03.6.05.9.05 4.42 0 8-2.92 8-6.5S14.42 2 10 2z" fill="#3C1E1E"/>
                </svg>
                카카오 간편로그인
              </a>
              <button className="baj-phone-btn" onClick={() => setPhoneMode(true)}>
                📱 휴대전화 간편로그인
              </button>
            </div>

            <div className="baj-login-links">
              <Link href="/signup">회원가입</Link>
              <span className="baj-login-divider" />
              <Link href="#">아이디 찾기</Link>
              <span className="baj-login-divider" />
              <Link href="#">비밀번호 찾기</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginPageInner />
    </Suspense>
  );
}
