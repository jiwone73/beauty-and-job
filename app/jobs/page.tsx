"use client";
import Header from "@/components/Header";
import { jobCompanyName } from "@/lib/companyName";
import { useState, useRef, useEffect, Suspense } from "react";
import JobGroupSelectModal from "@/components/JobGroupSelectModal";
import RegionSelectModal from "@/components/RegionSelectModal";
import FilterSheet, { CAREER_OPTS, EMPLOYMENT_OPTS, BENEFIT_FILTER, SALARY_STORE, SALARY_OFFICE } from "@/components/FilterSheet";
import { SIDO_LIST, getSigunguList } from "@/lib/data/regions";
import { shortSido } from "@/lib/regionShort";
import { STORE_JOB_GROUPS, OFFICE_JOB_GROUPS } from "@/lib/data/jobGroups";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Bookmark, ChevronDown, ChevronRight, RotateCcw, X } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import { getJobSubGroups } from "@/lib/data/jobGroups";
import JobCard from "@/components/JobCard";
import { StoreIcon, OfficeIcon } from "@/components/icons/JobTypeIcon";
import { formatDeadline } from "@/lib/jobFormat";



/**
 * 사이드바 항목 옆에 붙는 팝오버.
 *
 * 시군구는 250개가 넘고 복리후생도 스무 개가 넘는다. 사이드바에 다 펼치면
 * 화면을 통째로 잡아먹으므로, 누른 자리 옆에 그때만 띄운다.
 * 바깥을 누르거나 Esc 를 누르면 닫힌다 — 열어 놓고 다른 데를 눌렀는데
 * 그대로 떠 있으면 무엇이 열려 있는지 잊는다.
 */
function Pop({ title, onClose, 좌, 상, children }: { title: string; onClose: () => void; 좌: number; 상: number; children: React.ReactNode }) {
  const 상자 = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const 바깥 = (e: MouseEvent) => {
      if (상자.current && !상자.current.contains(e.target as Node)) onClose();
    };
    const 키 = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    // 여는 클릭이 그대로 '바깥 클릭'으로 잡히지 않도록 한 틱 뒤에 건다.
    const t = setTimeout(() => document.addEventListener("mousedown", 바깥), 0);
    document.addEventListener("keydown", 키);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", 바깥); document.removeEventListener("keydown", 키); };
  }, [onClose]);
  return (
    <div className="jobs-pop" ref={상자} role="dialog" aria-label={title} style={{ left: 좌, top: 상 }}>
      <div className="jobs-pop-h">
        <span className="jobs-pop-title">{title}</span>
        <button type="button" onClick={onClose} aria-label="닫기"><X size={14} /></button>
      </div>
      <div className="jobs-pop-body">{children}</div>
    </div>
  );
}

