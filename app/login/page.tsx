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

  const handleLogin = async () => {
    if (!id.trim()) { setError("아이디를 입력해주세요."); return; }
    if (!password.trim()) { setError("비밀번호를 입력해주세요."); return; }
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 500));
    setLoading(false);
    const account = TEST_ACCOUNTS[id.trim()];
    if (account && account.password === password) {
      login({ userName: account.name, userPhone: id });
      router.push(account.redirect);
    } else {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  return (
    <div className="baj-login-page">
      <div className="baj-login-wrap">
        <div className="baj-login-logo">
          <Link href="/"><Image src="/images/logo.png" alt="뷰티앤잡" width={140} height={38} priority /></Link>
        </div>

        <div className="baj-login-fields">
          <input
            className={`baj-login-input ${error ? "error" : ""}`}
            type="text"
            placeholder="아이디 · 이메일 · 휴대폰 번호"
            value={id}
            onChange={(e) => setId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <div className="baj-login-pw-wrap">
            <input
              className={`baj-login-input ${error ? "error" : ""}`}
              type={showPw ? "text" : "password"}
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
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

        <p className="baj-login-hint">테스트: 010-1234-5678 또는 jisoo / 비밀번호: 1234</p>

        <div className="baj-login-links">
          <Link href="/signup">회원가입</Link>
          <span className="baj-login-divider" />
          <Link href="#">아이디 찾기</Link>
          <span className="baj-login-divider" />
          <Link href="#">비밀번호 찾기</Link>
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
