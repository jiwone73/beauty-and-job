"use client";
import Header from "@/components/Header";
import { jobCompanyName } from "@/lib/companyName";
import { useState, useRef, useEffect, Suspense } from "react";
import JobGroupSelectModal from "@/components/JobGroupSelectModal";
import RegionSelectModal from "@/components/RegionSelectModal";
import FilterSheet, { CAREER_OPTS, EMPLOYMENT_OPTS, BENEFIT_FILTER, SALARY_STORE, SALARY_OFFICE } from "@/components/FilterSheet";
import { SIDO_LIST } from "@/lib/data/regions";
import { shortSido } from "@/lib/regionShort";
import { STORE_JOB_GROUPS, OFFICE_JOB_GROUPS } from "@/lib/data/jobGroups";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Bookmark, ChevronDown, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import { getJobSubGroups } from "@/lib/data/jobGroups";
import JobCard from "@/components/JobCard";
import { StoreIcon, OfficeIcon } from "@/components/icons/JobTypeIcon";
import { formatDeadline } from "@/lib/jobFormat";


function JobsPageInner() {
  const { userJobType, userJobAreas } = useAuthStore();
  const searchParams = useSearchParams();

  // 매장/본사는 이 화면에서 가장 위 가지다 — 고르는 순간 사이드바의 직군 목록도,
  // 소분류도, 급여/연봉 어휘도 바뀐다. '전체'는 두지 않는다. 성격이 다른 두
  // 시장을 섞어 두면 직군이 13개로 늘어나 사이드바만 복잡해진다.
  // 메인에서 '전체'로 검색해 넘어오면 건수가 많은 매장으로 연다(114 대 26).
  const 넘어온유형 = searchParams.get("type");
  const initType = 넘어온유형 === "본사" ? "본사" : "매장";
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
  // 사이드바 직군 목록은 매장/본사에 따라 통째로 갈린다(매장 8 · 본사 5).
  const 대분류목록 = jobTypeFilter === "본사" ? OFFICE_JOB_GROUPS : STORE_JOB_GROUPS;
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

      

      <div className="jobs-container jobs-layout">
        {/* ===== 왼쪽 사이드바 — 대분류는 펼쳐 둔다 =====
            드롭다운은 무엇이 있는지 모르면 못 고른다. 뷰티는 직군 이름이 특히
            다양해서(헤어스탭·스페어·두피관리사·뷰티 어드바이저) 펼쳐 놔야
            "이런 것도 있네" 하고 눌러 본다. */}
        <aside className="jobs-side">
          <div className="seg jobs-side-type">
            {(["매장", "본사"] as const).map((t) => (
              <button key={t} type="button"
                className={`seg-btn ${jobTypeFilter === t ? "active" : ""}`}
                onClick={() => { setJobTypeFilter(t); setSelectedJobs([]); }}>
                {t === "매장" ? <StoreIcon size={14} /> : <OfficeIcon size={14} />}{t}
              </button>
            ))}
          </div>

          <div className="jobs-side-box">
            <p className="jobs-side-t">지역</p>
            <div className="jobs-side-grid c3">
              {SIDO_LIST.map((sd) => {
                const on = selectedRegions.includes(sd);
                return (
                  <button key={sd} type="button" className={on ? "on" : undefined}
                    onClick={() => setSelectedRegions(on ? selectedRegions.filter((x) => x !== sd) : [...selectedRegions, sd])}>
                    {shortSido(sd)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="jobs-side-box">
            <p className="jobs-side-t">
              직군 <i>{jobTypeFilter} {대분류목록.length}</i>
            </p>
            <div className="jobs-side-list">
              {대분류목록.map((g) => {
                const 소 = getJobSubGroups(jobTypeFilter === "매장" ? "STORE" : "OFFICE", g.group);
                const on = 소.length > 0 && 소.every((x) => selectedJobs.includes(x));
                return (
                  <button key={g.group} type="button" className={on ? "on" : undefined}
                    onClick={() => setSelectedJobs(on ? selectedJobs.filter((x) => !소.includes(x)) : Array.from(new Set([...selectedJobs, ...소])))}>
                    {g.group}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="jobs-side-box">
            <p className="jobs-side-t">근무조건</p>
            {/* 고용형태는 지금 140건 중 99건이 비어 있다(외부 크롤이 안 담아 온다).
                옆에 건수를 적어 두면, 눌러서 적게 나오는 것이 필터 탓이 아니라
                데이터 탓임이 드러난다. */}
            <p className="jobs-side-sub">고용형태</p>
            <div className="jobs-side-grid">
              {EMPLOYMENT_OPTS.filter((o) => o.value !== "고용형태 전체").map((o) => {
                const n = (apiJobs || []).filter((j: any) => j.employment_type === o.value).length;
                const on = selectedEmployment === o.value;
                return (
                  <button key={o.value} type="button" className={on ? "on" : undefined}
                    onClick={() => setSelectedEmployment(on ? "고용형태 전체" : o.value)}>
                    {o.label}<i>{n}</i>
                  </button>
                );
              })}
            </div>
            <p className="jobs-side-sub">경력</p>
            <div className="jobs-side-grid">
              {CAREER_OPTS.filter((o) => o.value !== "경력 전체").map((o) => {
                const on = selectedCareer === o.value;
                return (
                  <button key={o.value} type="button" className={on ? "on" : undefined}
                    onClick={() => setSelectedCareer(on ? "경력 전체" : o.value)}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="jobs-main">
        <div className="jobs-head">
          <b>{jobTypeFilter} 채용공고</b>
          <span>{filteredJobs.length}건</span>
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

            {/* 지역·경력·고용형태는 왼쪽 사이드바에 펼쳐 두었다. 여기에 또 두면
                같은 것을 두 곳에서 물어보게 되고, 두 값이 어긋나면 어느 쪽이
                걸린 것인지 알 수 없다. */}

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

            {/* 급여 필터는 두지 않는다. 같은 공고 안에서도 신입·경력에 따라
                값이 갈리고, 실제 데이터가 '협의'·'월 216만원 이상'·'월급 350만원'
                처럼 제각각이라 걸러도 고르는 데 도움이 안 된다. */}

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
                categories: job.categories,
                jobType: job.type === '본사' ? 'OFFICE' : 'STORE',
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