function PopItem({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={`jobs-pop-item${on ? " on" : ""}`} onClick={onClick}>
      <span className={`jobs-checkbox ${on ? "on" : ""}`}>{on ? "✓" : ""}</span>
      {children}
    </button>
  );
}

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
  // 사이드바에서 펼쳐 둔 직군 대분류. 한 번에 하나만 연다 — 여럿 펼치면
  // 사이드바가 길어져 아래 근무조건이 화면 밖으로 밀린다.
  // 지금 열려 있는 팝오버. 한 번에 하나만 연다.
  const [열린팝오버, set열린팝오버] =
    useState<{ 종류: "지역" | "직군" | "고용형태" | "경력" | "복리후생"; 키?: string; 좌: number; 상: number } | null>(null);
  const 사이드바 = useRef<HTMLElement>(null);
  // 팝오버는 사이드바 오른쪽 바깥에 띄운다. 안쪽 칸에 붙이면 옆 항목을 덮어
  // 무엇을 누른 것인지 가려진다. 위치는 열 때 한 번 잰다.
  const 팝열기 = (e: React.MouseEvent, 종류: any, 키?: string) => {
    const 옆 = 사이드바.current?.getBoundingClientRect();
    const 줄 = (e.currentTarget as HTMLElement).getBoundingClientRect();
    set열린팝오버({ 종류, 키, 좌: (옆?.right ?? 0) + 10, 상: Math.max(78, 줄.top - 8) });
  };

  // 시도 전체를 고르면 그 안의 시군구 선택은 지운다 — 둘이 함께 걸려 있으면
  // 무엇으로 걸러졌는지 알 수 없다.
  const 지역토글 = (값: string, 시도전체: boolean) => {
    setSelectedRegions((prev) => {
      if (prev.includes(값)) return prev.filter((x) => x !== 값);
      if (시도전체) return [...prev.filter((x) => !x.startsWith(값 + " ")), 값];
      const 시도 = 값.split(" ")[0];
      return [...prev.filter((x) => x !== 시도), 값];
    });
  };
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
    if (t) qs.set("type", t);
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
            // 목록 카드는 '이 매장이 어디인가'를 먼저 말해야 한다. 그래서 매장이
            // 그 용도로 직접 고른 프로필 사진(로고·간판)을 먼저 쓴다. 배너는
            // 상세 페이지 상단에서 크게 보여 주려고 받은 홍보 사진이라 성격이 다르다.
            // 프로필 사진이 없으면 예전처럼 배너로 물러선다.
            thumbnail: j.signboard_url || (Array.isArray(j.cover_images) && j.cover_images[0]?.url) || j.logo_url || (Array.isArray(j.detail_images) && j.detail_images[0]?.url),
            color: '#f7f7f8',
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
  // 지금 몇 가지가 걸려 있는지. 0 이면 초기화 버튼을 눌러도 바뀔 것이 없다.
  const 걸린조건 = selectedRegions.length + selectedJobs.length + selectedBenefits.length
    + (selectedEmployment !== "고용형태 전체" ? 1 : 0)
    + (selectedCareer !== "경력 전체" ? 1 : 0);
  // 결과 위에 늘어놓을 '고른 값'. 하나씩 뺄 수 있어야 처음부터 다시 고르지
  // 않는다. 사이드바에서 고른 순서가 아니라 종류별로 묶어 보여 준다.
  const 고른값: { id: string; 글: string; 빼기: () => void }[] = [
    ...selectedRegions.map((r) => ({
      id: `r:${r}`,
      글: r.includes(" ") ? `${shortSido(r.split(" ")[0])} ${r.split(" ").slice(1).join(" ")}` : `${shortSido(r)} 전체`,
      빼기: () => setSelectedRegions(selectedRegions.filter((x) => x !== r)),
    })),
    ...selectedJobs.map((j) => ({
      id: `j:${j}`, 글: j,
      빼기: () => setSelectedJobs(selectedJobs.filter((x) => x !== j)),
    })),
    ...(selectedEmployment !== "고용형태 전체"
      ? [{ id: "e", 글: selectedEmployment, 빼기: () => setSelectedEmployment("고용형태 전체") }] : []),
    ...(selectedCareer !== "경력 전체"
      ? [{ id: "c", 글: CAREER_OPTS.find((o) => o.value === selectedCareer)?.label || selectedCareer,
           빼기: () => setSelectedCareer("경력 전체") }] : []),
    ...selectedBenefits.map((b) => ({
      id: `b:${b}`, 글: b,
      빼기: () => setSelectedBenefits(selectedBenefits.filter((x) => x !== b)),
    })),
  ];

  // 초기화는 사이드바 아래와 상단 필터 두 곳에 있다. 하는 일이 다르면
  // 어느 쪽을 눌러야 할지 매번 생각해야 하므로, 같은 함수를 나눠 쓴다.
  const 조건모두풀기 = () => {
    setSelectedRegions([]); setSelectedJobs([]);
    setSelectedEmployment("고용형태 전체"); setSelectedCareer("경력 전체");
    setSelectedBenefits([]); set열린팝오버(null);
  };
  const filteredJobs = (apiJobs || []).filter((j: any) => {
    const matchType = j.type === jobTypeFilter || j.type === "both";
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
      <Header />

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
        <aside className="jobs-side" ref={사이드바}>
          <div className="seg jobs-side-type">
            {(["매장", "본사"] as const).map((t) => (
              <button key={t} type="button"
                className={`seg-btn ${jobTypeFilter === t ? "active" : ""}`}
                onClick={() => { setJobTypeFilter(t); setSelectedJobs([]); set열린팝오버(null); }}>
                {t === "매장" ? <StoreIcon size={14} /> : <OfficeIcon size={14} />}{t}
              </button>
            ))}
          </div>

          {/* 지역 — 시도를 누르면 그 시도의 시군구가 옆에 뜬다. 시군구까지
              사이드바에 펼치면 250개가 넘어 화면을 다 잡아먹는다. */}
          <div className="jobs-side-box">
            <p className="jobs-side-t">지역</p>
            <div className="jobs-side-grid c3">
              {SIDO_LIST.map((sd) => {
                const 고른수 = selectedRegions.filter((r) => r === sd || r.startsWith(sd + " ")).length;
                const 열림 = 열린팝오버?.종류 === "지역" && 열린팝오버.키 === sd;
                return (
                  <span key={sd} className="jobs-pop-wrap">
                    <button type="button" className={고른수 ? "on" : undefined}
                      onClick={(e) => 열림 ? set열린팝오버(null) : 팝열기(e, "지역", sd)}>
                      <span>{shortSido(sd)}</span>
                      {고른수 > 0 && <em>{고른수}</em>}
                      <ChevronRight size={13} className="jobs-side-arr" />
                    </button>
                    {열림 && (
                      <Pop onClose={() => set열린팝오버(null)} title={sd} 좌={열린팝오버.좌} 상={열린팝오버.상}>
                        <PopItem on={selectedRegions.includes(sd)}
                          onClick={() => 지역토글(sd, true)}>{shortSido(sd)} 전체</PopItem>
                        {getSigunguList(sd).map((gu) => {
                          const v = `${sd} ${gu}`;
                          return <PopItem key={gu} on={selectedRegions.includes(v)} onClick={() => 지역토글(v, false)}>{gu}</PopItem>;
                        })}
                      </Pop>
                    )}
                  </span>
                );
              })}
            </div>
          </div>

          {/* 직군 — 대분류를 누르면 소분류가 옆에 뜬다. */}
          <div className="jobs-side-box">
            <p className="jobs-side-t">직군</p>
            <div className="jobs-side-list">
              {대분류목록.map((g) => {
                const 소 = getJobSubGroups(jobTypeFilter === "매장" ? "STORE" : "OFFICE", g.group);
                const 고른수 = 소.filter((x) => selectedJobs.includes(x)).length;
                const 열림 = 열린팝오버?.종류 === "직군" && 열린팝오버.키 === g.group;
                return (
                  <span key={g.group} className="jobs-pop-wrap block">
                    <button type="button" className={고른수 ? "on" : undefined}
                      onClick={(e) => 열림 ? set열린팝오버(null) : 팝열기(e, "직군", g.group)}>
                      <span>{g.group}</span>
                      {고른수 > 0 && <em>{고른수}</em>}
                      <ChevronRight size={13} className="jobs-side-arr" />
                    </button>
                    {열림 && (
                      <Pop onClose={() => set열린팝오버(null)} title={g.group} 좌={열린팝오버.좌} 상={열린팝오버.상}>
                        <PopItem on={소.length > 0 && 소.every((x) => selectedJobs.includes(x))}
                          onClick={() => {
                            const 전부 = 소.every((x) => selectedJobs.includes(x));
                            setSelectedJobs(전부 ? selectedJobs.filter((x) => !소.includes(x))
                                                : Array.from(new Set([...selectedJobs, ...소])));
                          }}>전체</PopItem>
                        {소.map((x) => (
                          <PopItem key={x} on={selectedJobs.includes(x)}
                            onClick={() => setSelectedJobs(selectedJobs.includes(x) ? selectedJobs.filter((y) => y !== x) : [...selectedJobs, x])}>{x}</PopItem>
                        ))}
                      </Pop>
                    )}
                  </span>
                );
              })}
            </div>
          </div>

          {/* 근무조건 — 셋 다 누르면 옆에 뜬다. */}
          <div className="jobs-side-box">
            <p className="jobs-side-t">근무조건</p>
            <div className="jobs-side-list">
              {([
                { 키: "고용형태", 값: selectedEmployment !== "고용형태 전체" ? 1 : 0 },
                { 키: "경력", 값: selectedCareer !== "경력 전체" ? 1 : 0 },
                { 키: "복리후생", 값: selectedBenefits.length },
              ] as const).map(({ 키, 값 }) => {
                const 열림 = 열린팝오버?.종류 === 키;
                return (
                  <span key={키} className="jobs-pop-wrap block">
                    <button type="button" className={값 ? "on" : undefined}
                      onClick={(e) => 열림 ? set열린팝오버(null) : 팝열기(e, 키)}>
                      <span>{키}</span>
                      {값 > 0 && <em>{값}</em>}
                      <ChevronRight size={13} className="jobs-side-arr" />
                    </button>
                    {열림 && (
                      <Pop onClose={() => set열린팝오버(null)} title={키} 좌={열린팝오버.좌} 상={열린팝오버.상}>
                        {키 === "고용형태" && EMPLOYMENT_OPTS.filter((o) => o.value !== "고용형태 전체").map((o) => (
                          <PopItem key={o.value} on={selectedEmployment === o.value}
                            onClick={() => setSelectedEmployment(selectedEmployment === o.value ? "고용형태 전체" : o.value)}>{o.label}</PopItem>
                        ))}
                        {키 === "경력" && CAREER_OPTS.filter((o) => o.value !== "경력 전체").map((o) => (
                          <PopItem key={o.value} on={selectedCareer === o.value}
                            onClick={() => setSelectedCareer(selectedCareer === o.value ? "경력 전체" : o.value)}>{o.label}</PopItem>
                        ))}
                        {키 === "복리후생" && benefitOptions.map((b) => (
                          <PopItem key={b} on={selectedBenefits.includes(b)}
                            onClick={() => setSelectedBenefits(selectedBenefits.includes(b) ? selectedBenefits.filter((x) => x !== b) : [...selectedBenefits, b])}>{b}</PopItem>
                        ))}
                      </Pop>
                    )}
                  </span>
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

        {/* ===== 고른 값 =====
            여기는 무엇으로 걸렀는지 보여 주기만 한다. 거는 일은 왼쪽
            사이드바가 맡는다 — 같은 조건을 두 곳에서 걸 수 있으면 두 값이
            어긋났을 때 어느 쪽이 걸린 것인지 알 수 없다. */}
        {고른값.length > 0 && (
          <div className="jobs-picked">
            {고른값.map((c) => (
              <button key={c.id} type="button" className="jobs-picked-chip" onClick={c.빼기}>
                {c.글} <X size={13} />
              </button>
            ))}
            <button type="button" className="jobs-filter-reset" onClick={조건모두풀기}>
              <RotateCcw size={13} />초기화
            </button>
          </div>
        )}

        {/* 폰에는 사이드바가 없다. 거기서는 이 시트가 유일한 필터다. */}
        <div className="jobs-mobile-only" style={{ padding: "10px 0 0" }}>
          <button
            className={`jobs-filter-btn ${걸린조건 > 0 ? "active" : ""}`}
            onClick={() => setShowFilterSheet(true)}
          >
            {걸린조건 > 0 ? `상세 필터 · ${걸린조건}` : "상세 필터"}
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