"use client";
import Header from "@/components/Header";

import { useState, useRef, useEffect, Suspense } from "react";
import { OFFICE_JOB_GROUPS, STORE_SKILL_AREAS } from "@/lib/constants";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, Bookmark, ChevronDown, X, Settings, ChevronRight } from "lucide-react";
import { useSignupStore } from "@/lib/store/signupStore";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";

/* ===== 더미 데이터 ===== */
const JOBS = [
  { id: 1, brand: "로지킴", tags: ["스킨케어", "색조"], category: "OEM", title: "일본, 동남아 해외영업", jobType: "스킨케어 · 색조 · OEM", career: "경력 무관", region: "일본 · 동남아 · 중국", type: "기업", thumbnail: null, color: "#f5e6e8" },
  { id: 2, brand: "윗유", tags: ["브랜드 무관"], category: null, title: "[글로벌] 틱톡샵 어필리에이트 마케터", jobType: "마케팅", career: "신입 ~ 경력 무관", region: "북미", type: "기업", thumbnail: null, color: "#e8f0fe" },
  { id: 3, brand: "아누아", tags: ["스킨케어"], category: null, title: "[인턴] [ANUA] 북미 틱톡샵 인플루언서 마케터", jobType: "스킨케어", career: "신입", region: "북미", type: "기업", thumbnail: null, color: "#e8f5e9" },
  { id: 4, brand: "오가닉서라운딩", tags: ["브랜드 무관"], category: null, title: "채용 담당자", jobType: "HR", career: "경력 무관", region: "국내", type: "기업", thumbnail: null, color: "#fff3e0" },
  { id: 5, brand: "윗유", tags: ["플랫폼", "MCN"], category: null, title: "[피플앤컬처] 커뮤니티 매니저 (총무)", jobType: "플랫폼 · MCN", career: "경력 2년 이상", region: "국내", type: "기업", thumbnail: null, color: "#f3e5f5" },
  { id: 6, brand: "하야르", tags: ["리베니프", "신규 브랜드"], extraCount: 2, title: "[인턴] 제품 개발 담당자 (6개월 채용전환형)", jobType: "스킨케어 · 헤어 · 바디", career: "신입", region: "국내 · 북미", type: "기업", thumbnail: null, color: "#e1f5fe" },
  { id: 7, brand: "하우스 오브 밸런스", tags: ["스킨케어", "바디"], category: null, title: "일본 온라인 MD", jobType: "MD", career: "경력 2-7년", region: "일본", type: "기업", thumbnail: null, color: "#fce4ec" },
  { id: 8, brand: "하우스 오브 밸런스", tags: ["스킨케어", "바디"], category: null, title: "TikTok Shop 틱톡샵 MD (북미)", jobType: "MD", career: "경력 2-7년", region: "북미", type: "기업", thumbnail: null, color: "#e8eaf6" },
  { id: 9, brand: "데이지크", tags: ["에프트블로우"], extraCount: 1, title: "구매 담당", jobType: "스킨케어 · 색조 · 향수", career: "경력 3년 이상", region: "국내", type: "기업", thumbnail: null, color: "#f1f8e9" },
  { id: 10, brand: "파운더즈", tags: ["브랜드 총괄"], category: null, title: "파운더즈 글로벌 Demand & Supply 매니저", jobType: "SCM · 물류", career: "3년 이상", region: "대만 · 러시아", type: "기업", thumbnail: null, color: "#fff8e1" },
  { id: 11, brand: "쏙쏙컴퍼니", tags: ["브랜드 총괄"], category: null, title: "[헤트라스] 국내 물류 담당자", jobType: "SCM · 물류", career: "경력 3년 이상", region: "국내", type: "기업", thumbnail: null, color: "#e0f2f1" },
  { id: 12, brand: "하야르", tags: ["리베니프", "신규 브랜드"], extraCount: 2, title: "[아이리스브라이트] 국내 물류 담당자", jobType: "스킨케어 · 헤어 · 바디", career: "경력 2-5년", region: "북미 · 일본 · 동남아", type: "기업", thumbnail: null, color: "#ede7f6" },
  { id: 13, brand: "올리브영", tags: ["리테일"], category: null, title: "디지털 마케팅 매니저", jobType: "마케팅", career: "경력 3-5년", region: "국내", type: "기업", thumbnail: null, color: "#e8f5e9" },
  { id: 14, brand: "아모레퍼시픽", tags: ["스킨케어", "색조"], category: null, title: "글로벌 브랜드 마케터 (설화수)", jobType: "마케팅", career: "경력 5년 이상", region: "국내 · 해외", type: "기업", thumbnail: null, color: "#fce4ec" },
  { id: 15, brand: "LG생활건강", tags: ["스킨케어"], category: null, title: "e커머스 MD (CNP)", jobType: "MD", career: "경력 2-4년", region: "국내", type: "기업", thumbnail: null, color: "#e8eaf6" },
  { id: 16, brand: "코스맥스", tags: ["OEM", "ODM"], category: null, title: "화장품 연구원 (제형 개발)", jobType: "연구개발(RA)", career: "경력 3년 이상", region: "경기 성남", type: "기업", thumbnail: null, color: "#f3e8f7" },
  { id: 17, brand: "에이피알", tags: ["멀티브랜드"], category: null, title: "퍼포먼스 마케터 (메디큐브)", jobType: "마케팅", career: "경력 2-5년", region: "국내", type: "기업", thumbnail: null, color: "#fff3e0" },
  { id: 18, brand: "달바", tags: ["스킨케어", "글로벌"], category: null, title: "유럽 수출 영업 담당자", jobType: "영업", career: "경력 3년 이상", region: "유럽", type: "기업", thumbnail: null, color: "#e0f2f1" },
  { id: 19, brand: "닥터자르트", tags: ["더마"], category: null, title: "브랜드 콘텐츠 기획자", jobType: "마케팅", career: "경력 2-4년", region: "국내", type: "기업", thumbnail: null, color: "#e8f0fe" },
  { id: 20, brand: "아누아", tags: ["스킨케어"], category: null, title: "인플루언서 마케팅 매니저", jobType: "마케팅", career: "경력 1-3년", region: "국내", type: "기업", thumbnail: null, color: "#e8f5e9" },
  { id: 21, brand: "메디큐브", tags: ["디바이스"], category: null, title: "제품 기획 MD (디바이스)", jobType: "MD", career: "경력 3-5년", region: "국내", type: "기업", thumbnail: null, color: "#fff8e1" },
  { id: 22, brand: "라운드랩", tags: ["스킨케어", "클린뷰티"], category: null, title: "SNS 콘텐츠 마케터", jobType: "마케팅", career: "신입 · 경력 1-2년", region: "국내", type: "기업", thumbnail: null, color: "#e0f7fa" },
  { id: 23, brand: "코스맥스", tags: ["ODM"], category: null, title: "품질관리 담당자 (QC)", jobType: "품질관리", career: "경력 2-5년", region: "경기 성남", type: "기업", thumbnail: null, color: "#f1f8e9" },
  { id: 24, brand: "올리브영", tags: ["리테일"], category: null, title: "MD (스킨케어 카테고리)", jobType: "MD", career: "경력 2-4년", region: "국내", type: "기업", thumbnail: null, color: "#e8f5e9" },
  { id: 25, brand: "에이피알", tags: ["글로벌"], category: null, title: "글로벌 영업 매니저 (북미)", jobType: "영업", career: "경력 3-6년", region: "북미", type: "기업", thumbnail: null, color: "#fff3e0" },
  { id: 26, brand: "아모레퍼시픽", tags: ["경영"], category: null, title: "경영기획 담당자", jobType: "경영·전략", career: "경력 5년 이상", region: "국내", type: "기업", thumbnail: null, color: "#fce4ec" },
  { id: 27, brand: "달바", tags: ["스킨케어"], category: null, title: "고객서비스 CS 담당자", jobType: "CS·CX", career: "경력 1-3년", region: "국내", type: "기업", thumbnail: null, color: "#e0f2f1" },
  { id: 28, brand: "닥터자르트", tags: ["더마", "글로벌"], category: null, title: "글로벌 마케팅 인턴 (6개월)", jobType: "마케팅", career: "신입", region: "국내", type: "기업", thumbnail: null, color: "#e8eaf6" },
  { id: 29, brand: "라운드랩", tags: ["스킨케어"], category: null, title: "상품 기획 MD (인턴)", jobType: "MD", career: "신입", region: "국내", type: "기업", thumbnail: null, color: "#e0f7fa" },
  { id: 30, brand: "메디큐브", tags: ["디바이스", "홈케어"], category: null, title: "데이터 분석가 (마케팅)", jobType: "경영·전략", career: "경력 2-4년", region: "국내", type: "기업", thumbnail: null, color: "#fff8e1" },
];



