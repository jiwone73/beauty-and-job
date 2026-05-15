"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useSignupStore } from "@/lib/store/signupStore";

type Step = "method" | "phone" | "verify";
type UserType = "individual" | "company" | "admin";

// 테스트용 계정
const TEST_ACCOUNTS: Record<string, { name: string; type: UserType; redirect: string }> = {
  "010-1234-5678": { name: "김지수", type: "individual", redirect: "/profile" },
  "010-9999-0000": { name: "올리브영 HR", type: "company", redirect: "/company/dashboard" },
  "010-0000-0001": { name: "관리자", type: "admin", redirect: "/admin" },
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { name: savedName, phone: savedPhone } = useSignupStore();

  const searchParams = useSearchParams();
  const [userType, setUserType] = useState<"individual" | "company">(
    searchParams.get("type") === "company" ? "company" : "individual"
  );
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
  const formattedForLookup = `${rawPhone.slice(0,3)}-${rawPhone.slice(3,7)}-${rawPhone.slice(7)}`;
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
      // 테스트 계정 매칭
      const testAccount = TEST_ACCOUNTS[formattedForLookup];
      if (testAccount) {
        login({ userName: testAccount.name, userPhone: rawPhone });
        router.push(testAccount.redirect);
        return;
      }

      // 일반 회원가입 유저 매칭
      const matchedName = savedPhone.replace(/-/g, "") === rawPhone ? savedName : "";

      if (userType === "company") {
        login({ userName: matchedName || "기업담당자", userPhone: rawPhone });
        router.push("/company/dashboard");
      } else {
        login({ userName: matchedName, userPhone: rawPhone });
        router.push("/profile");
      }
    } else {
      setError("인증번호가 올바르지 않습니다. (테스트: 123456)");
    }
  };

  const handleKakaoLogin = () => {
    // 카카오 로그인은 개인회원만
    login({ userName: "카카오유저", userPhone: "" });
    router.push("/profile");
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
            <button className="login-back"
              onClick={() => { setStep(step === "verify" ? "phone" : "method"); setError(""); setCode(""); }}>
              <ChevronLeft size={18} /> 이전
            </button>
          )}

          {/* 개인/기업 탭 */}
          {step === "method" && (
            <div className="login-type-tabs">
              <button
                className={`login-type-tab ${userType === "individual" ? "active" : ""}`}
                onClick={() => setUserType("individual")}>
                개인회원
              </button>
              <button
                className={`login-type-tab ${userType === "company" ? "active" : ""}`}
                onClick={() => setUserType("company")}>
                기업회원
              </button>
            </div>
          )}

          <h1 className="login-title">
            {userType === "company" ? "기업 로그인" : "로그인"}
          </h1>
          <p className="login-sub">
            {userType === "company"
              ? "기업 담당자 계정으로 로그인해주세요"
              : "뷰티앤잡에 오신 것을 환영해요"}
          </p>

          {/* STEP 1: 방법 선택 */}
          {step === "method" && (
            <div className="login-methods">
              {userType === "individual" && (
                <>
                  <button className="login-kakao-btn" onClick={handleKakaoLogin}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path d="M11 2C6.029 2 2 5.36 2 9.5c0 2.618 1.664 4.916 4.187 6.258L5.2 19.3c-.09.31.225.56.503.39l4.46-2.94A10.6 10.6 0 0011 17c4.971 0 9-3.36 9-7.5S15.971 2 11 2z" fill="#3A1D1D" />
                    </svg>
                    카카오로 로그인
                  </button>
                  <div className="login-divider"><span>또는</span></div>
                </>
              )}

              <button className="login-phone-btn" onClick={() => setStep("phone")}>
                {userType === "company" ? "📧 담당자 번호로 로그인" : "휴대폰 번호로 로그인"}
              </button>

              <p className="login-signup-hint">
                {userType === "company" ? (
                  <>기업 계정이 없으신가요?{" "}
                    <Link href="/company/signup" className="login-signup-link">기업 회원가입</Link>
                  </>
                ) : (
                  <>아직 계정이 없으신가요?{" "}
                    <Link href="/signup" className="login-signup-link">회원가입</Link>
                  </>
                )}
              </p>

              {/* 테스트 계정 안내 */}
              <div className="login-test-accounts">
                <p className="login-test-title">🧪 테스트 계정</p>
                <div className="login-test-list">
                  <div className="login-test-item">
                    <span className="login-test-badge individual">개인</span>
                    <span>010-1234-5678 → /profile</span>
                  </div>
                  <div className="login-test-item">
                    <span className="login-test-badge company">기업</span>
                    <span>010-9999-0000 → /company/dashboard</span>
                  </div>
                  <div className="login-test-item">
                    <span className="login-test-badge admin">관리자</span>
                    <span>010-0000-0001 → /admin</span>
                  </div>
                </div>
                <p style={{fontSize:"11px", color:"#aaa", marginTop:"8px"}}>인증번호: 123456</p>
              </div>
            </div>
          )}

          {/* STEP 2: 휴대폰 번호 */}
          {step === "phone" && (
            <div className="login-form">
              <label className="login-label">휴대폰 번호</label>
              <input className={`login-input ${error ? "error" : ""}`}
                type="tel" placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                autoFocus />
              {error && <p className="login-error">{error}</p>}
              <button className="login-submit-btn" onClick={handleSendCode}
                disabled={!isValidPhone || sending}>
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
              <input className={`login-input login-input-code ${error ? "error" : ""}`}
                type="number" placeholder="123456"
                value={code}
                onChange={(e) => { setCode(e.target.value.slice(0, 6)); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                autoFocus />
              {error && <p className="login-error">{error}</p>}
              <button className="login-submit-btn" onClick={handleVerify}
                disabled={code.length !== 6 || verifying}>
                {verifying ? "확인 중..." : "로그인"}
              </button>
              <button className="login-resend-btn"
                onClick={() => { setCode(""); setError(""); handleSendCode(); }}>
                인증번호 재전송
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
