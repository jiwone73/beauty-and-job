"use client";
import Link from "next/link";
import Image from "next/image";
export default function RecruitPage() {
  return (
    <div className="info-page">
      <header className="info-header">
        <Link href="/"><Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} priority /></Link>
      </header>
      <div className="info-nav">
        <Link href="/about" className="info-nav-item">회사 소개</Link>
        <Link href="/about/recruit" className="info-nav-item active">채용</Link>
        <Link href="/about/partnership" className="info-nav-item">제휴 문의</Link>
        <Link href="/about/advertise" className="info-nav-item">광고 문의</Link>
        <Link href="/about/contact" className="info-nav-item">기타 문의</Link>
      </div>
      <main className="info-main">
        <div className="info-hero">
          <h1 className="info-hero-title">뷰티워크와 함께<br /><span>성장할 분을 찾습니다</span></h1>
          <p className="info-hero-desc">뷰티 업계의 커리어 혁신을 함께 만들어갈 팀원을 모집합니다.</p>
        </div>
        <div className="info-section">
          <h2>채용 공고</h2>
          <div className="recruit-empty">
            <p>현재 진행 중인 채용 공고가 없습니다.<br />채용 시 공지드릴게요.</p>
            
          </div>
        </div>
      </main>
    </div>
  );
}
