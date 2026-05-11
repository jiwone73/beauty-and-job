"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="main-page">
      {/* ===== 헤더 ===== */}
      <Header />

      {/* ===== 히어로 ===== */}
      <Hero />

      {/* ===== 뷰티앤잡 Pick ===== */}
      <SectionPick />

      {/* ===== 뷰티 업계 인사이트 ===== */}
      <SectionInsights />

      {/* ===== 뉴스레터 ===== */}
      <SectionNewsletter />

      {/* ===== 고급경력직 채용관 ===== */}
      <SectionPremium />

      {/* ===== 뷰티 인턴 채용관 ===== */}
      <SectionIntern />

      {/* ===== 글로벌 뷰티 커리어 채용관 ===== */}
      <SectionGlobal />

      {/* ===== 푸터 ===== */}
      <Footer />
    </main>
  );
}

/* ============================================
   헤더
   ============================================ */
function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="logo">
          <Image
            src="/images/logo.png"
            alt="뷰티앤잡"
            width={140}
            height={40}
            priority
          />
        </Link>

        <nav className="gnb">
          <Link href="/jobs">채용공고</Link>
          <Link href="/brands">브랜드</Link>
          <Link href="/profile/resume">이력서</Link>
          <Link href="/salary" className="gnb-with-tag">
            연봉·이직 제안
            <span className="tag tag-gray">경력직</span>
          </Link>
          <Link href="/insights" className="gnb-with-tag">
            인사이트
            <span className="tag tag-new">NEW</span>
          </Link>
        </nav>

        <div className="header-right">
          <button className="icon-btn" aria-label="검색">
            <Search size={20} />
          </button>
          <Link href="/signup" className="btn btn-text">
            로그인
          </Link>
          <Link href="/signup" className="btn btn-primary">
            회원가입
          </Link>
          <Link href="/company" className="btn btn-dark">
            <Building2 size={16} />
            기업 서비스
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ============================================
   히어로 섹션
   ============================================ */
