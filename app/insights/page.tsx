"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Clock, ChevronRight } from "lucide-react";

/* ===== 더미 데이터 ===== */
export const INSIGHTS = [
  {
    id: 1,
    category: "트렌드",
    title: "2025 뷰티 업계를 뒤흔들 10가지 트렌드",
    desc: "K-뷰티의 글로벌 확장, 클린뷰티, AI 피부 분석까지. 올해 뷰티 업계를 이끌 핵심 키워드를 정리했습니다.",
    date: "2025.01.20",
    readTime: "5분",
    color: "#f3e8f7",
    emoji: "✨",
    featured: true,
  },
  {
    id: 2,
    category: "커리어",
    title: "뷰티 MD가 되기 위한 5가지 필수 역량",
    desc: "현직 시니어 MD가 알려주는 진짜 실전 노하우. 포트폴리오 구성부터 면접 팁까지.",
    date: "2025.01.17",
    readTime: "7분",
    color: "#e8f0fe",
    emoji: "💼",
    featured: true,
  },
  {
    id: 3,
    category: "연봉정보",
    title: "뷰티 업계 직무별 연봉 리포트 2025",
    desc: "마케팅, MD, 디자인, SCM 등 주요 직무별 연봉 데이터를 공개합니다. 경력별 상세 데이터 포함.",
    date: "2025.01.15",
    readTime: "10분",
    color: "#e8f5e9",
    emoji: "📊",
    featured: true,
  },
  {
    id: 4,
    category: "브랜드스토리",
    title: "아누아(ANUA)는 어떻게 틱톡에서 글로벌 브랜드가 됐나",
    desc: "스킨케어 브랜드 아누아의 틱톡샵 성공 전략. 인플루언서 마케팅부터 북미 시장 공략까지.",
    date: "2025.01.12",
    readTime: "8분",
    color: "#fff3e0",
    emoji: "🌿",
    featured: false,
  },
  {
    id: 5,
    category: "취업팁",
    title: "뷰티 회사 면접, 이것만 알면 합격한다",
    desc: "뷰티 업계 인사담당자가 직접 알려주는 면접 준비 가이드. 자주 묻는 질문과 모범 답변까지.",
    date: "2025.01.10",
    readTime: "6분",
    color: "#fce4ec",
    emoji: "🎯",
    featured: false,
  },
  {
    id: 6,
    category: "트렌드",
    title: "클린뷰티 시대, 화장품 성분 분석가의 역할이 커진다",
    desc: "소비자 성분 인식이 높아지면서 새롭게 주목받는 직무, 성분 분석가의 모든 것.",
    date: "2025.01.08",
    readTime: "5분",
    color: "#e8eaf6",
    emoji: "🔬",
    featured: false,
  },
  {
    id: 7,
    category: "커리어",
    title: "해외 뷰티 브랜드 취업, 어떻게 준비하나",
    desc: "로레알, 에스티로더 등 글로벌 뷰티 기업 취업을 위한 실전 준비 가이드.",
    date: "2025.01.05",
    readTime: "9분",
    color: "#f1f8e9",
    emoji: "🌍",
    featured: false,
  },
  {
    id: 8,
    category: "연봉정보",
    title: "경력 5년차 뷰티 마케터 연봉 협상 성공 사례",
    desc: "연봉 협상에 성공한 뷰티 마케터의 실제 경험담. 협상 타이밍과 전략까지 공개.",
    date: "2025.01.03",
    readTime: "7분",
    color: "#fff8e1",
    emoji: "💰",
    featured: false,
  },
  {
    id: 9,
    category: "브랜드스토리",
    title: "달바(d'Alba)의 글로벌 성공 비결: SCM 전략",
    desc: "한국 중소 뷰티 브랜드가 유럽 시장을 공략한 공급망 관리 전략 분석.",
    date: "2024.12.30",
    readTime: "6분",
    color: "#e0f2f1",
    emoji: "🏆",
    featured: false,
  },
];

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
