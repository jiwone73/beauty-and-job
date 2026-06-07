"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { SIDO_LIST, getSigunguList } from "@/lib/data/regions";

export default function HeroMobile() {
  const router = useRouter();
  const [jobType, setJobType] = useState<"기업" | "매장">("기업");
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const sigunguOptions = sido ? getSigunguList(sido) : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("type", jobType);
    if (sido) params.set("sido", sido);
    if (sigungu) params.set("sigungu", sigungu);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    router.push(`/jobs?${params.toString()}`);
  };

  return (
    <section className="hero-m">

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
            {t === "기업" ? "🏢 사무직" : "🏪 매장직"}
          </button>
        ))}
      </div>

      {/* 검색 영역 (2단) */}
      <form className="hero-m-search-wrap" onSubmit={handleSearch}>
        <p className="hero-m-search-label">어떤 일자리를 찾으세요?</p>
        {/* 윗줄: 시도 + 구군 */}
        <div className="hero-m-region-row">
          <select
            className="hero-m-select"
            value={sido}
            onChange={(e) => { setSido(e.target.value); setSigungu(""); }}>
            <option value="">전체</option>
            {SIDO_LIST.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            className="hero-m-select"
            value={sigungu}
            disabled={!sido}
            onChange={(e) => setSigungu(e.target.value)}>
            <option value="">전체</option>
            {sigunguOptions.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* 아랫줄: 키워드 + 검색버튼 */}
        <div className="hero-m-search">
          <input className="hero-m-input" type="text"
            placeholder={jobType === "매장" ? "헤어 디자이너, 네일리스트, 실장…" : "마케터, MD, 영업, 연구원…"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} />
          <button type="submit" className="hero-m-search-btn">
            <Search size={18} />
          </button>
        </div>
      </form>

      {/* 프로모션 카드 */}
      <div className="hero-m-ai-wrap">
        <div className="hero-m-ai-header">
          <span>🔥</span>
          <span className="hero-m-ai-title">뷰티앤잡 런칭 이벤트 · 지금은 완전 무료 (~12/31)</span>
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