"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, MapPin } from "lucide-react";

const REGION_OPTIONS = ["지역 전체", "서울", "경기", "인천", "부산", "대구", "광주", "대전", "해외"];

export default function HeroMobile() {
  const router = useRouter();
  const [jobType, setJobType] = useState<"기업" | "매장">("기업");
  const [region, setRegion] = useState("지역 전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [showRegion, setShowRegion] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("type", jobType);
    if (region !== "지역 전체") params.set("region", region);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    router.push(`/jobs?${params.toString()}`);
  };

  return (
    <section className="hero-m" onClick={() => setShowRegion(false)}>

      {/* 배너 */}
      <div className="hero-m-banner">
        <span className="hero-m-banner-ad">AD</span>
        <p className="hero-m-banner-text">🎀 뷰티앤잡 × 아모레퍼시픽 — 봄 채용 시즌 공개!</p>
        <Link href="/jobs" className="hero-m-banner-link">보기 →</Link>
      </div>

      {/* 타이틀 */}
      <div className="hero-m-title-wrap">
        <h1 className="hero-m-title">
          뷰티 커리어의 시작,<br />
          <span className="hero-m-title-point">뷰티앤잡</span>
        </h1>
      </div>

      {/* 기업/매장 토글 */}
      <div className="hero-m-toggle">
        {(["기업", "매장"] as const).map((t) => (
          <button key={t} type="button"
            className={`hero-m-toggle-btn ${jobType === t ? "active" : ""}`}
            onClick={() => setJobType(t)}>
            {t === "기업" ? "🏢 기업" : "🏪 매장"}
          </button>
        ))}
      </div>

      {/* 검색바 */}
      <form className="hero-m-search" onSubmit={handleSearch} onClick={(e) => e.stopPropagation()}>
        <div className="hero-m-region-wrap">
          <button type="button" className="hero-m-region-btn"
            onClick={(e) => { e.stopPropagation(); setShowRegion(!showRegion); }}>
            <MapPin size={13} />
            <span>{region}</span>
            <i className="caret" />
          </button>
          {showRegion && (
            <div className="hero-region-drop">
              {REGION_OPTIONS.map((o) => (
                <button key={o} type="button"
                  className={`hero-region-item ${region === o ? "selected" : ""}`}
                  onClick={() => { setRegion(o); setShowRegion(false); }}>
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>
        <input className="hero-m-input" type="text"
          placeholder="직무, 회사, 키워드로 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} />
        <button type="submit" className="hero-m-search-btn">
          <Search size={18} />
        </button>
      </form>

      {/* 프로모션 카드 */}
      <div className="hero-m-ai-wrap">
        <div className="hero-m-ai-header">
          <span>🔥</span>
          <span className="hero-m-ai-title">지금은 상단 노출 0원 · 연말까지만 (~12/31)</span>
        </div>
        <div className="hero-m-ai-cards">
          <Link href="/jobseeker" className="hero-m-ai-card">
            <div className="hero-m-ai-card-icon">📄</div>
            <strong>이력서 등록하면<br />먼저 연락와요</strong>
            <p>등록만 해두면 매장·기업이 먼저 제안하고, 내 이력서가 검색 맨 위에 노출돼요</p>
            <span className="hero-m-ai-card-btn">무료 이력서 등록하기 ›</span>
          </Link>
          <Link href="/company" className="hero-m-ai-card">
            <div className="hero-m-ai-card-icon">📊</div>
            <strong>공고 올리면<br />인재가 바로 보여요</strong>
            <p>공고 등록도, 상단 노출도, 인재 연락처 열람도 지금은 전부 0원</p>
            <span className="hero-m-ai-card-btn">채용공고 등록하기 ›</span>
          </Link>
        </div>
      </div>

    </section>
  );
}
