"use client";

import Link from "next/link";
import Image from "next/image";

/**
 * 기업 서비스 화면의 머리. 소개 화면과 요금제 상세가 같은 것을 쓴다.
 *
 * 같은 머리를 두 화면에 따로 적어 두면 메뉴를 하나 고칠 때마다 한쪽이 남는다.
 * 닻(#요금제 같은 것)은 소개 화면에서만 쓸모가 있어, 다른 화면에서는 소개로
 * 돌아가는 길로 바꿔 준다.
 */
export default function ServiceHeader({ 소개화면 = false }: { 소개화면?: boolean }) {
  const 닻 = (id: string) => (소개화면 ? `#${id}` : `/company#${id}`);
  return (
    <header className="cs-header">
      <div className="cs-header-in">
        <Link href="/" className="cs-logo">
          <Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} priority />
        </Link>
        <nav className="cs-nav">
          <a href={닻("소개")}>서비스 소개</a>
          <a href={닻("직군")}>매장 채용</a>
          <a href={닻("직군")}>오피스 채용</a>
          <Link href="/company/plans/event" className="cs-nav-evt">오픈이벤트</Link>
          <Link href="/company/plans">요금제</Link>
          <Link href="/company/plans/ads">배너광고</Link>
          <Link href="/support">고객센터</Link>
        </nav>
        <div className="cs-header-btns">
          <Link href="/company/login" className="cs-btn-ghost">로그인</Link>
          <Link href="/company/signup" className="cs-btn-fill">회원가입</Link>
        </div>
      </div>
    </header>
  );
}
