"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Lock, User } from "lucide-react";
export default function AdminLoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    if (!id.trim()) { setError("아이디를 입력해주세요."); return; }
    if (!password.trim()) { setError("비밀번호를 입력해주세요."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_id: id, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || "로그인에 실패했습니다.");
        return;
      }
      // 토큰 저장 (관리자 세션은 admin_token 전용 — 공개 사이트 세션은 건드리지 않음)
      localStorage.setItem("admin_token", data.data.access_token);
      router.push("/admin");
    } catch (e) {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        {/* 로고 */}
        <div className="admin-login-logo">
          <Link href="/"><Image src="/images/logo.png" alt="뷰티앤잡" width={130} height={33} priority /></Link>
          <span className="admin-login-badge">관리자</span>
        </div>

        <h1 className="admin-login-title">관리자 로그인</h1>
        <p className="admin-login-sub">뷰티앤잡 운영팀 전용 페이지입니다</p>

        {/* 아이디 */}
        <div className="admin-login-field">
          <label className="admin-login-label">아이디</label>
          <div className="admin-login-input-wrap">
            <User size={16} className="admin-login-input-icon" />
            <input
              className={`admin-login-input ${error ? "error" : ""}`}
              type="text"
              placeholder="관리자 아이디"
              value={id}
              onChange={(e) => { setId(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoFocus
            />
          </div>
        </div>

        {/* 비밀번호 */}
        <div className="admin-login-field">
          <label className="admin-login-label">비밀번호</label>
          <div className="admin-login-input-wrap">
            <Lock size={16} className="admin-login-input-icon" />
            <input
              className={`admin-login-input ${error ? "error" : ""}`}
              type={showPw ? "text" : "password"}
              placeholder="비밀번호"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <button className="admin-login-pw-toggle" onClick={() => setShowPw(!showPw)}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <p className="admin-login-error">{error}</p>}

        <button className="admin-login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "로그인 중..." : "로그인"}
        </button>

        {/* 테스트 계정 안내 */}
        <div className="admin-login-test">
          <p className="admin-login-test-title">🧪 테스트 계정</p>
          <div className="admin-login-test-item">
            <span>아이디: <strong>admin</strong></span>
            <span>비밀번호: <strong>admin1234</strong></span>
          </div>
        </div>

        <div className="admin-login-footer">
          <a href="/" className="admin-login-back-link">← 사이트로 돌아가기</a>
        </div>
      </div>
    </div>
  );
}
