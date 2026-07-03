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
          <p className="info-hero-desc">뷰티워크는 뷰티 산업 종사자와 기업을 연결하는 국내 최초 뷰티 특화 채용 플랫폼입니다.</p>
        </div>
        <div className="info-section">
          <h2>우리의 미션</h2>
          <p>뷰티 업계의 모든 인재가 자신에게 맞는 커리어를 찾고, 브랜드들이 최고의 인재를 만날 수 있도록 돕습니다.</p>
        </div>
        <div className="info-values">
          {[
            { icon: "💄", title: "뷰티 전문성", desc: "뷰티 산업을 깊이 이해하는 팀이 만든 플랫폼" },
            { icon: "🤝", title: "신뢰", desc: "검증된 기업과 인재만이 만나는 공간" },
            { icon: "🌏", title: "글로벌", desc: "국내를 넘어 글로벌 뷰티 커리어까지" },
            { icon: "✨", title: "성장", desc: "채용을 넘어 커리어 성장을 함께" },
          ].map((v) => (
            <div key={v.title} className="info-value-card">
              <span className="info-value-icon">{v.icon}</span>
              <h3>{v.title}</h3>
              <p>{v.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
