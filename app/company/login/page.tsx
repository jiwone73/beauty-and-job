"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Lock, User, Building2 } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";


export default function CompanyLoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!id.trim()) { setError("이메일을 입력해주세요."); return; }
    if (!password.trim()) { setError("비밀번호를 입력해주세요."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/company/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: id.trim(), password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "로그인에 실패했습니다.");
        return;
      }
      localStorage.setItem("access_token", data.data.access_token);
      login({
        userName: data.data.company.company_name,
        userPhone: data.data.company.phone || "",
      });
      router.push("/company/dashboard");
    } catch (e) {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <Image src="/images/logo.png" alt="뷰티앤잡" width={130} height={33} priority />
          <span className="admin-login-badge" style={{background:"#5f0080"}}>기업</span>
        </div>

        <h1 className="admin-login-title">기업 로그인</h1>
        <p className="admin-login-sub">기업 담당자 전용 채용관리 서비스입니다</p>

        <div className="admin-login-field">
          <label className="admin-login-label">이메일</label>
          <div className="admin-login-input-wrap">
            <User size={16} className="admin-login-input-icon" />
            <input
              className={`admin-login-input ${error ? "error" : ""}`}
              type="text"
              placeholder="이메일"
              value={id}
              onChange={(e) => setId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
        </div>

        <div className="admin-login-field">
          <label className="admin-login-label">비밀번호</label>
          <div className="admin-login-input-wrap">
            <Lock size={16} className="admin-login-input-icon" />
            <input
              className={`admin-login-input ${error ? "error" : ""}`}
              type={showPw ? "text" : "password"}
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <button className="admin-login-eye" onClick={() => setShowPw(!showPw)} type="button">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <p className="admin-login-error">{error}</p>}

        <button
          className="admin-login-btn"
          onClick={handleLogin}
          disabled={loading}
          style={{background: loading ? "#999" : "#5f0080"}}>
          {loading ? "로그인 중..." : "로그인"}
        </button>

        <p className="admin-login-hint">
          이메일과 비밀번호를 입력해주세요
        </p>

        <div style={{textAlign:"center", marginTop:"20px", paddingTop:"20px", borderTop:"1px solid #f0f0f0"}}>
          <Link href="/company/signup" style={{fontSize:"13px", color:"#5f0080", fontWeight:600}}>
            기업 회원가입 →
          </Link>
        </div>
      </div>
    </div>
  );
}
