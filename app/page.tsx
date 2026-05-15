"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import Header from "@/components/Header";
import HeroMobile from "@/components/HeroMobile";
import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Globe,
  GraduationCap,
  Mail,
  CheckCircle,
  MapPin,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="main-page">
      <Header />
      <MobileDetector />
      <SectionPick />
      <SectionInsights />
      <SectionNewsletter />
      <SectionPremium />
      <SectionIntern />
      <SectionGlobal />
      <Footer />
    </main>
  );
}


/* ============================================
   히어로 섹션
   ============================================ */
const JOB_OPTIONS = ["마케팅", "MD", "영업", "디자인", "연구개발(RA)", "SCM·물류", "HR", "경영지원"];
const REGION_OPTIONS = ["지역 전체", "서울", "경기", "인천", "부산", "대구", "광주", "대전", "해외"];

function MobileDetector() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile ? <HeroMobile /> : <Hero />;
}

function Hero() {
  const router = useRouter();
  const { isLoggedIn } = useAuthStore();
  const [region, setRegion] = useState("지역 전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [showRegionDrop, setShowRegionDrop] = useState(false);
  const [jobType, setJobType] = useState<"기업" | "매장">("기업");

  const REGION_OPTIONS = ["지역 전체", "서울", "경기", "인천", "부산", "대구", "광주", "대전", "해외"];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("type", jobType);
    if (region !== "지역 전체") params.set("region", region);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    router.push(`/jobs${params.toString() ? "?" + params.toString() : ""}`);
  };

  return (
    <section className="hero" onClick={() => setShowRegionDrop(false)}>

      {/* 배너광고 - 전체 너비 */}
      <div className="hero-wrap">
        {/* 배너광고 */}
        <div className="hero-banner-top-inner">
          <span className="hero-banner-badge">AD</span>
          <p className="hero-banner-title">🎀 뷰티앤잡 × 아모레퍼시픽 — 봄 채용 시즌 공개!</p>
          <p className="hero-banner-sub">마케터·MD·연구원 등 50개+ 포지션 지금 확인하세요</p>
          <Link href="/jobs" className="hero-banner-link">공고 보기 →</Link>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="hero-inner">

        {/* 왼쪽: 텍스트 + 검색 */}
        <div className="hero-text">
          <h1 className="hero-title">
            뷰티 커리어의 시작,<br />
            <span className="hero-title-point">뷰티앤잡</span>
          </h1>
          <p className="hero-sub">
            뷰티 업계 채용, 이직, 커리어까지<br />한 번에
          </p>
          <form className="hero-search-bar" onSubmit={handleSearch} onClick={(e) => e.stopPropagation()}>
            <div className="hero-type-toggle">
              <button type="button"
                className={`hero-type-btn ${jobType === "기업" ? "active" : ""}`}
                onClick={() => setJobType("기업")}>
                🏢 기업
              </button>
              <button type="button"
                className={`hero-type-btn ${jobType === "매장" ? "active" : ""}`}
                onClick={() => setJobType("매장")}>
                🏪 매장
              </button>
            </div>
            <div className="hero-search-divider" />
            <div className="hero-region-wrap">
              <button type="button" className="hero-region-btn"
                onClick={() => setShowRegionDrop(!showRegionDrop)}>
                <MapPin size={14} />
                <span>{region}</span>
                <i className="caret" />
              </button>
              {showRegionDrop && (
                <div className="hero-region-drop">
                  {REGION_OPTIONS.map((o) => (
                    <button key={o} type="button"
                      className={`hero-region-item ${region === o ? "selected" : ""}`}
                      onClick={() => { setRegion(o); setShowRegionDrop(false); }}>
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="hero-search-divider" />
            <input className="hero-search-input" type="text"
              placeholder="직무, 회사, 키워드로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} />
            <button type="submit" className="hero-search-btn">
              <Search size={20} />
            </button>
          </form>
        </div>

        {/* 오른쪽: AI 맞춤 커리어 추천 */}
        <div className="hero-right">
          <div className="hero-right-header">
            <span className="hero-ai-icon">✨</span>
            <span className="hero-right-title">AI 맞춤 커리어 추천</span>
          </div>
          <div className="hero-right-cards">

            {/* 카드1: 이력서 등록 */}
            <div className="hero-right-card">
              <div className="hero-right-card-visual card1">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <rect x="15" y="10" width="42" height="52" rx="6" fill="#e8d5f5" />
                  <rect x="15" y="10" width="42" height="52" rx="6" fill="white" opacity="0.6"/>
                  <rect x="22" y="22" width="12" height="12" rx="6" fill="#c4a0d8" />
                  <rect x="22" y="38" width="28" height="3" rx="1.5" fill="#dcc8ec" />
                  <rect x="22" y="44" width="22" height="3" rx="1.5" fill="#dcc8ec" />
                  <rect x="22" y="50" width="25" height="3" rx="1.5" fill="#dcc8ec" />
                  <circle cx="52" cy="52" r="12" fill="#5f0080" />
                  <path d="M46 52l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="hero-right-card-title">이력서 등록하면</h3>
              <p className="hero-right-card-desc">내 경력과 관심사에 맞는<br />채용정보를 추천해드려요</p>
              <Link href="/signup" className="hero-right-card-btn">
                무료 이력서 등록하기 ›
              </Link>
            </div>

            {/* 카드2: 취업 전략 */}
            <Link href="/insights" className="hero-right-card card-link">
              <div className="hero-right-card-visual card2">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <rect x="20" y="15" width="35" height="45" rx="5" fill="#fce4f0" />
                  <rect x="20" y="15" width="35" height="45" rx="5" fill="white" opacity="0.5"/>
                  <rect x="27" y="32" width="6" height="16" rx="2" fill="#e8a0c0" />
                  <rect x="36" y="26" width="6" height="22" rx="2" fill="#d060a0" />
                  <rect x="45" y="22" width="6" height="26" rx="2" fill="#b03080" />
                  <circle cx="57" cy="52" r="10" fill="#ff80b0" opacity="0.9"/>
                  <path d="M53 52l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M27 28 L48 18" stroke="#e8a0c0" strokeWidth="1.5" strokeDasharray="2 2"/>
                </svg>
              </div>
              <h3 className="hero-right-card-title accent">취업 전략까지</h3>
              <p className="hero-right-card-desc">직무별 준비 팁, 지원 우선순위,<br />커리어 방향까지 한눈에 확인하세요</p>
            </Link>

          </div>
        </div>
      </div>
      </div>
    </section>
  );
}


/* ============================================
   히어로 SVG 일러스트
   ============================================ */
function HeroVisual() {
  return (
    <svg className="hero-svg" viewBox="0 0 600 480" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="perfumeBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e8c8ee" />
          <stop offset="50%" stopColor="#c89cd6" />
          <stop offset="100%" stopColor="#9a6cb0" />
        </linearGradient>
        <linearGradient id="perfumeHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <linearGradient id="lipstickCase" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e0c4e8" />
          <stop offset="50%" stopColor="#b89cc8" />
          <stop offset="100%" stopColor="#8a6c9a" />
        </linearGradient>
        <linearGradient id="lipstickColor" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#9a3eb8" />
          <stop offset="100%" stopColor="#5f0080" />
        </linearGradient>
        <linearGradient id="potBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f0d8f5" />
          <stop offset="100%" stopColor="#c89cd6" />
        </linearGradient>
        <radialGradient id="cream" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#f5e8f8" />
        </radialGradient>
      </defs>
      <circle cx="300" cy="240" r="200" fill="#f3e8f7" opacity="0.5" />
      <circle cx="120" cy="100" r="40" fill="#e8c8ee" opacity="0.6" />
      <circle cx="500" cy="380" r="50" fill="#d8a8e8" opacity="0.5" />
      <circle cx="480" cy="80" r="25" fill="#c89cd6" opacity="0.6" />
      <g>
        <rect x="240" y="200" width="120" height="180" rx="12" fill="url(#perfumeBody)" />
        <rect x="240" y="200" width="60" height="180" rx="12" fill="url(#perfumeHighlight)" />
        <rect x="270" y="180" width="60" height="30" rx="4" fill="#8a6c9a" />
        <rect x="285" y="160" width="30" height="25" rx="2" fill="#5f0080" />
        <circle cx="370" cy="195" r="18" fill="#fff" opacity="0.8" />
        <circle cx="370" cy="195" r="12" fill="#c89cd6" />
        <rect x="260" y="270" width="80" height="40" rx="4" fill="#fff" opacity="0.9" />
        <text x="300" y="287" textAnchor="middle" fill="#5f0080" fontSize="10" fontWeight="700" fontFamily="Pretendard">BEAUTY</text>
        <text x="300" y="302" textAnchor="middle" fill="#9a6cb0" fontSize="8" fontFamily="Pretendard">&amp; JOB</text>
      </g>
      <g transform="translate(80, 240) rotate(-15)">
        <rect x="0" y="0" width="40" height="120" rx="6" fill="url(#lipstickCase)" />
        <rect x="0" y="0" width="20" height="120" rx="6" fill="url(#perfumeHighlight)" />
        <rect x="8" y="-40" width="24" height="45" rx="3" fill="url(#lipstickColor)" />
        <ellipse cx="20" cy="-38" rx="12" ry="6" fill="#7a1a9a" />
      </g>
      <g transform="translate(420, 280)">
        <ellipse cx="50" cy="80" rx="55" ry="15" fill="#9a6cb0" opacity="0.3" />
        <rect x="0" y="20" width="100" height="65" rx="8" fill="url(#potBody)" />
        <ellipse cx="50" cy="20" rx="50" ry="10" fill="#d8a8e8" />
        <ellipse cx="50" cy="20" rx="42" ry="7" fill="url(#cream)" />
      </g>
      <g transform="translate(140, 360)">
        <rect x="0" y="0" width="30" height="80" rx="4" fill="#5f0080" />
        <rect x="0" y="0" width="15" height="80" rx="4" fill="url(#perfumeHighlight)" />
        <rect x="8" y="-25" width="14" height="28" rx="2" fill="#3a004f" />
        <line x1="15" y1="-30" x2="15" y2="-50" stroke="#3a004f" strokeWidth="2" />
        <ellipse cx="15" cy="-50" rx="4" ry="8" fill="#3a004f" />
      </g>
      <g fill="#c89cd6" opacity="0.7">
        <path d="M 100 200 L 105 215 L 120 220 L 105 225 L 100 240 L 95 225 L 80 220 L 95 215 Z" />
      </g>
      <g fill="#e8c8ee" opacity="0.8">
        <path d="M 480 200 L 483 209 L 492 212 L 483 215 L 480 224 L 477 215 L 468 212 L 477 209 Z" />
      </g>
    </svg>
  );
}

/* ============================================
   섹션 1: 뷰티앤잡 Pick
   ============================================ */
const PICK_JOBS = [
  { id: 1, brand: "올리브영", tag: "경력 3~5년", tagType: "primary", title: "올리브영 MD - 색조 카테고리 매니저", location: "서울 중구", type: "정규직", deadline: "D-7" },
  { id: 2, brand: "아모레퍼시픽", tag: "신입/경력", tagType: "soft", title: "헤라 브랜드 마케팅 매니저", location: "서울 용산구", type: "정규직", deadline: "D-12" },
  { id: 3, brand: "LG생활건강", tag: "경력 5년+", tagType: "primary", title: "더후 글로벌 영업 PM", location: "서울 종로구", type: "정규직", deadline: "D-3" },
  { id: 4, brand: "닥터지", tag: "경력 2~4년", tagType: "soft", title: "퍼포먼스 마케터 (그로스)", location: "서울 강남구", type: "정규직", deadline: "D-15" },
];

function SectionPick() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="section-title">
              <Sparkles size={24} className="title-icon" />
              뷰티앤잡 Pick
            </h2>
            <p className="section-sub">에디터가 엄선한 이번 주의 추천 채용공고</p>
          </div>
          <Link href="/jobs" className="see-all">전체보기 →</Link>
        </div>
        <div className="card-grid card-grid-4">
          {PICK_JOBS.map((job) => (
            <JobCard key={job.id} {...job} />
          ))}
        </div>
      </div>
    </section>
  );
}

function JobCard({ id, brand, tag, tagType, title, location, type, deadline }: {
  id: number; brand: string; tag: string; tagType: string;
  title: string; location: string; type: string; deadline: string;
}) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(false);

  return (
    <div className="job-card" onClick={() => router.push(`/jobs/${id}`)} style={{ cursor: "pointer" }}>
      <div className="card-header">
        <span className="card-brand">{brand}</span>
        <button className={`bookmark ${bookmarked ? "active" : ""}`}
          onClick={(e) => { e.stopPropagation(); setBookmarked(!bookmarked); }}
          aria-label="북마크">
          <Bookmark size={18} fill={bookmarked ? "currentColor" : "none"} />
        </button>
      </div>
      <span className={`card-tag card-tag-${tagType}`}>{tag}</span>
      <h3 className="card-title">{title}</h3>
      <div className="card-meta">
        <span>{location}</span>
        <span className="dot">·</span>
        <span>{type}</span>
      </div>
      <div className="card-deadline">{deadline}</div>
    </div>
  );
}

/* ============================================
   섹션 2: 뷰티 업계 인사이트 (4장)
   ============================================ */
const INSIGHTS_DATA = [
  { id: 1, category: "트렌드", title: "2025 뷰티 산업, 무엇이 달라지나?", desc: "K-뷰티의 글로벌 확장과 클린뷰티 트렌드가 만드는 새로운 기회", date: "2025.01.15", emoji: "✨" },
  { id: 2, category: "커리어", title: "뷰티 MD가 되기 위한 5가지 필수 역량", desc: "현직 MD가 알려주는 진짜 실전 노하우와 커리어 패스 가이드", date: "2025.01.12", emoji: "💼" },
  { id: 3, category: "연봉정보", title: "뷰티 업계 직무별 연봉 리포트 2025", desc: "마케팅, MD, 디자인 등 주요 직무 연봉 데이터 전격 공개", date: "2025.01.10", emoji: "📊" },
  { id: 4, category: "인터뷰", title: "아모레퍼시픽 10년차 마케터가 말하는 뷰티 커리어", desc: "현직자가 직접 전하는 뷰티 업계 취업 & 이직 현실 이야기", date: "2025.01.08", emoji: "🎤" },
];

function SectionInsights() {
  const router = useRouter();

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="section-title">뷰티 업계 인사이트</h2>
            <p className="section-sub">최신 트렌드와 커리어 정보를 한 눈에</p>
          </div>
          <Link href="/insights" className="see-all">전체보기 →</Link>
        </div>
        <div className="card-grid card-grid-4">
          {INSIGHTS_DATA.map((item) => (
            <article key={item.id} className="insight-card"
              onClick={() => router.push(`/insights/${item.id}`)}
              style={{ cursor: "pointer" }}>
              <div className="insight-image">
                <div className="insight-image-placeholder">{item.emoji}</div>
              </div>
              <span className="insight-category">{item.category}</span>
              <h3 className="insight-title">{item.title}</h3>
              <p className="insight-desc">{item.desc}</p>
              <time className="insight-date">{item.date}</time>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================
   섹션 3: 뉴스레터
   ============================================ */
function SectionNewsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) { setError("이메일 주소를 입력해주세요."); return; }
    if (!emailRegex.test(email)) { setError("올바른 이메일 형식을 입력해주세요."); return; }
    setError("");
    setSubmitted(true);
  };

  return (
    <section className="section">
      <div className="container">
        <div className="newsletter-box">
          {submitted ? (
            <div className="newsletter-success">
              <CheckCircle size={40} className="newsletter-success-icon" />
              <h3 className="newsletter-success-title">구독 신청이 완료되었습니다! 🎉</h3>
              <p className="newsletter-success-desc">
                <strong>{email}</strong>으로 매주 화요일 뷰티 업계 소식을 보내드릴게요.<br />
                스팸 폴더도 한 번 확인해주세요.
              </p>
              <button className="newsletter-reset-btn" onClick={() => { setSubmitted(false); setEmail(""); }}>
                다른 이메일로 구독하기
              </button>
            </div>
          ) : (
            <>
              <div className="newsletter-text">
                <Mail size={28} className="newsletter-icon" />
                <h2 className="newsletter-title">뷰티앤잡 뉴스레터 구독하기</h2>
                <p className="newsletter-sub">
                  매주 화요일, 엄선된 뷰티 채용 소식과 업계 인사이트를 메일함에서 만나보세요
                </p>
              </div>
              <form className="newsletter-form" onSubmit={handleSubmit}>
                <div className="newsletter-input-wrap">
                  <input
                    type="email"
                    placeholder="이메일 주소를 입력해주세요"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    className={error ? "error" : ""}
                  />
                  {error && <p className="newsletter-error">{error}</p>}
                </div>
                <button type="submit">구독하기</button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============================================
   섹션 4: 고급경력직 채용관 (밝은 배경)
   ============================================ */
const PREMIUM_JOBS = [
  { id: 1, brand: "샤넬코리아", title: "Brand Director, Fragrance", meta: "10년+ · 임원급", salary: "협의" },
  { id: 2, brand: "에스티로더", title: "Marketing Senior Manager", meta: "8년+ · 시니어", salary: "1억 2천+" },
  { id: 3, brand: "닥터자르트", title: "Global Brand Lead", meta: "10년+ · 디렉터", salary: "1억 5천+" },
  { id: 4, brand: "VT코스메틱스", title: "Head of Marketing", meta: "10년+ · 임원급", salary: "협의" },
];

function SectionPremium() {
  const router = useRouter();

  return (
    <section className="section section-premium-bg">
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="section-title">
              <Sparkles size={22} className="title-icon" />
              고급경력직 채용관
            </h2>
            <p className="section-sub">경력 10년 이상의 시니어를 위한 프리미엄 포지션</p>
          </div>
          <Link href="/jobs" className="see-all">전체보기 →</Link>
        </div>
        <div className="card-grid card-grid-4">
          {PREMIUM_JOBS.map((item) => (
            <div key={item.id} className="premium-card"
              onClick={() => router.push(`/jobs/${item.id}`)}
              style={{ cursor: "pointer" }}>
              <span className="premium-badge">PREMIUM</span>
              <div className="premium-brand">{item.brand}</div>
              <h3 className="premium-title">{item.title}</h3>
              <div className="premium-meta">{item.meta}</div>
              <div className="premium-salary">
                <span className="premium-salary-label">연봉</span>
                <span className="premium-salary-value">{item.salary}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================
   섹션 5: 뷰티 인턴 채용관
   ============================================ */
const INTERN_JOBS = [
  { id: 5, brand: "이니스프리", type: "체험형 인턴", title: "마케팅 인턴 (3개월)", location: "서울" },
  { id: 6, brand: "토니모리", type: "정규직 전환형", title: "MD 어시스턴트 인턴", location: "경기 안양" },
  { id: 7, brand: "에이블씨엔씨", type: "체험형 인턴", title: "디자인팀 인턴", location: "서울 강남" },
  { id: 8, brand: "코스맥스", type: "정규직 전환형", title: "R&D 인턴", location: "경기 화성" },
];

function SectionIntern() {
  const router = useRouter();

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="section-title">
              <GraduationCap size={22} className="title-icon" />
              뷰티 인턴 채용관
            </h2>
            <p className="section-sub">뷰티 커리어의 첫 걸음을 응원합니다</p>
          </div>
          <Link href="/jobs" className="see-all">전체보기 →</Link>
        </div>
        <div className="card-grid card-grid-4">
          {INTERN_JOBS.map((item, i) => (
            <div key={item.id} className="intern-card"
              onClick={() => router.push(`/jobs/${item.id}`)}
              style={{ cursor: "pointer" }}>
              <div className="intern-brand">{item.brand}</div>
              <span className={`intern-type intern-type-${i % 2 === 0 ? "exp" : "regular"}`}>{item.type}</span>
              <h3 className="intern-title">{item.title}</h3>
              <div className="intern-location">📍 {item.location}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================
   섹션 6: 글로벌 뷰티 커리어 채용관
   ============================================ */
const GLOBAL_JOBS = [
  { id: 9, flag: "🇫🇷", country: "France", brand: "L'Oréal Paris", title: "Global Marketing Manager", city: "Paris" },
  { id: 10, flag: "🇺🇸", country: "USA", brand: "Estée Lauder", title: "Brand Strategist", city: "New York" },
  { id: 11, flag: "🇯🇵", country: "Japan", brand: "SK-II", title: "Regional Marketing Lead", city: "Tokyo" },
  { id: 12, flag: "🇸🇬", country: "Singapore", brand: "Shiseido APAC", title: "Digital Marketing Manager", city: "Singapore" },
];

function SectionGlobal() {
  const router = useRouter();

  return (
    <section className="section section-last">
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="section-title">
              <Globe size={22} className="title-icon" />
              글로벌 뷰티 커리어 채용관
            </h2>
            <p className="section-sub">전 세계 뷰티 브랜드에서 당신을 기다립니다</p>
          </div>
          <Link href="/jobs" className="see-all">전체보기 →</Link>
        </div>
        <div className="card-grid card-grid-4">
          {GLOBAL_JOBS.map((item) => (
            <div key={item.id} className="global-card"
              onClick={() => router.push(`/jobs/${item.id}`)}
              style={{ cursor: "pointer" }}>
              <div className="global-flag">{item.flag}</div>
              <div className="global-country">{item.country}</div>
              <div className="global-brand">{item.brand}</div>
              <h3 className="global-title">{item.title}</h3>
              <div className="global-city">📍 {item.city}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================
   푸터
   ============================================ */
function Footer() {
  return (
    <footer className="footer-new">
      <div className="footer-new-top">
        {/* 로고 + 태그라인만 */}
        <div className="footer-new-brand">
          <Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} className="footer-new-logo" />
          <p className="footer-new-tagline">뷰티 산업 종사자를 위한 단 하나의 커리어 플랫폼</p>
        </div>

        {/* 링크 컬럼 */}
        <div className="footer-new-links">
          <div className="footer-new-col">
            <h4>회사</h4>
            <Link href="/about">회사 소개</Link>
            <Link href="/about/recruit">채용</Link>
            <Link href="/about/partnership">제휴 문의</Link>
            <Link href="/about/advertise">광고 문의</Link>
            <Link href="/about/contact">기타 문의</Link>
          </div>
          <div className="footer-new-col">
            <h4>고객지원</h4>
            <Link href="/support">고객센터</Link>
            <Link href="/support/faq">자주 묻는 질문</Link>
            <Link href="/support/terms">이용약관</Link>
            <Link href="/support/privacy">개인정보처리방침</Link>
          </div>
        </div>

        {/* 기업회원 CTA */}
        <div className="footer-new-cta">
          <p className="footer-new-cta-text">우리 회사도 채용하고 싶다면?</p>
          <Link href="/company" className="footer-new-cta-btn">기업회원 바로가기</Link>
        </div>
      </div>

      <div className="footer-new-divider" />

      <div className="footer-new-bottom">
        <div className="footer-new-company-row">
          <span className="footer-new-company-name">(주)뷰티앤잡</span>
        </div>
        <div className="footer-new-details">
          <span>주소 :</span>
          <span>사업자등록번호 :</span>
          <span>통신판매업신고번호 :</span>
          <span>유료직업소개사업 등록번호 :</span>
          <span>직업정보제공사업 신고번호 :</span>
        </div>
        <div className="footer-new-copy">
          <span>© 2025 Beauty&amp;Job. All rights reserved.</span>
          <div className="footer-new-policies">
            <Link href="/support/terms" className="footer-new-info-link">이용약관</Link>
            <Link href="/support/privacy" className="footer-new-info-link">개인정보 처리방침</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ============================================
   GNB 인증 버튼
   ============================================ */
function AuthButtons() {
  const router = useRouter();
  const { isLoggedIn, userName, logout } = useAuthStore();
  const [open, setOpen] = useState(false);

  if (isLoggedIn) {
    return (
      <>
        <div className="auth-user-wrap">
          <button className="auth-user-btn" onClick={() => setOpen(!open)}>
            <span className="auth-avatar">
              {userName ? userName.slice(0, 1).toUpperCase() : "U"}
            </span>
            <span className="auth-username">{userName || "내 계정"}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 5l4 4 4-4" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          {open && (
            <div className="auth-dropdown">
              <button className="auth-dropdown-item" onClick={() => { setOpen(false); router.push("/profile"); }}>내 프로필</button>
              <button className="auth-dropdown-item" onClick={() => { setOpen(false); router.push("/profile/resume"); }}>이력서</button>
              <div className="auth-dropdown-divider" />
              <button className="auth-dropdown-item auth-logout" onClick={() => { logout(); setOpen(false); }}>로그아웃</button>
            </div>
          )}
        </div>
        <Link href="/company" className="btn btn-dark"><Building2 size={16} />기업 서비스</Link>
      </>
    );
  }

  return (
    <>
      <Link href="/login" className="btn btn-text">로그인</Link>
      <Link href="/signup" className="btn btn-primary">회원가입</Link>
      <Link href="/company" className="btn btn-dark"><Building2 size={16} />기업 서비스</Link>
    </>
  );
}
