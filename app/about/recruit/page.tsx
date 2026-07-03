"use client";
import Image from "next/image";
import AboutHeader from "@/components/AboutHeader";
export default function RecruitPage() {
  return (
    <div className="info-page">
      <AboutHeader active="/about/recruit" />
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