const STORE_JOBS = [
  { id: 101, brand: "올리브영", tags: ["리테일"], title: "뷰티어드바이저 (강남점)", jobType: "뷰티어드바이저", career: "경력 무관", region: "서울 강남", extraCount: 0, type: "매장", thumbnail: null, color: "#e8f5e9" },
  { id: 102, brand: "아리따움", tags: ["스킨케어", "색조"], title: "뷰티 컨설턴트", jobType: "뷰티어드바이저", career: "경력 1년 이상", region: "서울", extraCount: 0, type: "매장", thumbnail: null, color: "#fce4ec" },
  { id: 103, brand: "이니스프리", tags: ["스킨케어"], title: "매장 점장 (홍대점)", jobType: "매장관리자", career: "경력 3년 이상", region: "서울 마포", extraCount: 0, type: "매장", thumbnail: null, color: "#e0f2f1" },
  { id: 104, brand: "헤라", tags: ["색조"], title: "백화점 메이크업 아티스트", jobType: "메이크업아티스트", career: "경력 2년 이상", region: "서울", extraCount: 0, type: "매장", thumbnail: null, color: "#f3e5f5" },
  { id: 105, brand: "맥(MAC)", tags: ["색조"], title: "카운터 뷰티어드바이저", jobType: "뷰티어드바이저", career: "경력 1-3년", region: "서울", extraCount: 0, type: "매장", thumbnail: null, color: "#e8eaf6" },
  { id: 106, brand: "에스티로더", tags: ["스킨케어", "색조"], title: "백화점 스킨케어 어드바이저", jobType: "뷰티어드바이저", career: "경력 2년 이상", region: "서울", extraCount: 0, type: "매장", thumbnail: null, color: "#fff8e1" },
  { id: 107, brand: "클리오", tags: ["색조"], title: "H&B 매장 스태프", jobType: "뷰티어드바이저", career: "경력 무관", region: "경기", extraCount: 0, type: "매장", thumbnail: null, color: "#e0f7fa" },
  { id: 108, brand: "세포라", tags: ["멀티브랜드"], title: "뷰티 어드바이저 (세포라 코리아)", jobType: "뷰티어드바이저", career: "경력 1년 이상", region: "서울", extraCount: 0, type: "매장", thumbnail: null, color: "#ede7f6" },
];

