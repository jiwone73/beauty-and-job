"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ChevronRight, MapPin, Users, Bookmark } from "lucide-react";

const CATEGORIES = ["전체", "화장품 브랜드", "에스테틱", "헤어", "네일", "스파", "리테일", "교육", "제조·유통", "플랫폼"];

const BRANDS = [
  { id: 1, name: "아누아", category: "화장품 브랜드", desc: "클린 스킨케어 브랜드. 피부 본연의 건강함을 추구합니다.", location: "서울 성동구", size: "50~100명", jobs: 3, color: "#e8f5e9", emoji: "🌿", tags: ["스킨케어", "글로벌", "틱톡샵"] },
  { id: 2, name: "달바", category: "화장품 브랜드", desc: "이탈리아 화이트 트러플 기반의 프리미엄 스킨케어 브랜드.", location: "서울 강남구", size: "100~300명", jobs: 5, color: "#fce4ec", emoji: "🤍", tags: ["스킨케어", "글로벌", "프리미엄"] },
  { id: 3, name: "닥터자르트", category: "화장품 브랜드", desc: "더마코스메틱의 선두주자. 피부과학 기반 뷰티 솔루션.", location: "서울 강남구", size: "300명 이상", jobs: 8, color: "#e8eaf6", emoji: "🔬", tags: ["더마", "글로벌", "OEM"] },
  { id: 4, name: "라운드랩", category: "화장품 브랜드", desc: "자연 유래 성분으로 만드는 진짜 스킨케어.", location: "서울 마포구", size: "50~100명", jobs: 2, color: "#e0f7fa", emoji: "💧", tags: ["스킨케어", "클린뷰티"] },
  { id: 5, name: "메디큐브", category: "화장품 브랜드", desc: "피부과학을 담은 홈케어 뷰티 디바이스 브랜드.", location: "서울 강남구", size: "100~300명", jobs: 6, color: "#fff3e0", emoji: "⚡", tags: ["디바이스", "홈케어", "글로벌"] },
  { id: 6, name: "하우스 오브 밸런스", category: "화장품 브랜드", desc: "K-뷰티 글로벌 유통 전문 기업. 다수 브랜드 운영.", location: "서울 서초구", size: "50~100명", jobs: 4, color: "#f3e8f7", emoji: "🏆", tags: ["유통", "글로벌", "MD"] },
  { id: 7, name: "올리브영", category: "리테일", desc: "국내 최대 H&B 스토어. 다양한 뷰티 브랜드의 판매 플랫폼.", location: "서울 중구", size: "1000명 이상", jobs: 12, color: "#e8f5e9", emoji: "🛍️", tags: ["리테일", "오프라인", "온라인"] },
  { id: 8, name: "에이피알", category: "화장품 브랜드", desc: "메디큐브, 에이프릴스킨 등 멀티 브랜드 운영 기업.", location: "서울 강남구", size: "300명 이상", jobs: 9, color: "#fff8e1", emoji: "✨", tags: ["멀티브랜드", "글로벌", "D2C"] },
  { id: 9, name: "더헤어샵", category: "헤어", desc: "프리미엄 헤어케어 살롱 & 브랜드.", location: "서울 강남구", size: "10~50명", jobs: 3, color: "#fce4ec", emoji: "💇", tags: ["헤어", "살롱", "케어"] },
  { id: 10, name: "리브네일", category: "네일", desc: "전국 네일 아트 프랜차이즈. 체계적인 교육 시스템.", location: "서울 종로구", size: "10~50명", jobs: 5, color: "#f8bbd0", emoji: "💅", tags: ["네일", "프랜차이즈", "교육"] },
  { id: 11, name: "스파1899", category: "스파", desc: "전통 한방을 현대적으로 재해석한 프리미엄 스파.", location: "서울 용산구", size: "50~100명", jobs: 4, color: "#e0f2f1", emoji: "♨️", tags: ["스파", "웰니스", "한방"] },
  { id: 12, name: "코스맥스", category: "제조·유통", desc: "글로벌 화장품 ODM 1위 기업.", location: "서울 중구", size: "1000명 이상", jobs: 15, color: "#e8eaf6", emoji: "🏭", tags: ["ODM", "제조", "글로벌"] },
];

