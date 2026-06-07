"use client";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import HeroMobile from "@/components/HeroMobile";
import { workTypeLabel } from "@/lib/constants";
import { useEffect, useState } from "react";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import { useApplicationStore } from "@/lib/store/applicationStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { useSignupStore } from "@/lib/store/signupStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  Bookmark,
  Sparkles,
  Mail,
  CheckCircle,
  MapPin,
} from "lucide-react";

/* ============================================
   공통 유틸
   ============================================ */
function formatDeadline(deadline: string | null) {
  if (!deadline) return "상시";
  const today = new Date();
  const dl = new Date(deadline);
  const dDay = Math.ceil((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (dDay < 0) return "마감";
  if (dDay === 0) return "오늘 마감";
  return `D-${dDay}`;
}

function expLevelLabel(level: string) {
  if (level === "NEW") return "신입";
  if (level === "EXPERIENCED") return "경력";
  return "경력 무관";
}

function mapJob(j: any) {
  return {
    id: j.id,
    brand: j.brand_name || j.company_name,
    tag: expLevelLabel(j.experience_level),
    title: j.title,
    location: j.location || "협의",
    type: workTypeLabel(j.work_type),
    deadline: formatDeadline(j.deadline),
  };
}

export default function HomePage() {
  useEffect(() => {
    useBookmarkStore.getState().loadFromServer();
  }, []);
  return (
    <main className="main-page">
      <Header />
      <MobileDetector />
      <SectionPick />
      <SectionStorePick />
      <SectionCorpPick />
      <SectionStories />
      <SectionBeautyServices />
      <SectionNewsletter />
      <Footer />
    </main>
  );
}

/* ============================================
   히어로 섹션
   ============================================ */
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

const REGION_OPTIONS = ["지역 전체", "서울", "경기", "인천", "부산", "대구", "광주", "대전", "해외"];

function Hero() {
  const router = useRouter();
  const [region, setRegion] = useState("지역 전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [showRegionDrop, setShowRegionDrop] = useState(false);
  const [jobType, setJobType] = useState<"기업" | "매장">("기업");

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
      <div className="hero-wrap">
        <div className="hero-banner-top-inner">
          <span className="hero-banner-badge">AD</span>
          <p className="hero-banner-title">🎀 뷰티앤잡 × 아모레퍼시픽 — 봄 채용 시즌 공개!</p>
          <p className="hero-banner-sub">마케터·MD·연구원 등 50개+ 포지션 지금 확인하세요</p>
          <Link href="/jobs" className="hero-banner-link">공고 보기 →</Link>
        </div>
        <div className="hero-inner">
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

          <div className="hero-right">
            <div className="hero-right-header">
              <span className="hero-ai-icon">✨</span>
              <span className="hero-right-title">AI 맞춤 커리어 추천</span>
            </div>
            <div className="hero-right-cards">
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
                <Link href="/login" className="hero-right-card-btn">
                  무료 이력서 등록하기 ›
                </Link>
              </div>
              <Link href="/stories" className="hero-right-card card-link">
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
                <h3 className="hero-right-card-title accent">뷰티 현장 이야기</h3>
                <p className="hero-right-card-desc">선배들의 생생한 꿀팁과<br />공감 이야기를 만나보세요</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================
   섹션 1: 뷰티앤잡 Pick
   ============================================ */
function SectionPick() {
  const [jobs, setJobs] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/jobs?limit=4")
      .then((r) => r.json())
      .then((res) => { if (res.success && Array.isArray(res.data)) setJobs(res.data); })
      .catch(console.error);
  }, []);
  const mappedJobs = jobs.map(mapJob);
  return (
    <section className="section section-divider">
      <div className="container">
        <div className="section-inner-divider" style={{ marginBottom: "48px" }} />
        <div className="section-head">
          <div>
            <h2 className="section-title">
              <Sparkles size={24} className="title-icon" />
              뷰티앤잡 Pick
            </h2>
            <p className="section-sub">뷰티앤잡이 선별한 추천 채용공고</p>
          </div>
          <Link href="/jobs" className="see-all">전체보기 →</Link>
        </div>
        {mappedJobs.length === 0 ? (
          <p className="empty-state">등록된 공고가 없습니다.</p>
        ) : (
          <div className="card-grid card-grid-4">
            {mappedJobs.map((job: any) => (
              <JobCard key={job.id} {...job} tagType="primary" isAd />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function JobCard({ id, brand, tag, tagType, title, location, type, deadline, isAd }: {
  id: number | string; brand: string; tag: string; tagType: string;
  title: string; location: string; type: string; deadline: string; isAd?: boolean;
}) {
  const router = useRouter();
  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const toggleBookmark = useBookmarkStore((s) => s.toggle);
  const isBookmarked = bookmarks.includes(String(id));
  return (
    <div className="job-card" onClick={() => router.push(`/jobs/${id}`)} style={{ cursor: "pointer" }}>
      <div className="card-header">
        <span className="card-brand">
          {brand}
          {isAd && <span className="card-ad-badge">AD</span>}
        </span>
        <button className={`bookmark ${isBookmarked ? "active" : ""}`}
          onClick={(e) => { e.stopPropagation(); toggleBookmark(id); }}
          aria-label="북마크">
          <Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} />
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
   섹션: 매장·샵 채용관
   ============================================ */
function SectionStorePick() {
  const [jobs, setJobs] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/jobs?job_type=STORE&limit=4")
      .then((r) => r.json())
      .then((res) => { if (res.success && Array.isArray(res.data)) setJobs(res.data); })
      .catch(console.error);
  }, []);
  const mappedJobs = jobs.map(mapJob);
  return (
    <section className="section section-divider">
      <div className="container">
        <div className="section-inner-divider" style={{ marginBottom: "48px" }} />
        <div className="section-head">
          <div>
            <h2 className="section-title">🏪 매장·샵 채용관</h2>
            <p className="section-sub">우리 동네 샵부터 프랜차이즈 매장까지</p>
          </div>
          <Link href="/jobs?type=매장" className="see-all">전체보기 →</Link>
        </div>
        {mappedJobs.length === 0 ? (
          <p className="empty-state">등록된 공고가 없습니다.</p>
        ) : (
          <div className="card-grid card-grid-4">
            {mappedJobs.map((job: any) => (
              <JobCard key={job.id} {...job} tagType="soft" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================================
   섹션: 기업·브랜드 채용관
   ============================================ */
function SectionCorpPick() {
  const [jobs, setJobs] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/jobs?job_type=OFFICE&limit=4")
      .then((r) => r.json())
      .then((res) => { if (res.success && Array.isArray(res.data)) setJobs(res.data); })
      .catch(console.error);
  }, []);
  const mappedJobs = jobs.map(mapJob);
  return (
    <section className="section section-divider">
      <div className="container">
        <div className="section-inner-divider" style={{ marginBottom: "48px" }} />
        <div className="section-head">
          <div>
            <h2 className="section-title">🏢 기업·브랜드 채용관</h2>
            <p className="section-sub">마케팅·MD·영업·연구개발 등 커리어를 키울 수 있는 포지션</p>
          </div>
          <Link href="/jobs?type=기업" className="see-all">전체보기 →</Link>
        </div>
        {mappedJobs.length === 0 ? (
          <p className="empty-state">등록된 공고가 없습니다.</p>
        ) : (
          <div className="card-grid card-grid-4">
            {mappedJobs.map((job: any) => (
              <JobCard key={job.id} {...job} tagType="primary" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================================
   섹션: 추천 뷰티 서비스
   ============================================ */
const BEAUTY_SERVICES = [
  { id: 1, emoji: "🎓", name: "뷰티 자격증 과정", desc: "헤어·피부·메이크업 국가자격증 취득 과정", company: "뷰티스쿨 A", tag: "교육" },
  { id: 2, emoji: "🔧", name: "미용 장비 렌탈", desc: "살롱 오픈에 필요한 장비를 합리적으로", company: "장비사 B", tag: "장비" },
  { id: 3, emoji: "📦", name: "살롱 용품 도매", desc: "시술에 필요한 소모품을 한 곳에서", company: "용품사 C", tag: "용품" },
  { id: 4, emoji: "💻", name: "예약관리 솔루션", desc: "소규모 샵도 쉽게 쓰는 예약·고객 관리", company: "서비스사 D", tag: "운영" },
];
function SectionBeautyServices() {
  return (
    <section className="section section-divider" style={{ marginTop: "-40px" }}>
      <div className="container">
        <div className="section-inner-divider" style={{ marginBottom: "48px" }} />
        <div className="section-head">
          <div>
            <h2 className="section-title">
              추천 뷰티 서비스
              <span className="ad-label">광고</span>
            </h2>
            <p className="section-sub">교육·장비·용품·운영 서비스 광고</p>
          </div>
        </div>
        <div className="card-grid card-grid-4">
          {BEAUTY_SERVICES.map((s) => (
            <div key={s.id} className="service-card">
              <div className="service-emoji">{s.emoji}</div>
              <span className="service-tag">{s.tag}</span>
              <h3 className="service-name">{s.name}</h3>
              <p className="service-desc">{s.desc}</p>
              <p className="service-company">{s.company}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================
   섹션: 이야기
   ============================================ */
const STORY_EMOJI: Record<string, string> = {
  "공감": "💬", "꿀팁": "💡", "질문": "❓", "정보": "📌",
};
function fmtStoryDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}
function SectionStories() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/community/posts?limit=4")
      .then((r) => r.json())
      .then((res) => { if (res.success && Array.isArray(res.data)) setItems(res.data); })
      .catch(() => {});
  }, []);
  if (items.length === 0) return null;
  return (
    <section className="section section-divider">
      <div className="container">
        <div className="section-inner-divider" style={{ marginBottom: "48px" }} />
        <div className="section-head">
          <div>
            <h2 className="section-title">💬 현장이야기</h2>
            <p className="section-sub">뷰티 현장 사람들의 공감과 꿀팁</p>
          </div>
          <Link href="/stories" className="see-all">전체보기 →</Link>
        </div>
        <div className="card-grid card-grid-4">
          {items.map((item) => (
            <article key={item.id} className="insight-card-new"
              onClick={() => router.push(`/stories/${item.id}`)}
              style={{ cursor: "pointer" }}>
              <div className="insight-card-new-img">{STORY_EMOJI[item.category] || "💬"}</div>
              <span className="insight-category">{item.category}</span>
              <h3 className="insight-card-new-title">{item.title || item.body}</h3>
              <p className="insight-card-new-desc">❤ {item.like_count} · 💬 {item.comment_count}</p>
              <time className="insight-card-new-date">{fmtStoryDate(item.published_at || item.created_at)}</time>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================
   섹션: 뉴스레터
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
   푸터
   ============================================ */
function Footer() {
  const topNav = [
    { label: "회사 소개", href: "/about" },
    { label: "채용", href: "/about/recruit" },
    { label: "제휴 문의", href: "/about/partnership" },
    { label: "광고 문의", href: "/about/advertise" },
    { label: "기타 문의", href: "/about/contact" },
  ];
  const Sep = () => <span style={{ margin: "0 8px", color: "#e2e2e2" }}>|</span>;
  return (
    <footer style={{ background: "#faf8fc", borderTop: "1px solid #eee", padding: "40px 0 48px", marginTop: 60 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <Link href="/"><Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} /></Link>
          <nav style={{ display: "flex", flexWrap: "wrap", gap: 26 }}>
            {topNav.map((l) => (
              <Link key={l.href} href={l.href} style={{ fontSize: 14, fontWeight: 600, color: "#3a3a3a", textDecoration: "none" }}>{l.label}</Link>
            ))}
          </nav>
        </div>
        <div style={{ fontSize: 13, color: "#9a9aa3", lineHeight: 2 }}>
          <div><span style={{ fontWeight: 600, color: "#6b6b73" }}>(주)뷰티앤잡</span><Sep />대표이사 :</div>
          <div>주소 :<Sep />전화번호 :</div>
          <div>사업자등록번호 :<Sep />통신판매업신고번호 :<Sep />유료직업소개사업 등록번호 :<Sep />직업정보제공사업 신고번호 :</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 28, paddingTop: 20, borderTop: "1px solid #eee" }}>
          <span style={{ fontSize: 13, color: "#9a9aa3" }}>© 2025 Beauty&amp;Job. All rights reserved.</span>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href="/support/terms" style={{ fontSize: 13, color: "#666", textDecoration: "none" }}>이용약관</Link>
            <Link href="/support/privacy" style={{ fontSize: 13, color: "#5f0080", textDecoration: "none", fontWeight: 600 }}>개인정보 처리방침</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
