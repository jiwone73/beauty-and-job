"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { X, ChevronLeft } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useSignupStore } from "@/lib/store/signupStore";

interface Props { onClose: () => void; }

export default function LoginModal({ onClose }: Props) {
  const router = useRouter();
  const { login } = useAuthStore();
  const { setPhone: setSignupPhone, setBasic } = useSignupStore();
  const [phoneMode, setPhoneMode] = useState(false);
  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 7) return `${d.slice(0,3)}-${d.slice(3)}`;
    return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
  };

  const handleSend = () => {
    if (!userName.trim() || phone.replace(/\D/g,"").length < 10) { setError("올바른 번호를 입력해주세요."); return; }
    setError(""); setSent(true);
  };

  const handleVerify = () => {
    if (code !== "123456") { setError("인증번호가 올바르지 않습니다. (테스트: 123456)"); return; }
    const name = userName.trim() || "사용자";
    login({ userName: name, userPhone: phone });
    setSignupPhone(phone);
    setBasic({ name });
    onClose();
    router.push("/profile");
  };

  if (phoneMode) {
    return (
      <div className="lm-overlay" onClick={onClose}>
        <div className="lm-card" onClick={(e) => e.stopPropagation()}>
          <div className="lm-phone-top">
            <button className="lm-back-btn" onClick={() => { setPhoneMode(false); setSent(false); setPhone(""); setCode(""); setError(""); setUserName(""); }}>
              <ChevronLeft size={20} />
            </button>
            <span className="lm-phone-top-title">휴대전화 번호로 계속하기</span>
          </div>

          <div className="lm-phone-body">
            <label className="lm-phone-label">이름</label>
            <input
              className="lm-phone-input"
              type="text"
              placeholder="실명을 입력해 주세요"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              style={{marginBottom:"12px", width:"100%"}}
            />
            <label className="lm-phone-label">휴대전화 번호</label>
            <div className="lm-phone-row">
              <input
                className="lm-phone-input"
                type="tel"
                placeholder="010-1234-1234"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                disabled={sent}
              />
              <button className="lm-send-btn" onClick={handleSend} disabled={sent}>
                인증
              </button>
            </div>

            {sent && (
              <>
                <label className="lm-phone-label" style={{marginTop: "16px"}}>인증번호</label>
                <input
                  className="lm-phone-input"
                  type="text"
                  placeholder="인증번호 6자리"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
                />
                <p className="lm-hint">테스트 인증번호: 123456</p>
                <button className="lm-confirm-btn" onClick={handleVerify}>확인</button>
              </>
            )}
            {error && <p className="lm-error">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lm-overlay" onClick={onClose}>
      <div className="lm-card" onClick={(e) => e.stopPropagation()}>
        <button className="lm-close" onClick={onClose}><X size={22} /></button>
        <div className="lm-header">
          <Image src="/images/logo.png" alt="뷰티앤잡" width={130} height={34} priority />
          <h2 className="lm-title">뷰티 커리어의 시작과 성장</h2>
          <p className="lm-sub">전문가 채용부터 업계 트렌드까지, 뷰티앤잡</p>
        </div>
        <div className="lm-btns">
          <a href="https://kauth.kakao.com/oauth/authorize?client_id=KAKAO_APP_KEY&redirect_uri=https://beauty-and-job.vercel.app&response_type=code"
            className="lm-kakao-btn">
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C5.58 2 2 4.92 2 8.5c0 2.3 1.52 4.32 3.82 5.48L4.9 17.1c-.08.3.22.54.48.38L9.1 14.9c.3.03.6.05.9.05 4.42 0 8-2.92 8-6.5S14.42 2 10 2z" fill="#3C1E1E"/>
            </svg>
            카카오 계정으로 계속하기
          </a>
          <button className="lm-phone-btn" onClick={() => setPhoneMode(true)}>
            휴대전화 번호로 계속하기
          </button>
        </div>
        <Link href="/company" className="lm-biz-link" onClick={onClose}>기업회원 시작하기</Link>
        <div className="lm-footer">
          <Link href="/support/terms" onClick={onClose}>이용약관</Link>
          <span>|</span>
          <Link href="/support/privacy" onClick={onClose}>개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}
