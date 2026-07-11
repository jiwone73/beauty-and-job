"use client";
import Header from "@/components/Header";
import { useState, useRef, useEffect, Suspense } from "react";
import JobGroupSelectModal from "@/components/JobGroupSelectModal";
import RegionSelectModal from "@/components/RegionSelectModal";
import FilterSheet, { CAREER_OPTS, EMPLOYMENT_OPTS, BENEFIT_FILTER, SALARY_STORE, SALARY_OFFICE } from "@/components/FilterSheet";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Bookmark, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import { getJobSubGroups } from "@/lib/data/jobGroups";
import JobCard from "@/components/JobCard";
import { formatDeadline } from "@/lib/jobFormat";

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

const CAREER_OPTIONS = ["신입", "1년", "2년", "3년", "4년", "5년", "6년", "7년", "8년", "9년", "10년 이상", "경력 무관"];

function JobsPageInner() {
  const { userJobType, userJobAreas } = useAuthStore();
  const searchParams = useSearchParams();

  const initType = searchParams.get("type") || "전체";
  const initCareer = searchParams.get("career") || "경력 전체";
  const initRegion = searchParams.get("region") || "";
  const initBrand = searchParams.get("brand") || "";
  const initSearch = searchParams.get("q") || "";

  const [jobTypeFilter, setJobTypeFilter] = useState(initType);
  const [selectedJobs, setSelectedJobs] = useState<string[]>(() => {
    const urlGroup = searchParams.get("group");
    if (urlGroup) {
      const t = searchParams.get("type");
      const jt = t === "매장" ? "STORE" : "OFFICE";
      return getJobSubGroups(jt as any, urlGroup);
    }
    const urlJob = searchParams.get("job");
    if (urlJob && urlJob !== "직군 전체") return [urlJob];
    return [];
  });
  const [selectedCareer, setSelectedCareer] = useState(initCareer);
  const [selectedEmployment, setSelectedEmployment] = useState("고용형태 전체");
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([]);
  const [selectedSalary, setSelectedSalary] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState(initRegion);
  const [selectedBrand, setSelectedBrand] = useState(initBrand);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(() => {
    const rg = searchParams.get("regions");
    return rg ? rg.split(",") : [];
  });
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [showSearch, setShowSearch] = useState(false);
  const [showJobDrop, setShowJobDrop] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showCareerDrop, setShowCareerDrop] = useState(false);
  const [showEmploymentDrop, setShowEmploymentDrop] = useState(false);
  const [showBenefitDrop, setShowBenefitDrop] = useState(false);
  const [showSalaryDrop, setShowSalaryDrop] = useState(false);
  useEffect(() => { setSelectedSalary(0); }, [jobTypeFilter]);
  const [showRegionDrop, setShowRegionDrop] = useState(false);
  const [showBrandDrop, setShowBrandDrop] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState(initSearch);
  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const toggleBookmarkStore = useBookmarkStore((s) => s.toggle);
  const loadBookmarks = useBookmarkStore((s) => s.loadFromServer);
  const [apiJobs, setApiJobs] = useState<any[] | null>(null);
  useEffect(() => {
    const qs = new URLSearchParams();
    const t = searchParams.get("type");
    const sd = searchParams.get("sido");
    const sg = searchParams.get("sigungu");
    const kw = searchParams.get("q");
    if (t && t !== "전체") qs.set("type", t);
    if (selectedRegions.length) qs.set("regions", selectedRegions.join(","));
    if (sd) qs.set("sido", sd);
    if (sg) qs.set("sigungu", sg);
    if (kw) qs.set("q", kw);
    qs.set("limit", "100");
    fetch(`/api/jobs?${qs.toString()}`)
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
            type: j.company_type === 'OFFICE' ? '기업' : j.company_type === 'STORE' ? '매장' : '기업',
            thumbnail: (Array.isArray(j.cover_images) && j.cover_images[0]?.url) || j.logo_url || (Array.isArray(j.detail_images) && j.detail_images[0]?.url),
            color: '#e8f0fe',
            deadline: formatDeadline(j.deadline),
            employment: j.employment_type || null,
          }));
          setApiJobs(mapped);
        }
      })
      .catch(e => console.error('[load jobs]', e));
  }, [searchParams, selectedRegions]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  // 로그인 사용자 직군 기반 탭/직군 자동 세팅 (1회만, 단방향 — 프로필 저장은 호출 안 함)
  const seededFilter = useRef(false);
  useEffect(() => {
    if (seededFilter.current) return;
    const urlJob = searchParams.get("job");
    const urlType = searchParams.get("type");
    const urlQuery = searchParams.get("q");
    // 검색어·브랜드 등 명시적 검색 시엔 프로필 직군 자동필터를 걸지 않음
    if (urlQuery) { seededFilter.current = true; return; }
    if (!urlJob && !urlType && userJobType) {
      setJobTypeFilter(userJobType === "OFFICE" ? "기업" : "매장");
      if (userJobAreas && userJobAreas.length > 0) {
        setSelectedJobs(userJobAreas);
      }
      seededFilter.current = true;
    }
  }, [userJobType, userJobAreas, searchParams]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const POPULAR_SEARCHES = ["아누아", "성분에디터", "퓌", "메디힐", "메디큐브", "넘버즈인", "유무", "브이티", "달바", "온그리디언츠", "마녀공장", "이퀄베리", "닥터엘시아"];

  const toggleBookmark = (id: string | number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmarkStore(id);
  };

  const salaryOpts = jobTypeFilter === "매장" ? SALARY_STORE : SALARY_OFFICE;
  const filteredJobs = (apiJobs || []).filter((j: any) => {
    const matchType = jobTypeFilter === "전체" || j.type === jobTypeFilter || j.type === "both";
    const matchJob = selectedJobs.length === 0 || selectedJobs.some((s) => (j.categories || []).includes(s));
    const matchCareer = selectedCareer === "경력 전체" || j.experience_level === selectedCareer;
    const matchEmployment = selectedEmployment === "고용형태 전체" || j.employment_type === selectedEmployment;
    const matchBenefit = selectedBenefits.length === 0 || selectedBenefits.every((b) => (j.benefit_tags || []).includes(b));
    const matchSalary = selectedSalary === 0 || (j.salary_min && j.salary_min >= selectedSalary);
    const matchBrand = !selectedBrand || (j.brand || "").includes(selectedBrand);
    return matchType && matchJob && matchCareer && matchEmployment && matchBenefit && matchSalary && matchBrand;
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

      

      <div className="jobs-container">
        {/* ===== 필터 탭 ===== */}
        <div className="jobs-type-tabs">
          {["전체", "매장", "기업"].map((t) => (
            <button key={t}
              className={`jobs-type-tab ${jobTypeFilter === t ? "active" : ""}`}
              onClick={() => { setJobTypeFilter(t); setSelectedJobs([]); }}>
              {t === "기업" ? "🏢 사무직" : t === "매장" ? "🏪 매장직" : "전체"}
            </button>
          ))}
        </div>

        {/* ===== 필터 바 ===== */}
        <div className="jobs-filter-bar">
          <div className="jobs-filter-left">
            {/* 직군 선택 (모달) */}
            <div className="jobs-dropdown-wrap">
              <button
                className={`jobs-filter-btn ${selectedJobs.length > 0 ? "active" : ""}`}
                onClick={() => { setShowJobDrop(true); }}
              >
                {selectedJobs.length === 0
                  ? "직군 전체"
                  : selectedJobs.length === 1
                  ? selectedJobs[0]
                  : `${selectedJobs[0]} 외 ${selectedJobs.length - 1}`}
                <ChevronDown size={16} />
              </button>
              <JobGroupSelectModal
                open={showJobDrop}
                jobType={jobTypeFilter === "매장" ? "STORE" : "OFFICE"}
                selected={selectedJobs}
                onChange={setSelectedJobs}
                onClose={() => setShowJobDrop(false)}
                title="직군 선택"
              />
            </div>

            {/* 지역 선택 (모달) */}
            <div className="jobs-dropdown-wrap">
              <button
                className={`jobs-filter-btn ${selectedRegions.length > 0 ? "active" : ""}`}
                onClick={() => setShowRegionModal(true)}>
                {selectedRegions.length === 0
                  ? "지역 전체"
                  : selectedRegions.length === 1
                  ? selectedRegions[0]
                  : `${selectedRegions[0]} 외 ${selectedRegions.length - 1}`}
                <ChevronDown size={16} />
              </button>
              <RegionSelectModal
                open={showRegionModal}
                initial={selectedRegions}
                onClose={() => setShowRegionModal(false)}
                onApply={setSelectedRegions}
              />
            </div>

            {/* 내 주변 (지역의 위치기반 대안) */}
            <a href="/jobs/nearby" className="jobs-filter-btn"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none", color: "#5f0080", borderColor: "#e0d0f0", background: "#faf5ff", fontWeight: 700, whiteSpace: "nowrap" }}>
              <MapPin size={15} /> 내 주변
            </a>

            {/* 경력 (PC) */}
            <div className="jobs-dropdown-wrap jobs-pc-only">
              <button
                className={`jobs-filter-btn ${selectedCareer !== "경력 전체" ? "active" : ""}`}
                onClick={() => { setShowCareerDrop(!showCareerDrop); setShowJobDrop(false); setShowEmploymentDrop(false); setShowBenefitDrop(false); setShowSalaryDrop(false); }}
              >
                {CAREER_OPTS.find((o) => o.value === selectedCareer && o.value !== "경력 전체")?.label || "경력"}
                <ChevronDown size={16} />
              </button>
              {showCareerDrop && (
                <div className="jobs-dropdown">
                  {CAREER_OPTS.map((o) => (
                    <button key={o.value}
                      className={`jobs-dropdown-item ${selectedCareer === o.value ? "active" : ""}`}
                      onClick={() => { setSelectedCareer(o.value); setShowCareerDrop(false); }}>
                      {o.value === "경력 전체" ? "경력 전체" : o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 고용형태 (PC) */}
            <div className="jobs-dropdown-wrap jobs-pc-only">
              <button
                className={`jobs-filter-btn ${selectedEmployment !== "고용형태 전체" ? "active" : ""}`}
                onClick={() => { setShowEmploymentDrop(!showEmploymentDrop); setShowJobDrop(false); setShowCareerDrop(false); setShowBenefitDrop(false); setShowSalaryDrop(false); }}
              >
                {selectedEmployment !== "고용형태 전체" ? selectedEmployment : "고용형태"}
                <ChevronDown size={16} />
              </button>
              {showEmploymentDrop && (
                <div className="jobs-dropdown">
                  {EMPLOYMENT_OPTS.map((o) => (
                    <button key={o.value}
                      className={`jobs-dropdown-item ${selectedEmployment === o.value ? "active" : ""}`}
                      onClick={() => { setSelectedEmployment(o.value); setShowEmploymentDrop(false); }}>
                      {o.value === "고용형태 전체" ? "고용형태 전체" : o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 복리후생 (PC) */}
            <div className="jobs-dropdown-wrap jobs-pc-only">
              <button
                className={`jobs-filter-btn ${selectedBenefits.length > 0 ? "active" : ""}`}
                onClick={() => { setShowBenefitDrop(!showBenefitDrop); setShowJobDrop(false); setShowCareerDrop(false); setShowEmploymentDrop(false); setShowSalaryDrop(false); }}
              >
                {selectedBenefits.length > 0 ? `복리후생 · ${selectedBenefits.length}` : "복리후생"}
                <ChevronDown size={16} />
              </button>
              {showBenefitDrop && (
                <div className="jobs-dropdown jobs-dropdown-benefit">
                  {BENEFIT_FILTER.map((b) => (
                    <button key={b} type="button"
                      className={`jobs-dropdown-item jobs-dropdown-multi ${selectedBenefits.includes(b) ? "active" : ""}`}
                      onClick={() => setSelectedBenefits(selectedBenefits.includes(b) ? selectedBenefits.filter((x) => x !== b) : [...selectedBenefits, b])}>
                      <span className={`jobs-checkbox ${selectedBenefits.includes(b) ? "on" : ""}`}>{selectedBenefits.includes(b) ? "✓" : ""}</span>
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 급여 (PC) */}
            {jobTypeFilter !== "전체" && (
              <div className="jobs-dropdown-wrap jobs-pc-only">
                <button
                  className={`jobs-filter-btn ${selectedSalary > 0 ? "active" : ""}`}
                  onClick={() => { setShowSalaryDrop(!showSalaryDrop); setShowJobDrop(false); setShowCareerDrop(false); setShowEmploymentDrop(false); setShowBenefitDrop(false); }}
                >
                  {selectedSalary > 0 ? (salaryOpts.find((o) => o.value === selectedSalary)?.label || (jobTypeFilter === "매장" ? "급여" : "연봉")) : (jobTypeFilter === "매장" ? "급여" : "연봉")}
                  <ChevronDown size={16} />
                </button>
                {showSalaryDrop && (
                  <div className="jobs-dropdown">
                    {salaryOpts.map((o) => (
                      <button key={o.value} type="button"
                        className={`jobs-dropdown-item ${selectedSalary === o.value ? "active" : ""}`}
                        onClick={() => { setSelectedSalary(o.value); setShowSalaryDrop(false); }}>
                        {o.value === 0 ? (jobTypeFilter === "매장" ? "급여 전체" : "연봉 전체") : o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 상세 필터 (모바일) */}
            <div className="jobs-dropdown-wrap jobs-mobile-only">
              <button
                className={`jobs-filter-btn ${(selectedCareer !== "경력 전체" || selectedEmployment !== "고용형태 전체" || selectedBenefits.length > 0 || selectedSalary > 0) ? "active" : ""}`}
                onClick={() => setShowFilterSheet(true)}
              >
                {(() => {
                  const n = (selectedCareer !== "경력 전체" ? 1 : 0) + (selectedEmployment !== "고용형태 전체" ? 1 : 0) + selectedBenefits.length + (selectedSalary > 0 ? 1 : 0);
                  return n > 0 ? `상세 필터 · ${n}` : "상세 필터";
                })()}
                <ChevronDown size={16} />
              </button>
              <FilterSheet
                open={showFilterSheet}
                jobType={jobTypeFilter}
                initial={{ career: selectedCareer, employment: selectedEmployment, benefits: selectedBenefits, salary: selectedSalary }}
                onClose={() => setShowFilterSheet(false)}
                onApply={(f) => { setSelectedCareer(f.career); setSelectedEmployment(f.employment); setSelectedBenefits(f.benefits); setSelectedSalary(f.salary); }}
              />
            </div>
          </div>

          <div className="jobs-filter-right">
            
            <div className="jobs-sort-group">
              <button className={`jobs-sort-btn ${sort === "latest" ? "active" : ""}`} onClick={() => setSort("latest")}>최신순</button>
              <button className={`jobs-sort-btn ${sort === "popular" ? "active" : ""}`} onClick={() => setSort("popular")}>인기순</button>
            </div>
          </div>
        </div>

        {/* ===== 채용공고 그리드 ===== */}
        {filteredJobs.length > 0 ? (
          <div className="jobs-grid">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} data={{
                id: job.id,
                title: job.title,
                company: job.brand,
                region: job.region,
                career: job.career,
                employment: job.employment,
                deadline: job.deadline,
                image: job.thumbnail,
              }} variant="grid" />
            ))}
          </div>
        ) : (
          <div className="jobs-empty">
            <div className="jobs-empty-icon">🔍</div>
            <p className="jobs-empty-title">조건에 맞는 포지션이 없어요.</p>
            <button className="jobs-empty-reset" onClick={() => { setSelectedJobs([]); setSelectedCareer("경력 전체"); setSelectedEmployment("고용형태 전체"); setSelectedBenefits([]); setSelectedSalary(0); setSearchQuery(""); setSelectedRegions([]); }}>
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