const ALL_JOBS = [...JOBS, ...STORE_JOBS];

const CAREER_OPTIONS = ["신입", "1년", "2년", "3년", "4년", "5년", "6년", "7년", "8년", "9년", "10년 이상", "경력 무관"];
const CATEGORIES = ["스킨케어", "색조", "헤어", "바디", "향수", "건기식", "디바이스", "맨즈케어", "네일", "뷰티툴", "OEM", "ODM", "플랫폼", "유통사", "MCN"];

function JobsPageInner() {
  const { job, careers: signupCareers } = useSignupStore() as any;
  const searchParams = useSearchParams();

  const initType = searchParams.get("type") || "전체";
  const initJob = searchParams.get("job") || "직군 전체";
  const initCareer = searchParams.get("career") || "경력 전체";
  const initRegion = searchParams.get("region") || "";
  const initBrand = searchParams.get("brand") || "";
  const initSearch = searchParams.get("q") || "";

  const [jobTypeFilter, setJobTypeFilter] = useState(initType);
  const [selectedJob, setSelectedJob] = useState(initJob);
  const [selectedCareer, setSelectedCareer] = useState(initCareer);
  const [selectedRegion, setSelectedRegion] = useState(initRegion);
  const [selectedBrand, setSelectedBrand] = useState(initBrand);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [showSearch, setShowSearch] = useState(false);
  const [showJobDrop, setShowJobDrop] = useState(false);
  const [showCareerDrop, setShowCareerDrop] = useState(false);
  const [showRegionDrop, setShowRegionDrop] = useState(false);
  const [showBrandDrop, setShowBrandDrop] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initSearch);
  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const toggleBookmarkStore = useBookmarkStore((s) => s.toggle);
  const loadBookmarks = useBookmarkStore((s) => s.loadFromServer);
  const [apiJobs, setApiJobs] = useState<any[] | null>(null);

  useEffect(() => {
    fetch('/api/jobs')
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const mapped = res.data.map((j: any) => ({
            id: j.id,
            brand: j.brand_name || j.company_name,
            tags: [],
            category: null,
            title: j.title,
            jobType: (j.categories || []).join(' · '),
            categories: j.categories || [],
            career: j.experience_level === 'NEW' ? '신입' : j.experience_level === 'EXPERIENCED' ? '경력' : '경력 무관',
            region: j.location || '국내',
            type: j.job_type === 'OFFICE' ? '기업' : '매장',
            thumbnail: j.logo_url,
            color: '#e8f0fe',
          }));
          setApiJobs(mapped);
        }
      })
      .catch(e => console.error('[load jobs]', e));
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const POPULAR_SEARCHES = ["아누아", "성분에디터", "퓌", "메디힐", "메디큐브", "넘버즈인", "유무", "브이티", "달바", "온그리디언츠", "마녀공장", "이퀄베리", "닥터엘시아"];

  const toggleBookmark = (id: string | number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmarkStore(id);
  };

  const currentJobTypes = jobTypeFilter === "매장" ? STORE_SKILL_AREAS : OFFICE_JOB_GROUPS;
  const filteredJobs = (apiJobs || []).filter((j: any) => {
    const matchType = jobTypeFilter === "전체" || j.type === jobTypeFilter;
    const matchJob = selectedJob === "직군 전체" || (j.categories || []).includes(selectedJob);
    const matchCareer = selectedCareer === "경력 전체" || j.career.includes(selectedCareer.replace("년", "").replace("신입", "신입"));
    const matchCategory = !selectedCategory || j.tags.includes(selectedCategory);
    const matchSearch = !searchQuery || j.title.includes(searchQuery) || j.brand.includes(searchQuery);
    const matchRegion = !selectedRegion || j.region.includes(selectedRegion);
    const matchBrand = !selectedBrand || j.brand.includes(selectedBrand);
    return matchType && matchJob && matchCareer && matchCategory && matchSearch && matchRegion && matchBrand;
  });

  return (
    <div className="jobs-page">
      <Header onSearchClick={() => { setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 100); }} />

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
        <div className="jobs-type-tabs">
          {["전체", "기업", "매장"].map((t) => (
            <button key={t}
              className={`jobs-type-tab ${jobTypeFilter === t ? "active" : ""}`}
              onClick={() => { setJobTypeFilter(t); setSelectedJob("직군 전체"); }}>
              {t === "기업" ? "🏢 기업 공고" : t === "매장" ? "🏪 매장 공고" : "전체"}
            </button>
          ))}
        </div>
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
                  {currentJobTypes.map((jt) => (
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
                    className={`jobs-card-bookmark ${bookmarks.includes(String(job.id)) ? "active" : ""}`}
                    onClick={(e) => toggleBookmark(job.id, e)}
                    aria-label="북마크"
                  >
                    <Bookmark size={18} fill={bookmarks.includes(String(job.id)) ? "currentColor" : "none"} />
                  </button>
                </div>

                {/* 카드 정보 */}
                <div className="jobs-card-body">
                  <div className="jobs-card-brand-row">
                    <span className="jobs-card-brand">{job.brand}</span>
                    {job.tags.slice(0, 2).map((tag: string) => (
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

export default function JobsPage() {
  return (
    <Suspense fallback={<div style={{padding:"80px",textAlign:"center"}}>로딩 중...</div>}>
      <JobsPageInner />
    </Suspense>
  );
}
