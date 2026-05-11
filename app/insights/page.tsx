"use client";
import { INSIGHTS } from "./data";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Clock, ChevronRight } from "lucide-react";


const CATEGORIES = ["전체", "트렌드", "커리어", "연봉정보", "브랜드스토리", "취업팁"];

export default function InsightsPage() {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");

  const featured = INSIGHTS.filter((i) => i.featured);
  const filtered = INSIGHTS.filter((item) => {
    const matchCat = activeCategory === "전체" || item.category === activeCategory;
    const matchSearch = !searchQuery ||
      item.title.includes(searchQuery) ||
      item.desc.includes(searchQuery);
    return matchCat && matchSearch;
  });

  return (
    <div className="insights-page">
      {/* 헤더 */}
      <header className="jobs-header">
        <div className="jobs-header-inner">
          <Link href="/" className="jobs-logo">
            <Image src="/images/logo.png" alt="뷰티앤잡" width={130} height={34} priority />
          </Link>
          <nav className="jobs-gnb">
            <Link href="/jobs" className="jobs-gnb-item">채용공고</Link>
            <Link href="/brands" className="jobs-gnb-item">회사 둘러보기</Link>
            <Link href="/profile/resume" className="jobs-gnb-item">
              이력서 <span className="jobs-gnb-badge green">합격률 UP</span>
            </Link>
            <Link href="/salary" className="jobs-gnb-item">
              연봉어택 <span className="jobs-gnb-badge purple">경력직</span>
            </Link>
            <Link href="/insights" className="jobs-gnb-item active">
              인사이트 <span className="jobs-gnb-badge dark">NEWS</span>
            </Link>
          </nav>
          <div className="jobs-header-right">
            <Link href="/signup" className="jobs-start-btn">시작하기</Link>
            <Link href="/company" className="jobs-biz-btn">기업 서비스</Link>
          </div>
        </div>
      </header>

      <div className="insights-container">
        {/* 히어로 배너 */}
        <div className="insights-hero">
          <div className="insights-hero-text">
            <span className="insights-hero-badge">✍️ 에디터 픽</span>
            <h1 className="insights-hero-title">
              뷰티 커리어에 필요한<br />
              모든 인사이트
            </h1>
            <p className="insights-hero-desc">
              트렌드, 연봉, 커리어 팁까지<br />
              뷰티 업계의 모든 정보를 담았어요
            </p>
          </div>
          <div className="insights-hero-cards">
            {featured.slice(0, 2).map((item) => (
              <Link key={item.id} href={`/insights/${item.id}`} className="insights-hero-card">
                <div className="insights-hero-card-thumb" style={{ background: item.color }}>
                  <span className="insights-hero-card-emoji">{item.emoji}</span>
                </div>
                <div className="insights-hero-card-body">
                  <span className="insights-category-badge">{item.category}</span>
                  <p className="insights-hero-card-title">{item.title}</p>
                  <div className="insights-meta">
                    <Clock size={12} />
                    <span>{item.readTime} 읽기</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 검색 */}
        <div className="insights-search-wrap">
          <div className="insights-search-box">
            <Search size={18} className="insights-search-icon" />
            <input
              className="insights-search-input"
              placeholder="아티클 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* 카테고리 탭 */}
        <div className="insights-tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`insights-tab ${activeCategory === cat ? "active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 아티클 그리드 */}
        {filtered.length > 0 ? (
          <div className="insights-grid">
            {filtered.map((item) => (
              <Link key={item.id} href={`/insights/${item.id}`} className="insights-card">
                <div className="insights-card-thumb" style={{ background: item.color }}>
                  <span className="insights-card-emoji">{item.emoji}</span>
                </div>
                <div className="insights-card-body">
                  <span className="insights-category-badge">{item.category}</span>
                  <h3 className="insights-card-title">{item.title}</h3>
                  <p className="insights-card-desc">{item.desc}</p>
                  <div className="insights-card-footer">
                    <span className="insights-card-date">{item.date}</span>
                    <div className="insights-meta">
                      <Clock size={12} />
                      <span>{item.readTime} 읽기</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="jobs-empty">
            <div className="jobs-empty-icon">🔍</div>
            <p className="jobs-empty-title">검색 결과가 없어요.</p>
            <button className="jobs-empty-reset" onClick={() => { setSearchQuery(""); setActiveCategory("전체"); }}>
              초기화
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