function Hero() {
  const router = useRouter();
  const [job, setJob] = useState("");
  const [career, setCareer] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (job) params.set("job", job);
    if (career) params.set("career", career);
    router.push(`/jobs${params.toString() ? "?" + params.toString() : ""}`);
  };

  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-text">
          <h1 className="hero-title">
            뷰티 커리어의 시작,
            <br />
            <span className="hero-title-point">뷰티앤잡</span>
          </h1>
          <p className="hero-sub">
            뷰티 업계 채용, 이직, 커리어까지
            <br />한 번에
          </p>

          <form className="search-box" onSubmit={handleSearch}>
            <div className="search-select">
              <span>직무 선택</span>
              <i className="caret" />
            </div>
            <div className="search-select">
              <span>경력 선택</span>
              <i className="caret" />
            </div>
            <div className="search-select">
              <span>지역 선택</span>
              <i className="caret" />
            </div>
            <div className="search-select">
              <span>브랜드 선택</span>
              <i className="caret" />
            </div>
            <button type="submit" className="search-btn">
              <Search size={16} />
              검색하기
            </button>
          </form>

          <div className="hashtags">
            {["마케팅", "MD·상품기획", "BM·브랜드", "영업", "신입채용"].map(
              (tag) => (
                <button key={tag} className="hashtag">
                  # {tag}
                </button>
              )
            )}
          </div>
        </div>

        {/* 히어로 비주얼 - SVG 일러스트 */}
        <div className="hero-visual" aria-hidden="true">
          <HeroVisual />
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

      {/* 배경 원형 장식 */}
      <circle cx="300" cy="240" r="200" fill="#f3e8f7" opacity="0.5" />
      <circle cx="120" cy="100" r="40" fill="#e8c8ee" opacity="0.6" />
      <circle cx="500" cy="380" r="50" fill="#d8a8e8" opacity="0.5" />
      <circle cx="480" cy="80" r="25" fill="#c89cd6" opacity="0.6" />

      {/* 향수병 (중앙) */}
      <g>
        <rect x="240" y="200" width="120" height="180" rx="12" fill="url(#perfumeBody)" />
        <rect x="240" y="200" width="60" height="180" rx="12" fill="url(#perfumeHighlight)" />
        <rect x="270" y="180" width="60" height="30" rx="4" fill="#8a6c9a" />
        <rect x="285" y="160" width="30" height="25" rx="2" fill="#5f0080" />
        <circle cx="370" cy="195" r="18" fill="#fff" opacity="0.8" />
        <circle cx="370" cy="195" r="12" fill="#c89cd6" />
        {/* 라벨 */}
        <rect x="260" y="270" width="80" height="40" rx="4" fill="#fff" opacity="0.9" />
        <text x="300" y="287" textAnchor="middle" fill="#5f0080" fontSize="10" fontWeight="700" fontFamily="Pretendard">
          BEAUTY
        </text>
        <text x="300" y="302" textAnchor="middle" fill="#9a6cb0" fontSize="8" fontFamily="Pretendard">
          &amp; JOB
        </text>
      </g>

      {/* 립스틱 (왼쪽) */}
      <g transform="translate(80, 240) rotate(-15)">
        <rect x="0" y="0" width="40" height="120" rx="6" fill="url(#lipstickCase)" />
        <rect x="0" y="0" width="20" height="120" rx="6" fill="url(#perfumeHighlight)" />
        <rect x="8" y="-40" width="24" height="45" rx="3" fill="url(#lipstickColor)" />
        <ellipse cx="20" cy="-38" rx="12" ry="6" fill="#7a1a9a" />
      </g>

      {/* 화장품 용기 (오른쪽) */}
      <g transform="translate(420, 280)">
        <ellipse cx="50" cy="80" rx="55" ry="15" fill="#9a6cb0" opacity="0.3" />
        <rect x="0" y="20" width="100" height="65" rx="8" fill="url(#potBody)" />
        <ellipse cx="50" cy="20" rx="50" ry="10" fill="#d8a8e8" />
        <ellipse cx="50" cy="20" rx="42" ry="7" fill="url(#cream)" />
      </g>

      {/* 마스카라 (하단 왼쪽) */}
      <g transform="translate(140, 360)">
        <rect x="0" y="0" width="30" height="80" rx="4" fill="#5f0080" />
        <rect x="0" y="0" width="15" height="80" rx="4" fill="url(#perfumeHighlight)" />
        <rect x="8" y="-25" width="14" height="28" rx="2" fill="#3a004f" />
        <line x1="15" y1="-30" x2="15" y2="-50" stroke="#3a004f" strokeWidth="2" />
        <ellipse cx="15" cy="-50" rx="4" ry="8" fill="#3a004f" />
      </g>

      {/* 작은 별 장식 */}
      <g fill="#c89cd6" opacity="0.7">
        <path d="M 100 200 L 105 215 L 120 220 L 105 225 L 100 240 L 95 225 L 80 220 L 95 215 Z" />
      </g>
      <g fill="#e8c8ee" opacity="0.8">
        <path d="M 480 200 L 483 209 L 492 212 L 483 215 L 480 224 L 477 215 L 468 212 L 477 209 Z" />
      </g>
      <g fill="#d8a8e8" opacity="0.7">
        <circle cx="200" cy="430" r="4" />
        <circle cx="220" cy="440" r="3" />
        <circle cx="240" cy="425" r="5" />
      </g>
    </svg>
  );
}

/* ============================================
   섹션 1: 뷰티앤잡 Pick (채용공고 카드)
   ============================================ */
function SectionPick() {
  const jobs = [
    {
      brand: "올리브영",
      tag: "경력 3~5년",
      tagType: "primary",
      title: "올리브영 MD - 색조 카테고리 매니저",
      location: "서울 중구",
      type: "정규직",
      deadline: "D-7",
    },
    {
      brand: "아모레퍼시픽",
      tag: "신입/경력",
      tagType: "soft",
      title: "헤라 브랜드 마케팅 매니저",
      location: "서울 용산구",
      type: "정규직",
      deadline: "D-12",
    },
    {
      brand: "LG생활건강",
      tag: "경력 5년+",
      tagType: "primary",
      title: "더후 글로벌 영업 PM",
      location: "서울 종로구",
      type: "정규직",
      deadline: "D-3",
    },
    {
      brand: "닥터지",
      tag: "경력 2~4년",
      tagType: "soft",
      title: "퍼포먼스 마케터 (그로스)",
      location: "서울 강남구",
      type: "정규직",
      deadline: "D-15",
    },
  ];

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
          <Link href="/jobs" className="see-all">
            전체보기 →
          </Link>
        </div>

        <div className="card-grid card-grid-4">
          {jobs.map((job, i) => (
            <JobCard key={i} {...job} />
          ))}
        </div>
      </div>
    </section>
  );
}

