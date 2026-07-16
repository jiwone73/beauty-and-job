"use client";
import Link from "next/link";
import Image from "next/image";
import AboutHeader from "@/components/AboutHeader";

export default function AboutPage() {
  return (
    <div className="info-page">
      <AboutHeader active="/about" />
      <main className="info-main">
        <div className="info-hero">
          <h1 className="info-hero-title">뷰티 업계 커리어의 모든 것,<br /><span>뷰티워크</span></h1>
          <p className="info-hero-desc">뷰티워크는 네일·속눈썹·헤어부터 뷰티 브랜드까지, 뷰티 업계 채용만 모은 특화 채용 플랫폼입니다.</p>
        </div>
        <div className="info-section">
          <h2>우리의 미션</h2>
          <p>뷰티 업계의 모든 인재가 자신에게 맞는 커리어를 찾고, 매장과 브랜드가 꼭 맞는 사람을 만날 수 있도록 돕습니다.</p>
        </div>

        <div className="info-section">
          <h2>이런 분들을 위해</h2>
          <p>뷰티 업계에서 일자리를 찾는 분과, 함께할 사람을 구하는 매장·브랜드 모두를 위한 서비스입니다. 네일리스트·속눈썹·왁싱·헤어 등 현장 종사자부터 뷰티 브랜드의 마케팅·MD·영업까지, 뷰티 산업의 채용을 폭넓게 다룹니다.</p>
        </div>

        <div className="info-section">
          <h2>뷰티워크가 하는 일</h2>
          <div className="info-values">
            <div className="info-value-card">
              <span className="info-value-icon">🔍</span>
              <h3>뷰티 채용만 모아보기</h3>
              <p>여기저기 흩어진 뷰티 일자리를 한 곳에서 지역·직무로 골라봐요.</p>
            </div>
            <div className="info-value-card">
              <span className="info-value-icon">📄</span>
              <h3>이력서 한 번으로 지원</h3>
              <p>한 번 만든 이력서로 여러 공고에 간편하게 지원해요.</p>
            </div>
            <div className="info-value-card">
              <span className="info-value-icon">📍</span>
              <h3>내 주변 채용</h3>
              <p>지도로 통근 가능한 거리의 채용을 바로 찾아요.</p>
            </div>
            <div className="info-value-card">
              <span className="info-value-icon">🏪</span>
              <h3>매장부터 브랜드까지</h3>
              <p>동네 매장·샵부터 뷰티 브랜드 채용까지 폭넓게 다뤄요.</p>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h2>왜 시작했을까요</h2>
          <p>뷰티 업계의 채용은 인스타그램 DM, 동네 커뮤니티, 지인 소개처럼 여기저기 흩어져 있었습니다. 좋은 자리를 찾는 사람도, 좋은 사람을 구하는 매장도 서로를 만나기 어려웠죠. 뷰티워크는 이 흩어진 뷰티 채용을 한 곳에 모으는 일에서 시작했습니다.</p>
        </div>

        <div className="info-section" style={{ textAlign: "center" }}>
          <Link href="/jobs" style={{ display: "inline-block", padding: "12px 28px", background: "#5f0080", color: "#fff", borderRadius: "10px", fontSize: "15px", fontWeight: 600, textDecoration: "none" }}>
            채용공고 보러가기
          </Link>
        </div>

      </main>
    </div>
  );
}
