"use client";
import { Suspense } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";

type Step = "phone" | "verify";
type UserType = "individual";

const TEST_ACCOUNTS: Record<string, { name: string; type: string; redirect: string }> = {
  "010-1234-5678": { name: "김지수", type: "individual", redirect: "/profile" },
  "010-9999-0000": { name: "올리브영 HR", type: "company", redirect: "/company/dashboard" },
  "010-0000-0001": { name: "관리자", type: "admin", redirect: "/admin" },
};

function LoginPageInner() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [userType, setUserType] = useState<UserType>("individual");
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const handleSendCode = () => {
    if (phone.replace(/\D/g, "").length < 10) {
      setError("올바른 휴대폰 번호를 입력해주세요."); return;
    }
    setError("");
    setStep("verify");
  };

  const handleVerify = () => {
    if (code !== "123456") {
      setError("인증번호가 올바르지 않습니다. (테스트: 123456)"); return;
    }
    const rawPhone = phone.replace(/-/g, "");
    const formattedPhone = formatPhone(rawPhone);
    const account = TEST_ACCOUNTS[formattedPhone];
    const matchedName = account?.name;
    const redirect = account?.redirect || "/profile";
    login({ userName: matchedName || "사용자", userPhone: formattedPhone });
    router.push(redirect);
  };

  return (
    <div className="login-page">
      <div className="login-header">
        <button className="login-back" onClick={() => step === "verify" ? setStep("phone") : router.back()}>
          <ChevronLeft size={24} />
        </button>
        <Link href="/">
          <Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} priority />
        </Link>
      </div>

      <div className="login-main"><div className="login-card">
        

        <h2 className="login-title">
          {"로그인"}
        </h2>
        <p className="login-sub">
          {"뷰티앤잡에 오신 것을 환영해요"}
        </p>

        {step === "phone" ? (
          <div className="login-form">
            <label className="login-label">휴대폰 번호</label>
            <input
              className="login-input"
              type="tel"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
            />
            {error && <p className="login-error">{error}</p>}
            <button className="login-btn" onClick={handleSendCode}>
              인증번호 받기
            </button>
            <p className="login-hint">
              테스트 계정: 010-1234-5678 (개인) / 010-9999-0000 (기업)
            </p>
          </div>
        ) : (
          <div className="login-form">
            <label className="login-label">인증번호</label>
            <input
              className="login-input"
              type="text"
              placeholder="인증번호 6자리"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              maxLength={6}
            />
            {error && <p className="login-error">{error}</p>}
            <button className="login-btn" onClick={handleVerify}>
              확인
            </button>
            <p className="login-hint">테스트 인증번호: 123456</p>
          </div>
        )}

        {userType === "individual" && (
          <p className="login-signup-link">
            아직 회원이 아니신가요?{" "}
            <Link href="/signup" className="login-signup-anchor">회원가입</Link>
          </p>
        )}
      </div>
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
