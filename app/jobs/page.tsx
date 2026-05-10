"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Bookmark, ChevronDown, X, Settings, ChevronRight } from "lucide-react";
import { useSignupStore } from "@/lib/store/signupStore";

/* ===== 더미 데이터 ===== */
const JOBS = [
  { id: 1, brand: "로지킴", tags: ["스킨케어", "색조"], category: "OEM", title: "일본, 동남아 해외영업", jobType: "스킨케어 · 색조 · OEM", career: "경력 무관", region: "일본 · 동남아 · 중국", thumbnail: null, color: "#f5e6e8" },
  { id: 2, brand: "윗유", tags: ["브랜드 무관"], category: null, title: "[글로벌] 틱톡샵 어필리에이트 마케터", jobType: "마케팅", career: "신입 ~ 경력 무관", region: "북미", thumbnail: null, color: "#e8f0fe" },
  { id: 3, brand: "아누아", tags: ["스킨케어"], category: null, title: "[인턴] [ANUA] 북미 틱톡샵 인플루언서 마케터", jobType: "스킨케어", career: "신입", region: "북미", thumbnail: null, color: "#e8f5e9" },
  { id: 4, brand: "오가닉서라운딩", tags: ["브랜드 무관"], category: null, title: "채용 담당자", jobType: "HR", career: "경력 무관", region: "국내", thumbnail: null, color: "#fff3e0" },
  { id: 5, brand: "윗유", tags: ["플랫폼", "MCN"], category: null, title: "[피플앤컬처] 커뮤니티 매니저 (총무)", jobType: "플랫폼 · MCN", career: "경력 2년 이상", region: "국내", thumbnail: null, color: "#f3e5f5" },
  { id: 6, brand: "하야르", tags: ["리베니프", "신규 브랜드"], extraCount: 2, title: "[인턴] 제품 개발 담당자 (6개월 채용전환형)", jobType: "스킨케어 · 헤어 · 바디", career: "신입", region: "국내 · 북미", thumbnail: null, color: "#e1f5fe" },
  { id: 7, brand: "하우스 오브 밸런스", tags: ["스킨케어", "바디"], category: null, title: "일본 온라인 MD", jobType: "MD", career: "경력 2-7년", region: "일본", thumbnail: null, color: "#fce4ec" },
  { id: 8, brand: "하우스 오브 밸런스", tags: ["스킨케어", "바디"], category: null, title: "TikTok Shop 틱톡샵 MD (북미)", jobType: "MD", career: "경력 2-7년", region: "북미", thumbnail: null, color: "#e8eaf6" },
  { id: 9, brand: "데이지크", tags: ["에프트블로우"], extraCount: 1, title: "구매 담당", jobType: "스킨케어 · 색조 · 향수", career: "경력 3년 이상", region: "국내", thumbnail: null, color: "#f1f8e9" },
  { id: 10, brand: "파운더즈", tags: ["브랜드 총괄"], category: null, title: "파운더즈 글로벌 Demand & Supply 매니저", jobType: "SCM · 물류", career: "3년 이상", region: "대만 · 러시아", thumbnail: null, color: "#fff8e1" },
  { id: 11, brand: "쏙쏙컴퍼니", tags: ["브랜드 총괄"], category: null, title: "[헤트라스] 국내 물류 담당자", jobType: "SCM · 물류", career: "경력 3년 이상", region: "국내", thumbnail: null, color: "#e0f2f1" },
  { id: 12, brand: "하야르", tags: ["리베니프", "신규 브랜드"], extraCount: 2, title: "[아이리스브라이트] 국내 물류 담당자", jobType: "스킨케어 · 헤어 · 바디", career: "경력 2-5년", region: "북미 · 일본 · 동남아", thumbnail: null, color: "#ede7f6" },
];

const JOB_TYPES = ["마케팅", "상품기획·개발", "영업", "디자인", "MD", "SCM·물류", "경영·전략", "품질관리", "CS·CX", "연구개발(RA)", "미디어"];
const CAREER_OPTIONS = ["신입", "1년", "2년", "3년", "4년", "5년", "6년", "7년", "8년", "9년", "10년 이상", "경력 무관"];
const CATEGORIES = ["스킨케어", "색조", "헤어", "바디", "향수", "건기식", "디바이스", "맨즈케어", "네일", "뷰티툴", "OEM", "ODM", "플랫폼", "유통사", "MCN"];

