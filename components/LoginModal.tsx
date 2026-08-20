"use client";
import Image from "next/image";
import Link from "next/link";
import { X, Mail } from "lucide-react";

interface Props { onClose: () => void; }

/**
 * 로그인 안내 모달 — 공고에서 스크랩·지원을 누른 로그인 안 한 사람에게 뜬다.
 *
 * 여기서 로그인을 처리하지 않는다. 로그인 화면(/login)이 이미 하는 일을
 * 모달이 다시 만들면 두 곳이 어긋난다. 실제로 어긋나 있었다 —
 * "휴대전화 번호로 계속하기"가 문자를 보내지 않고 화면에 적힌 123456 을
 * 받아 서버 확인 없이 로그인 상태로 만들었다. 토큰이 없으니 그 뒤 API 는
 * 전부 401 이었고, 로그인 화면에는 휴대전화 로그인이 있지도 않다.
 *
 * 그래서 이 모달이 하는 일은 하나다 — 로그인 화면과 같은 길을 보여 준다.
 */
export default function LoginModal({ onClose }: Props) {
  return (
    <div className="lm-overlay" onClick={onClose}>
      <div className="lm-card" onClick={(e) => e.stopPropagation()}>
        <button className="lm-close" onClick={onClose} aria-label="닫기"><X size={22} /></button>
        <div className="lm-header">
          <Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} priority />
          <h2 className="lm-title">뷰티 커리어의 시작과 성장</h2>
          <p className="lm-sub">전문가 채용부터 업계 트렌드까지, 뷰티워크</p>
        </div>
        <div className="lm-btns">
          <a href="/api/auth/kakao" className="lm-kakao-btn">
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M10 2C5.58 2 2 4.92 2 8.5c0 2.3 1.52 4.32 3.82 5.48L4.9 17.1c-.08.3.22.54.48.38L9.1 14.9c.3.03.6.05.9.05 4.42 0 8-2.92 8-6.5S14.42 2 10 2z" fill="#3C1E1E"/>
            </svg>
            카카오로 계속하기
          </a>
          {/* 로그인 화면과 같은 조건으로만 보여 준다 — 앱 키가 없는 곳에서
              누르면 오류 화면으로 떨어진다. */}
          {process.env.NEXT_PUBLIC_NAVER_LOGIN === "1" && (
            <a href="/api/auth/naver" className="lm-naver-btn">
              <span style={{ fontWeight: 700 }}>N</span>
              네이버로 계속하기
            </a>
          )}
          <Link href="/login/email" className="lm-phone-btn" onClick={onClose}>
            <Mail size={18} />
            이메일로 계속하기
          </Link>
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