export default function BrandsPage() {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarks, setBookmarks] = useState<number[]>([]);

  const filtered = BRANDS.filter((b) => {
    const matchCat = activeCategory === "전체" || b.category === activeCategory;
    const matchSearch = !searchQuery || b.name.includes(searchQuery) || b.desc.includes(searchQuery) || b.tags.some((t) => t.includes(searchQuery));
    return matchCat && matchSearch;
  });

  const toggleBookmark = (id: number) => {
    setBookmarks((prev) => prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]);
  };

  return (
    <div className="brands-page">
      {/* 헤더 */}
      <header className="jobs-header">
        <div className="jobs-header-inner">
          <Link href="/" className="jobs-logo">
            <Image src="/images/logo.png" alt="뷰티앤잡" width={130} height={34} priority />
          </Link>
          <nav className="jobs-gnb">
            <Link href="/jobs" className="jobs-gnb-item">채용공고</Link>
            <Link href="/brands" className="jobs-gnb-item active">회사 둘러보기</Link>
            <Link href="/profile/resume" className="jobs-gnb-item">이력서 <span className="jobs-gnb-badge green">합격률 UP</span></Link>
            <Link href="/salary" className="jobs-gnb-item">연봉어택 <span className="jobs-gnb-badge purple">경력직</span></Link>
            <Link href="/insights" className="jobs-gnb-item">인사이트 <span className="jobs-gnb-badge dark">NEWS</span></Link>
          </nav>
          <div className="jobs-header-right">
            <Link href="/signup" className="jobs-start-btn">시작하기</Link>
            <Link href="/company" className="jobs-biz-btn">기업 서비스</Link>
          </div>
        </div>
      </header>

      <div className="brands-container">
        {/* 히어로 */}
        <div className="brands-hero">
          <h1 className="brands-hero-title">뷰티 업계 브랜드 탐색</h1>
          <p className="brands-hero-desc">화장품 브랜드부터 에스테틱, 헤어, 네일, 스파까지<br />뷰티 산업의 다양한 기업을 만나보세요</p>
          <div className="brands-search-box">
            <Search size={18} className="brands-search-icon" />
            <input
              className="brands-search-input"
              placeholder="브랜드명, 직무, 키워드로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* 카테고리 탭 */}
        <div className="brands-tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`brands-tab ${activeCategory === cat ? "active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 결과 수 */}
        <div className="brands-count">
          <span>총 <strong>{filtered.length}개</strong> 기업</span>
        </div>

        {/* 브랜드 그리드 */}
        <div className="brands-grid">
          {filtered.map((brand) => (
            <div key={brand.id} className="brands-card">
              {/* 썸네일 */}
              <div className="brands-card-thumb" style={{ background: brand.color }}>
                <span className="brands-card-emoji">{brand.emoji}</span>
                <button
                  className={`brands-card-bookmark ${bookmarks.includes(brand.id) ? "active" : ""}`}
                  onClick={() => toggleBookmark(brand.id)}
                >
                  <Bookmark size={16} fill={bookmarks.includes(brand.id) ? "currentColor" : "none"} />
                </button>
              </div>

              {/* 카드 정보 */}
              <div className="brands-card-body">
                <div className="brands-card-top">
                  <span className="brands-card-category">{brand.category}</span>
                </div>
                <h3 className="brands-card-name">{brand.name}</h3>
                <p className="brands-card-desc">{brand.desc}</p>

                <div className="brands-card-meta">
                  <div className="brands-card-meta-item">
                    <MapPin size={12} />
                    <span>{brand.location}</span>
                  </div>
                  <div className="brands-card-meta-item">
                    <Users size={12} />
                    <span>{brand.size}</span>
                  </div>
                </div>

                <div className="brands-card-tags">
                  {brand.tags.map((tag) => (
                    <span key={tag} className="brands-card-tag">#{tag}</span>
                  ))}
                </div>

                <div className="brands-card-footer">
                  <span className="brands-card-jobs">채용 중 {brand.jobs}개</span>
                  <Link href="/jobs" className="brands-card-cta">
                    공고 보기 <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
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
