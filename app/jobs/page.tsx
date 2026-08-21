"use client";
import Header from "@/components/Header";
import { jobCompanyName } from "@/lib/companyName";
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
import { StoreIcon, OfficeIcon } from "@/components/icons/JobTypeIcon";
import { formatDeadline } from "@/lib/jobFormat";


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
  // 복리후생 필터 후보는 공고등록 폼과 같은 마스터(benefit_tags, 검수됨)에서 받는다.
  // 화면마다 목록을 따로 적어 두면 등록 어휘와 필터 어휘가 갈라진다.
  const [curatedBenefits, setCuratedBenefits] = useState<string[]>(BENEFIT_FILTER);
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
            brand: jobCompanyName(j.company_type || j.job_type, j.company_name, j.brand_name),
            tags: [],
            category: null,
            title: j.title,
            jobType: (j.categories || []).join(' · '),
            categories: j.categories || [],
            career: j.experience_level === 'NEW' ? '신입' : j.experience_level === 'EXPERIENCED' ? '경력' : '경력 무관',
            region: j.location || '국내',
            type: j.company_type === 'OFFICE' ? '본사' : j.company_type === 'STORE' ? '매장' : '본사',
            thumbnail: (Array.isArray(j.cover_images) && j.cover_images[0]?.url) || j.logo_url || (Array.isArray(j.detail_images) && j.detail_images[0]?.url),
            color: '#e8f0fe',
            deadline: formatDeadline(j.deadline),
            employment: j.employment_type || null,
            // 상세 필터(경력·고용형태·복리후생·급여)가 읽는 원본 값. 카드 표시용으로 가공한
            // career/employment 만 남기는 바람에 필터가 아무것도 못 맞추고 있었다.
            experience_level: j.experience_level || null,
            employment_type: j.employment_type || null,
            benefit_tags: j.benefit_tags || [],
            salary_min: j.salary_min ?? null,
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
      setJobTypeFilter(userJobType === "OFFICE" ? "본사" : "매장");
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
  // 복리후생 어휘 자체가 매장·본사에서 다르다(기숙사 제공은 매장, 재택근무는 본사).
  // 탭을 바꾸면 그 업태의 태그만 다시 받아 온다.
  useEffect(() => {
    const jt = jobTypeFilter === "매장" ? "STORE" : jobTypeFilter === "본사" ? "OFFICE" : "";
    fetch(`/api/benefit-tags?curated=1${jt ? `&job_type=${jt}` : ""}`)
      .then((r) => r.json())
      .then((res) => {
        const names = (res?.data?.items || []).map((t: any) => t.name).filter(Boolean);
        if (names.length) setCuratedBenefits(names);
      })
      .catch(() => { /* 못 받아도 기본 목록으로 돈다 */ });
  }, [jobTypeFilter]);

  // 복리후생 후보는 그 업태의 어휘 전체를 보여 준다(매장 21 · 본사 27 · 전체 35).
  // 지금 공고에 달린 것만 남기면 목록이 서너 개로 쪼그라들어, 무엇으로 거를 수 있는지조차 알 수 없다.
  const benefitOptions = curatedBenefits;
  const filteredJobs = (apiJobs || []).filter((j: any) => {
    const matchType = jobTypeFilter === "전체" || j.type === jobTypeFilter || j.type === "both";
    const matchJob = selectedJobs.length === 0 || selectedJobs.some((s) => (j.categories || []).includes(s));
    // '경력무관' 공고는 신입에게도 경력자에게도 열려 있으니 양쪽 필터에 모두 걸린다.
    // (신입·경력을 함께 뽑는 공고가 ANY 로 저장되는데, 예전에는 신입 필터에서 사라졌다.)
    const matchCareer = selectedCareer === "경력 전체" || j.experience_level === selectedCareer
      || (j.experience_level === "ANY" && (selectedCareer === "NEW" || selectedCareer === "EXPERIENCED"));
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
          {["전체", "매장", "본사"].map((t) => (
            <button key={t}
              className={`jobs-type-tab ${jobTypeFilter === t ? "active" : ""}`}
              onClick={() => { setJobTypeFilter(t); setSelectedJobs([]); }}>
              {t === "본사" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><OfficeIcon size={15} style={{ flexShrink: 0 }} />본사</span> : t === "매장" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><StoreIcon size={15} style={{ flexShrink: 0 }} />매장</span> : "전체"}
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
                  ? "직군"
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
                  ? "지역"
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
            <a href="/jobs/nearby" className="jobs-filter-btn jobs-nearby-btn"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, textDecoration: "none", color: "#5f0080", fontWeight: 700, whiteSpace: "nowrap" }}>
              <MapPin size={15} /> 내 주변 채용
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
                  {benefitOptions.map((b) => (
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
                benefitOptions={benefitOptions}
                onClose={() => setShowFilterSheet(false)}
                onApply={(f) => { setSelectedCareer(f.career); setSelectedEmployment(f.employment); setSelectedBenefits(f.benefits); setSelectedSalary(f.salary); }}
              />
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