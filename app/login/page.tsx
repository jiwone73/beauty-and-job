"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useSignupStore } from "@/lib/store/signupStore";

type Step = "method" | "phone" | "verify";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { name: savedName, phone: savedPhone } = useSignupStore();
  const [step, setStep] = useState<Step>("method");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const formatPhone = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const rawPhone = phone.replace(/-/g, "");
  const isValidPhone = rawPhone.length === 11 && rawPhone.startsWith("01");

  const handleSendCode = async () => {
    if (!isValidPhone) { setError("올바른 휴대폰 번호를 입력해주세요."); return; }
    setSending(true);
    setError("");
    await new Promise((r) => setTimeout(r, 800));
    setSending(false);
    setStep("verify");
  };

  const handleVerify = async () => {
    if (code.length !== 6) { setError("인증번호 6자리를 입력해주세요."); return; }
    setVerifying(true);
    setError("");
    await new Promise((r) => setTimeout(r, 800));
    setVerifying(false);

    if (code === "123456") {
      // 저장된 회원 정보와 전화번호 매칭
      const matchedName = savedPhone.replace(/-/g, "") === rawPhone ? savedName : "";
      login({ userName: matchedName, userPhone: rawPhone });
      router.push("/");
    } else {
      setError("인증번호가 올바르지 않습니다. (테스트: 123456)");
    }
  };

  const handleKakaoLogin = () => {
    alert("카카오 로그인은 카카오 개발자 콘솔 연동 후 사용 가능합니다.");
  };

  return (
    <div className="login-page">
      <header className="login-header">
        <Link href="/" className="login-logo">
          <Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={30} priority />
        </Link>
      </header>

      <main className="login-main">
        <div className="login-card">
          {step !== "method" && (
            <button
              className="login-back"
              onClick={() => { setStep(step === "verify" ? "phone" : "method"); setError(""); setCode(""); }}
            >
              <ChevronLeft size={18} /> 이전
            </button>
          )}

          <h1 className="login-title">로그인</h1>
          <p className="login-sub">뷰티앤잡에 오신 것을 환영해요</p>

          {/* STEP 1: 방법 선택 */}
          {step === "method" && (
            <div className="login-methods">
              <button className="login-kakao-btn" onClick={handleKakaoLogin}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M11 2C6.029 2 2 5.36 2 9.5c0 2.618 1.664 4.916 4.187 6.258L5.2 19.3c-.09.31.225.56.503.39l4.46-2.94A10.6 10.6 0 0011 17c4.971 0 9-3.36 9-7.5S15.971 2 11 2z" fill="#3A1D1D" />
                </svg>
                카카오로 로그인
              </button>

              <div className="login-divider"><span>또는</span></div>

              <button className="login-phone-btn" onClick={() => setStep("phone")}>
                휴대폰 번호로 로그인
              </button>

              <p className="login-signup-hint">
                아직 계정이 없으신가요?{" "}
                <Link href="/signup" className="login-signup-link">회원가입</Link>
              </p>

              <div className="login-kakao-notice">
                <span className="login-kakao-notice-icon">💬</span>
                <p>카카오 계정으로 가입하면 채용 알림을<br />카카오톡으로 바로 받을 수 있어요</p>
              </div>
            </div>
          )}

          {/* STEP 2: 휴대폰 번호 */}
          {step === "phone" && (
            <div className="login-form">
              <label className="login-label">휴대폰 번호</label>
              <input
                className={`login-input ${error ? "error" : ""}`}
                type="tel"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                autoFocus
              />
              {error && <p className="login-error">{error}</p>}
              <button className="login-submit-btn" onClick={handleSendCode} disabled={!isValidPhone || sending}>
                {sending ? "전송 중..." : "인증번호 받기"}
              </button>
              <p className="login-notice">가입된 계정의 휴대폰 번호를 입력해주세요.</p>
            </div>
          )}

          {/* STEP 3: 인증번호 */}
          {step === "verify" && (
            <div className="login-form">
              <p className="login-phone-display"><strong>{phone}</strong>으로 인증번호를 보냈어요</p>
              <label className="login-label">인증번호 6자리</label>
              <input
                className={`login-input login-input-code ${error ? "error" : ""}`}
                type="number"
                placeholder="123456"
                value={code}
                onChange={(e) => { setCode(e.target.value.slice(0, 6)); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                autoFocus
              />
              {error && <p className="login-error">{error}</p>}
              <button className="login-submit-btn" onClick={handleVerify} disabled={code.length !== 6 || verifying}>
                {verifying ? "확인 중..." : "로그인"}
              </button>
              <button className="login-resend-btn" onClick={() => { setCode(""); setError(""); handleSendCode(); }}>
                인증번호 재전송
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
