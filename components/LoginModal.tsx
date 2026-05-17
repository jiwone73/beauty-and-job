"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";

interface Props {
  onClose: () => void;
}

export default function LoginModal({ onClose }: Props) {
  const router = useRouter();
  const { login } = useAuthStore();

  const handleKakao = () => {
    // 테스트: 카카오 로그인 → 김지수로 로그인
    login({ userName: "김지수", userPhone: "010-1234-5678" });
    onClose();
    router.push("/profile");
  };

  const handlePhone = () => {
    onClose();
    router.push("/login");
  };

  return (
    <div className="lm-overlay" onClick={onClose}>
      <div className="lm-card" onClick={(e) => e.stopPropagation()}>

        {/* 닫기 */}
        <button className="lm-close" onClick={onClose}><X size={22} /></button>

        {/* 로고 + 타이틀 */}
        <div className="lm-header">
          <Image src="/images/logo.png" alt="뷰티앤잡" width={130} height={34} priority />
          <h2 className="lm-title">뷰티 커리어의 시작과 성장</h2>
          <p className="lm-sub">전문가 채용부터 업계 트렌드까지, 뷰티앤잡</p>
        </div>

        {/* 버튼 */}
        <div className="lm-btns">
          <button className="lm-kakao-btn" onClick={handleKakao}>
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C5.58 2 2 4.92 2 8.5c0 2.3 1.52 4.32 3.82 5.48L4.9 17.1c-.08.3.22.54.48.38L9.1 14.9c.3.03.6.05.9.05 4.42 0 8-2.92 8-6.5S14.42 2 10 2z" fill="#3C1E1E"/>
            </svg>
            카카오 계정으로 계속하기
          </button>
          <button className="lm-phone-btn" onClick={handlePhone}>
            휴대전화 번호로 계속하기
          </button>
        </div>

        {/* 기업회원 */}
        <Link href="/company/login" className="lm-biz-link" onClick={onClose}>
          기업회원 시작하기
        </Link>

        {/* 하단 */}
        <div className="lm-footer">
          <Link href="/support/terms" onClick={onClose}>이용약관</Link>
          <span>|</span>
          <Link href="/support/privacy" onClick={onClose}>개인정보처리방침</Link>
        </div>

      </div>
    </div>
  );
}
