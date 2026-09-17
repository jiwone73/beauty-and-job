"use client";
import Link from "next/link";
import Image from "next/image";

/**
 * 고객센터·공지 화면의 머리줄 — 로고만 둔다.
 *
 * 탭 다섯 개가 여기 있었는데 옆줄(InfoSide)로 내렸다. 탭은 한 줄에 다 서야
 * 해서 항목이 늘면 글자를 줄이거나 버려야 한다.
 */
export default function InfoHeader() {
  return (
    <header className="info-header">
      <div className="info-header-inner">
        <Link href="/" className="logo" aria-label="뷰티워크 홈">
          <Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} priority />
        </Link>
      </div>
    </header>
  );
}