function JobCard({
  brand,
  tag,
  tagType,
  title,
  location,
  type,
  deadline,
}: {
  brand: string;
  tag: string;
  tagType: string;
  title: string;
  location: string;
  type: string;
  deadline: string;
}) {
  const [bookmarked, setBookmarked] = useState(false);

  return (
    <div className="job-card">
      <div className="card-header">
        <span className="card-brand">{brand}</span>
        <button
          className={`bookmark ${bookmarked ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setBookmarked(!bookmarked);
          }}
          aria-label="북마크"
        >
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
   섹션 2: 뷰티 업계 인사이트
   ============================================ */
function SectionInsights() {
  const insights = [
    {
      category: "트렌드",
      title: "2025 뷰티 산업, 무엇이 달라지나?",
      desc: "K-뷰티의 글로벌 확장과 클린뷰티 트렌드가 만드는 새로운 기회",
      date: "2025.01.15",
    },
    {
      category: "커리어",
      title: "뷰티 MD가 되기 위한 5가지 필수 역량",
      desc: "현직 MD가 알려주는 진짜 실전 노하우",
      date: "2025.01.12",
    },
    {
      category: "연봉정보",
      title: "뷰티 업계 직무별 연봉 리포트 2025",
      desc: "마케팅, MD, 디자인 등 주요 직무 연봉 데이터 공개",
      date: "2025.01.10",
    },
  ];

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="section-title">뷰티 업계 인사이트</h2>
            <p className="section-sub">최신 트렌드와 커리어 정보를 한 눈에</p>
          </div>
          <Link href="/jobs" className="see-all">
            전체보기 →
          </Link>
        </div>

        <div className="card-grid card-grid-3">
          {insights.map((item, i) => (
            <article key={i} className="insight-card">
              <div className="insight-image">
                <div className="insight-image-placeholder">
                  {i === 0 && "✨"}
                  {i === 1 && "💼"}
                  {i === 2 && "📊"}
                </div>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    alert(`${email}\n뉴스레터 구독이 신청되었습니다.`);
    setEmail("");
  };

  return (
    <section className="section">
      <div className="container">
        <div className="newsletter-box">
          <div className="newsletter-text">
            <h2 className="newsletter-title">뷰티앤잡 뉴스레터 구독하기</h2>
            <p className="newsletter-sub">
              매주 화요일, 엄선된 뷰티 채용 소식과 업계 인사이트를 메일함에서 만나보세요
            </p>
          </div>
          <form className="newsletter-form" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="이메일 주소를 입력해주세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit">구독하기</button>
          </form>
        </div>
      </div>
    </section>
  );
}

/* ============================================
   섹션 4: 고급경력직 채용관
   ============================================ */
function SectionPremium() {
  const items = [
    {
      brand: "샤넬코리아",
      title: "Brand Director, Fragrance",
      meta: "10년+ · 임원급",
      salary: "협의",
    },
    {
      brand: "에스티로더",
      title: "Marketing Senior Manager",
      meta: "8년+ · 시니어",
      salary: "1억 2천+",
    },
    {
      brand: "닥터자르트",
      title: "Global Brand Lead",
      meta: "10년+ · 디렉터",
      salary: "1억 5천+",
    },
    {
      brand: "VT코스메틱스",
      title: "Head of Marketing",
      meta: "10년+ · 임원급",
      salary: "협의",
    },
  ];

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="section-title">
              <Sparkles size={22} className="title-icon" />
              고급경력직 채용관
            </h2>
            <p className="section-sub">경력 10년 이상의 시니어를 위한 프리미엄 포지션</p>
          </div>
          <div className="nav-arrows">
            <button className="nav-arrow" aria-label="이전">
              <ChevronLeft size={18} />
            </button>
            <button className="nav-arrow" aria-label="다음">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="card-grid card-grid-4">
          {items.map((item, i) => (
            <div key={i} className="premium-card">
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
function SectionIntern() {
  const items = [
    {
      brand: "이니스프리",
      type: "체험형 인턴",
      title: "마케팅 인턴 (3개월)",
      location: "서울",
    },
    {
      brand: "토니모리",
      type: "정규직 전환형",
      title: "MD 어시스턴트 인턴",
      location: "경기 안양",
    },
    {
      brand: "에이블씨엔씨",
      type: "체험형 인턴",
      title: "디자인팀 인턴",
      location: "서울 강남",
    },
    {
      brand: "코스맥스",
      type: "정규직 전환형",
      title: "R&D 인턴",
      location: "경기 화성",
    },
  ];

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
          <Link href="/jobs" className="see-all">
            전체보기 →
          </Link>
        </div>

        <div className="card-grid card-grid-4">
          {items.map((item, i) => (
            <div key={i} className="intern-card">
              <div className="intern-brand">{item.brand}</div>
              <span className={`intern-type intern-type-${i % 2 === 0 ? "exp" : "regular"}`}>
                {item.type}
              </span>
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
function SectionGlobal() {
  const items = [
    {
      flag: "🇫🇷",
      country: "France",
      brand: "L'Oréal Paris",
      title: "Global Marketing Manager",
      city: "Paris",
    },
    {
      flag: "🇺🇸",
      country: "USA",
      brand: "Estée Lauder",
      title: "Brand Strategist",
      city: "New York",
    },
    {
      flag: "🇯🇵",
      country: "Japan",
      brand: "SK-II",
      title: "Regional Marketing Lead",
      city: "Tokyo",
    },
    {
      flag: "🇸🇬",
      country: "Singapore",
      brand: "Shiseido APAC",
      title: "Digital Marketing Manager",
      city: "Singapore",
    },
  ];

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
          <Link href="/jobs" className="see-all">
            전체보기 →
          </Link>
        </div>

        <div className="card-grid card-grid-4">
          {items.map((item, i) => (
            <div key={i} className="global-card">
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
      {/* 상단: 로고 + 회사/고객지원 + CTA */}
      <div className="footer-new-top">
        <div className="footer-new-brand">
          <Image
            src="/images/logo.png"
            alt="뷰티앤잡"
            width={120}
            height={32}
            className="footer-new-logo"
          />
          <p className="footer-new-tagline">뷰티 산업 종사자를 위한 단 하나의 커리어 플랫폼</p>
          <div className="footer-new-social">
            <button aria-label="Instagram">📷</button>
            <button aria-label="YouTube">📺</button>
            <button aria-label="LinkedIn">💼</button>
          </div>
        </div>

        <div className="footer-new-links">
          <div className="footer-new-col">
            <h4>회사</h4>
            <Link href="#">회사 소개</Link>
            <Link href="#">채용</Link>
            <Link href="#">제휴 문의</Link>
            <Link href="#">광고 문의</Link>
          </div>
          <div className="footer-new-col">
            <h4>고객지원</h4>
            <Link href="#">고객센터</Link>
            <Link href="#">자주 묻는 질문</Link>
            <Link href="#">이용약관</Link>
            <Link href="#">개인정보처리방침</Link>
          </div>
        </div>

        <div className="footer-new-cta">
          <p className="footer-new-cta-text">우리 회사도 채용하고 싶다면?</p>
          <Link href="#" className="footer-new-cta-btn">기업회원 바로가기</Link>
        </div>
      </div>

      {/* 구분선 */}
      <div className="footer-new-divider" />

      {/* 하단: 회사 정보 */}
      <div className="footer-new-bottom">
        <div className="footer-new-company-row">
          <span className="footer-new-company-name">(주)뷰티앤잡</span>
          <span className="footer-new-dot">·</span>
          <button className="footer-new-info-link">기업 도입 문의</button>
          <button className="footer-new-info-link">기타 문의</button>
        </div>
        <div className="footer-new-details">
          <span>주소 :</span>
          <span>사업자등록번호 :</span>
          <span>통신판매업신고번호 :</span>
          <span>유료직업소개사업 등록번호 :</span>
          <span>직업정보제공사업 신고번호 :</span>
        </div>
        <div className="footer-new-copy">
          <span>© 2025 Beauty&Job. All rights reserved.</span>
          <div className="footer-new-policies">
            <button className="footer-new-info-link">이용약관</button>
            <button className="footer-new-info-link">개인정보 처리방침</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