export default function JobsPage() {
  const { job, careers: signupCareers } = useSignupStore() as any;
  const [selectedJob, setSelectedJob] = useState("직군 전체");
  const [selectedCareer, setSelectedCareer] = useState("경력 전체");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [showSearch, setShowSearch] = useState(false);
  const [showJobDrop, setShowJobDrop] = useState(false);
  const [showCareerDrop, setShowCareerDrop] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const POPULAR_SEARCHES = ["아누아", "성분에디터", "퓌", "메디힐", "메디큐브", "넘버즈인", "유무", "브이티", "달바", "온그리디언츠", "마녀공장", "이퀄베리", "닥터엘시아"];

  const toggleBookmark = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBookmarks((prev) => prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]);
  };

  const filteredJobs = JOBS.filter((j) => {
    const matchJob = selectedJob === "직군 전체" || j.jobType.includes(selectedJob);
    const matchCategory = !selectedCategory || j.tags.includes(selectedCategory);
    const matchSearch = !searchQuery || j.title.includes(searchQuery) || j.brand.includes(searchQuery);
    return matchJob && matchCategory && matchSearch;
  });

  return (
    <div className="jobs-page">
      {/* ===== 헤더 ===== */}
      <header className="jobs-header">
        <div className="jobs-header-inner">
          <Link href="/" className="jobs-logo">
            <Image src="/images/logo.png" alt="뷰티앤잡" width={130} height={34} priority />
          </Link>
          <nav className="jobs-gnb">
            <Link href="/jobs" className="jobs-gnb-item active">채용공고</Link>
            <Link href="#" className="jobs-gnb-item">회사 둘러보기</Link>
            <Link href="/profile/resume" className="jobs-gnb-item">
              이력서 <span className="jobs-gnb-badge green">합격률 UP</span>
            </Link>
            <Link href="#" className="jobs-gnb-item">
              연봉어택 <span className="jobs-gnb-badge purple">경력직</span>
            </Link>
            <Link href="#" className="jobs-gnb-item">
              인사이트 <span className="jobs-gnb-badge dark">NEWS</span>
            </Link>
          </nav>
          <div className="jobs-header-right">
            <button className="jobs-search-icon" onClick={() => { setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 100); }}>
              <Search size={22} />
            </button>
            <Link href="/signup" className="jobs-start-btn">시작하기</Link>
            <Link href="#" className="jobs-biz-btn">기업 서비스</Link>
          </div>
        </div>
      </header>

      {/* ===== 검색 모달 ===== */}
      {showSearch && (
        <div className="jobs-search-overlay" onClick={() => setShowSearch(false)}>
          <div className="jobs-search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="jobs-search-bar">
              <button className="jobs-search-back" onClick={() => setShowSearch(false)}>
                <ChevronRight size={20} style={{ transform: "rotate(180deg)" }} />
              </button>
              <Search size={18} className="jobs-search-bar-icon" />
              <input
                ref={searchInputRef}
                className="jobs-search-input"
                placeholder="검색어를 입력해 주세요."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setShowSearch(false)}
              />
            </div>
            <div className="jobs-search-body">
              <p className="jobs-search-desc">브랜드, 회사, 채용공고를 검색할 수 있어요.</p>
              <h4 className="jobs-search-section-title">추천 검색어</h4>
              <div className="jobs-search-chips">
                {POPULAR_SEARCHES.map((kw) => (
                  <button key={kw} className="jobs-search-chip" onClick={() => { setSearchQuery(kw); setShowSearch(false); }}>{kw}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 맞춤 공고 설정 모달 ===== */}
      {showCustom && (
        <div className="cv-overlay" onClick={() => setShowCustom(false)}>
          <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cv-header">
              <div style={{ width: 36 }} />
              <h2 className="cv-title">맞춤 공고 설정</h2>
              <button className="cv-close" onClick={() => setShowCustom(false)}><X size={20} /></button>
            </div>
            <div className="cv-body">
              <p className="cv-desc">내가 다녔던 회사를 등록하면 해당 회사의 공고는 숨겨지고, 신규 채용 알림도 자동으로 제외돼요.</p>
              <label className="cv-field-label">회사 검색</label>
              <div className="cv-skill-input-row">
                <input className="cv-input" placeholder="회사명을 검색하거나 직접 입력해 주세요." />
                <button className="cv-skill-add-btn">추가하기</button>
              </div>
              <p className="jobs-custom-hint">내가 다녔던 회사를 간편하게 선택해보세요.</p>
              <button className="jobs-custom-career-btn">아이엔지로보틱스</button>
              <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
                <button className="cv-btn-primary" style={{ background: "white", color: "#333", border: "1px solid #ddd", marginTop: 0 }}>경력 업데이트</button>
                <button className="cv-btn-primary" style={{ marginTop: 0 }}>저장하기</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="jobs-container">
        {/* ===== 필터 바 ===== */}
        <div className="jobs-filter-bar">
          <div className="jobs-filter-left">
            {/* 직군 드롭다운 */}
            <div className="jobs-dropdown-wrap">
              <button className="jobs-filter-btn" onClick={() => { setShowJobDrop(!showJobDrop); setShowCareerDrop(false); }}>
                {selectedJob} <ChevronDown size={16} />
              </button>
              {showJobDrop && (
                <div className="jobs-dropdown">
                  <button className={`jobs-dropdown-item ${selectedJob === "직군 전체" ? "active" : ""}`} onClick={() => { setSelectedJob("직군 전체"); setShowJobDrop(false); }}>직군 전체</button>
                  {JOB_TYPES.map((jt) => (
                    <button key={jt} className={`jobs-dropdown-item ${selectedJob === jt ? "active" : ""}`} onClick={() => { setSelectedJob(jt); setShowJobDrop(false); }}>{jt}</button>
                  ))}
                </div>
              )}
            </div>

            {/* 경력 드롭다운 */}
            <div className="jobs-dropdown-wrap">
              <button className="jobs-filter-btn" onClick={() => { setShowCareerDrop(!showCareerDrop); setShowJobDrop(false); }}>
                {selectedCareer} <ChevronDown size={16} />
              </button>
              {showCareerDrop && (
                <div className="jobs-dropdown">
                  <button className={`jobs-dropdown-item ${selectedCareer === "경력 전체" ? "active" : ""}`} onClick={() => { setSelectedCareer("경력 전체"); setShowCareerDrop(false); }}>경력 전체</button>
                  {CAREER_OPTIONS.map((c) => (
                    <button key={c} className={`jobs-dropdown-item ${selectedCareer === c ? "active" : ""}`} onClick={() => { setSelectedCareer(c); setShowCareerDrop(false); }}>{c}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="jobs-filter-right">
            <button className="jobs-custom-btn" onClick={() => setShowCustom(true)}>
              <Settings size={15} /> 맞춤공고 설정
            </button>
            <div className="jobs-sort-group">
              <button className={`jobs-sort-btn ${sort === "latest" ? "active" : ""}`} onClick={() => setSort("latest")}>최신순</button>
              <button className={`jobs-sort-btn ${sort === "popular" ? "active" : ""}`} onClick={() => setSort("popular")}>인기순</button>
            </div>
          </div>
        </div>

        {/* ===== 카테고리 탭 ===== */}
        <div className="jobs-category-row">
          <span className="jobs-category-label">카테고리</span>
          <div className="jobs-category-tabs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`jobs-category-tab ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <button className="jobs-category-arrow"><ChevronRight size={18} /></button>
        </div>

        {/* ===== 채용공고 그리드 ===== */}
        {filteredJobs.length > 0 ? (
          <div className="jobs-grid">
            {filteredJobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="jobs-card">
                {/* 썸네일 */}
                <div className="jobs-card-thumb" style={{ background: job.color }}>
                  <div className="jobs-card-thumb-placeholder">
                    <span>{job.brand[0]}</span>
                  </div>
                  <button
                    className={`jobs-card-bookmark ${bookmarks.includes(job.id) ? "active" : ""}`}
                    onClick={(e) => toggleBookmark(job.id, e)}
                    aria-label="북마크"
                  >
                    <Bookmark size={18} fill={bookmarks.includes(job.id) ? "currentColor" : "none"} />
                  </button>
                </div>

                {/* 카드 정보 */}
                <div className="jobs-card-body">
                  <div className="jobs-card-brand-row">
                    <span className="jobs-card-brand">{job.brand}</span>
                    {job.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="jobs-card-tag">· {tag}</span>
                    ))}
                    {job.extraCount && (
                      <span className="jobs-card-tag-extra">+{job.extraCount}</span>
                    )}
                  </div>
                  <h3 className="jobs-card-title">{job.title}</h3>
                  <p className="jobs-card-meta">{job.jobType} | {job.career}</p>
                  <p className="jobs-card-region">{job.region}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="jobs-empty">
            <div className="jobs-empty-icon">🔍</div>
            <p className="jobs-empty-title">조건에 맞는 포지션이 없어요.</p>
            <button className="jobs-empty-reset" onClick={() => { setSelectedJob("직군 전체"); setSelectedCareer("경력 전체"); setSelectedCategory(null); setSearchQuery(""); }}>
              필터 초기화
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
