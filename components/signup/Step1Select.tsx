"use client";

import Image from "next/image";
import Link from "next/link";
import { X, MessageCircle } from "lucide-react";

interface Props {
  onSelectPhone: () => void;
  onSelectKakao: () => void;
}

export default function Step1Select({ onSelectPhone, onSelectKakao }: Props) {
  return (
    <div className="relative w-full max-w-[440px] bg-white rounded-2xl p-14 px-8 pb-8 shadow-modal">
      {/* 닫기 */}
      <Link
        href="/"
        aria-label="닫기"
        className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-[#6b6b6b] hover:bg-[#f7f7f8] rounded-lg transition-colors"
      >
        <X size={22} />
      </Link>

      {/* 일러스트 */}
      <div className="flex justify-center items-start gap-2 h-[90px] mb-7" aria-hidden="true">
        <svg viewBox="0 0 40 80" className="w-10 h-20 fill-primary">
          <path d="M12 8 L28 8 L26 22 L14 22 Z M14 22 L26 22 L24 70 L16 70 Z" />
        </svg>
        <svg viewBox="0 0 40 80" className="w-10 h-20 fill-primary">
          <rect x="10" y="14" width="20" height="58" rx="3" />
          <rect x="14" y="6" width="12" height="10" rx="2" />
        </svg>
        <svg viewBox="0 0 40 80" className="w-10 h-20 fill-primary">
          <rect x="16" y="4" width="8" height="14" />
          <rect x="13" y="18" width="14" height="10" rx="1" />
          <path d="M14 28 L26 28 L23 76 L17 76 Z" />
        </svg>
        <svg viewBox="0 0 40 80" className="w-10 h-20 fill-primary">
          <path d="M10 8 L30 8 L26 22 L14 22 Z M14 22 L26 22 L22 72 L18 72 Z" />
        </svg>
        <svg viewBox="0 0 40 80" className="w-10 h-20 fill-primary">
          <rect x="12" y="6" width="16" height="68" rx="2" />
          <rect x="15" y="2" width="10" height="6" rx="1" />
        </svg>
      </div>

      {/* 로고 */}
      <div className="flex justify-center mb-6">
        <Image
          src="/images/logo.png"
          alt="뷰티앤잡"
          width={140}
          height={36}
          priority
          className="h-9 w-auto"
        />
      </div>

      <h1 className="text-center text-xl font-bold text-[#1a1a1a] mb-2 tracking-tight">
        뷰티 커리어의 시작과 성장
      </h1>
      <p className="text-center text-sm text-[#6b6b6b] mb-8 leading-relaxed">
        전문가 채용부터 업계 트렌드까지, 뷰티앤잡
      </p>

      <div className="flex flex-col gap-2.5 mb-5">
        <button
          type="button"
          onClick={onSelectKakao}
          className="w-full h-[52px] bg-kakao text-kakao-text rounded-lg text-[15px] font-medium flex items-center justify-center gap-2 hover:brightness-95 active:scale-[0.99] transition-all"
        >
          <MessageCircle size={18} fill="currentColor" />
          카카오 계정으로 계속하기
        </button>
        <button
          type="button"
          onClick={onSelectPhone}
          className="w-full h-[52px] bg-white text-[#1a1a1a] border border-[#d4d4d4] rounded-lg text-[15px] font-medium hover:border-primary hover:text-primary hover:bg-primary-soft active:scale-[0.99] transition-all"
        >
          휴대전화 번호로 계속하기
        </button>
      </div>

      <button
        type="button"
        className="block mx-auto mb-9 px-3 py-2 text-sm text-[#6b6b6b] hover:text-primary transition-colors"
      >
        기업회원 시작하기
      </button>

      <div className="flex justify-center items-center gap-3.5 pt-4 border-t border-[#ececec]">
        <button className="text-xs text-[#9a9a9a] hover:text-[#6b6b6b] transition-colors">
          이용약관
        </button>
        <span className="text-[#d4d4d4] text-[11px]">|</span>
        <button className="text-xs text-[#9a9a9a] hover:text-[#6b6b6b] transition-colors">
          개인정보처리방침
        </button>
      </div>
    </div>
  );
}
