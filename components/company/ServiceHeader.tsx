"use client";

import Link from "next/link";
import Image from "next/image";

/**
 * 기업 서비스 화면의 머리. 소개 화면과 상품 화면이 같은 것을 쓴다.
 *
 * 넷만 둔다. 「매장 채용」과 「오피스 채용」은 둘 다 같은 닻(#직군)으로 가고
 * 있었다 — 이름이 둘인데 목적지가 하나였고, 그 자리는 직군 아이콘이 늘어선
 * 소개 섹션이지 채용을 시작하는 곳도 아니었다. 「서비스 소개」는 이 화면 맨
 * 위라 로고가 이미 하는 일이다.
 *
 * 이름은 로그인 뒤 사이드와 맞춘다. 가입 전에 「요금제」로 부르고 가입 뒤에
 * 「채용공고 상품」으로 부르면 같은 것을 두 이름으로 배우게 된다.
 *
 * 고객센터는 여기 없다. 고객센터에는 상품 이야기가 없고, 구직자도 같은 곳을
 * 쓴다 — 기업 서비스 안에 넣어 두면 구직자가 푸터로 들어와도 상품 메뉴를
 * 보게 된다. 별도 화면으로 세우고 푸터가 그 길을 맡는다.
 */
export default function ServiceHeader() {
  return (
    <header className="cs-header">
      <div className="cs-header-in">
        <Link href="/" className="cs-logo">
          <Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} priority />
        </Link>
        <nav className="cs-nav">
          {/* 기업 서비스 첫 화면이 곧 이벤트 화면이다 — 같은 내용을 두 주소로
              두면 어느 쪽이 진짜인지 갈린다. 끝나면 이 줄만 빼면 된다. */}
          <Link href="/company" className="cs-nav-evt">오픈이벤트</Link>
          <Link href="/company/plans">채용공고 상품</Link>
          <Link href="/company/plans/ads">배너광고 상품</Link>
        </nav>
        <div className="cs-header-btns">
          <Link href="/company/login" className="cs-btn-ghost">로그인</Link>
          <Link href="/company/signup" className="cs-btn-fill">회원가입</Link>
        </div>
      </div>
    </header>
  );
}
