"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 모집분야한줄 } from "@/lib/positionLine";
import CompanyLayout from "@/components/company/CompanyLayout";
import {
  Search, BookmarkCheck, Bookmark, X,
  MapPin, ChevronDown, ChevronRight, SlidersHorizontal, Send, Lock, Briefcase, Wallet,
} from "lucide-react";
import { companyTalentApi, companyJobsApi, type TalentItem } from "@/lib/api/company";
import JobGroupSelectModal from "@/components/JobGroupSelectModal";
import FilterDropdown from "@/components/company/FilterDropdown";
import RegionSelectModal from "@/components/RegionSelectModal";
import { 지역비교 } from "@/lib/regionMatch";
import { getJobGroups, getJobSubGroups, 경력단계, 직군의경력단계 } from "@/lib/data/jobGroups";
import { Pop, PopItem } from "@/components/filters/SidePop";
import { SIDO_LIST, getSigunguList } from "@/lib/data/regions";
import { shortSido } from "@/lib/regionShort";
import { formatSalaryWon } from "@/lib/salary";
import TalentCard from "@/components/company/TalentCard";

type JobTab = "OFFICE" | "STORE";

// 경력은 공고 모집부문과 같은 사다리를 쓴다. 매장은 연차로 뽑지 않는다 —
// 인턴·신입·경력·실장이지 「3년차」가 아니다. 두 화면이 다른 말을 쓰면
// 같은 사람을 두고 매장과 우리가 다른 것을 세게 된다.
// 매장은 자리(인턴·신입·경력·실장), 본사는 연차. 공고 모집부문과 같은 말이다.
const 단계차례 = ["인턴", "신입", "경력", "실장", "매니저급", "점장급",
                  "1~2년", "3~5년", "5~10년", "10년+"];
const AGE_FILTERS    = ["전체", "20대", "30대", "40대 이상"];
// 다른 필터와 같은 말을 쓴다. 「무관」은 공고에서 쓰는 말이고(성별 무관
// 우대), 여기서는 가리지 않고 다 보는 것이라 「전체」다.
const GENDER_FILTERS = ["전체", "여성", "남성"];

function shortenRegion(region: string | null | undefined): string {
  if (!region) return "—";
  return region
    .replace(/특별자치도|특별자치시|특별시|광역시/g, "")
    .replace(/\s+/g, " ")
    .trim() || region;
}

function jobTypeLabel(jobType: string | null | undefined): string | null {
  if (jobType === "STORE") return "매장";
  if (jobType === "OFFICE") return "본사";
  return null;
}

const FLEX = { name: 1.4, job: 1.1, region: 0.9, career: 1.8, contact: 1.4 };
const W_ACTION = 120;
const ROW_H = 68;
const divider = "1px solid #f0f0f0";

function careerLabel(years: number | null, count: number): string {
  if (!count || years === null || years === 0) return "신입";
  return `경력 ${years}년`;
}
function genderLabel(gender: string | null): string | null {
  if (gender === "남성" || gender === "MALE" || gender === "M") return "남";
  if (gender === "여성" || gender === "FEMALE" || gender === "F") return "여";
  return null;
}

export default function TalentPage() {
  const router = useRouter();
  // 머리줄과 같은 규칙 — /company/dashboard/* 아래면 그대로, 아니면 /{companyId} 아래다.
  const pathname = usePathname();
  const base = pathname.split("/").filter(Boolean)[0] === "company"
    ? "/company/dashboard"
    : `/${pathname.split("/").filter(Boolean)[0]}`;
  const [activeTab, setActiveTab]     = useState<JobTab>("STORE");
  // 매장은 매장 인재만, 본사는 본사 인재만 본다. 서로의 인재풀을 볼 일이 없고,
  //   열어 두면 남의 이메일·전화만 넓게 보이는 셈이다. 겸업(BOTH) 회원만 고를 수 있다.
  const [companyType, setCompanyType] = useState<"OFFICE" | "STORE" | "BOTH" | null>(null);
  const [talents, setTalents]         = useState<TalentItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [total, setTotal]             = useState(0);

  const [search, setSearch]                       = useState("");
  const [careerFilter, setCareerFilter]           = useState("전체");
  const [jobGroupOpen, setJobGroupOpen]           = useState(false);
  const [selectedJobGroups, setSelectedJobGroups] = useState<string[]>([]);
  const [regionOpen, setRegionOpen]               = useState(false);
  const [selectedRegions, setSelectedRegions]     = useState<string[]>([]);
  // 사이드 필터에서 펼쳐 둔 항목. 한 번에 하나만 연다 — 여럿 펼치면 사이드가
  // 길어져 아래 항목이 화면 밖으로 밀린다. 채용공고 페이지와 같은 짜임이다.
  const [열린팝, set열린팝] = useState<{ 종류: string; 키?: string; 좌: number; 상: number } | null>(null);
  const 필터판 = useRef<HTMLDivElement>(null);
  // 판은 사이드 오른쪽 바깥에 띄운다. 안쪽에 붙이면 옆 항목을 덮어 무엇을 누른
  // 것인지 가려진다. 자리는 열 때 한 번 잰다.
  const 팝열기 = (e: React.MouseEvent, 종류: string, 키?: string) => {
    const 옆 = 필터판.current?.getBoundingClientRect();
    const 줄 = (e.currentTarget as HTMLElement).getBoundingClientRect();
    set열린팝({ 종류, 키, 좌: (옆?.right ?? 0) + 10, 상: Math.max(78, 줄.top - 8) });
  };
  // 시도 전체를 고르면 그 안의 시군구 선택은 지운다 — 둘이 함께 걸려 있으면
  // 무엇으로 걸러졌는지 알 수 없다.
  const 지역토글 = (값: string, 시도전체: boolean) => {
    setSelectedRegions((prev) => {
      if (prev.includes(값)) return prev.filter((x) => x !==값);
      if (시도전체) return [...prev.filter((x) => !x.startsWith(값 + " ")), 값];
      const 시도 = 값.split(" ")[0];
      return [...prev.filter((x) => x !== 시도), 값];
    });
  };
  const [ageFilter, setAgeFilter]                 = useState("전체");
  const [genderFilter, setGenderFilter]           = useState("전체");

  const [isMobile, setIsMobile] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<"search" | "scrap">("search");
  // 공고가 곧 입장권(셀렉미와 같은 규칙). 없으면 연락처가 잠기고 제안도 못 보낸다.

  // 제안하기 — 채팅 없이, 고른 공고 링크 + 메시지를 알림·이메일로만 보낸다.
  const [proposeTarget, setProposeTarget] = useState<TalentItem | null>(null);
  const [proposeJobs, setProposeJobs] = useState<{
    id: string; title: string; location?: string | null;
    employment_type?: string | null; salary_type?: string | null;
    salary_min?: number | null; deadline?: string | null;
    job_type?: string | null; positions?: any[] | null;
  }[]>([]);
  // 어느 자리로 제안하는가. 공고에 모집분야가 여럿일 때 고른다 —
  // 없으면 받는 사람이 어느 자리를 제안받은 것인지 알 수 없다.
  const [proposePos, setProposePos] = useState<number | null>(null);
  const [proposeJobsLoading, setProposeJobsLoading] = useState(false);
  // 보낸 제안에서 「이 공고로 제안 보내기」로 넘어오면 그 공고를 미리 골라 둔다.
  // 보내는 자리는 여기 그대로고, 공고를 다시 고르는 수고만 던다.
  const [proposeJobId, setProposeJobId] = useState("");
  // 주소는 그려진 뒤에 읽는다.
  //
  // 처음 그릴 때 읽었더니 화면 안에서 옮겨 왔을 때(채용제안 → 이 화면) 주소가
  // 아직 안 바뀌어 있어 빈 값이었다. 주소를 직접 치고 들어올 때만 되고 단추로
  // 넘어오면 공고가 안 골라졌다.
  const [미리고른공고, set미리고른공고] = useState("");
  const [보내는공고이름, set보내는공고이름] = useState("");
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("job") || "";
    set미리고른공고(id);
    if (!id) return;
    // 띠에 공고 이름을 적으려면 이름이 있어야 한다. 제안 창을 열기 전이라
    // 공고 목록이 아직 없으므로 여기서 한 번 받아 둔다.
    companyJobsApi.list({ status: "ACTIVE", limit: 100 })
      .then((r: any) => {
        const j = r?.success && Array.isArray(r.data) ? r.data.find((x: any) => x.id === id) : null;
        if (!j) return;
        set보내는공고이름(j.title || "");
        // 그 공고의 직군을 필터에 걸어 둔다. 안 걸면 넘어와도 인재 전부가 뜬다
        //   — 네일 공고로 왔는데 헤어·피부·본사 마케터까지 섞여 있어, 그 공고에
        //   맞는 사람을 처음부터 다시 찾아야 했다.
        // 사이드 필터에 그대로 걸리므로 언제든 풀 수 있다.
        const 유형 = j.job_type === "OFFICE" ? "OFFICE" : "STORE";
        setActiveTab(유형);
        // 공고에 적힌 소분류가 아니라 그 소분류가 든 대분류 전체를 건다.
        //   「네일 스탭·인턴」으로 좁히니 아무도 안 남았다(0명). 네일 자리를
        //   뽑는데 네일 하는 사람이 안 보이면 걸러 둔 뜻이 없다.
        const 적힌것 = Array.isArray(j.categories) ? j.categories.filter(Boolean) : [];
        const 넓힌것 = new Set<string>();
        for (const g of getJobGroups(유형)) {
          const 소 = getJobSubGroups(유형, g.group);
          if (소.some((x) => 적힌것.includes(x))) 소.forEach((x) => 넓힌것.add(x));
        }
        const 걸것 = 넓힌것.size ? [...넓힌것] : 적힌것;
        if (걸것.length) setSelectedJobGroups(걸것);
      })
      .catch(() => {});
  }, []);
  const [proposeMessage, setProposeMessage] = useState("");
  const [proposeSending, setProposeSending] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleTabSwitch = (tab: JobTab) => {
    setActiveTab(tab);
    setSearch("");
    setSelectedJobGroups([]);
    setSelectedRegions([]);
    setCareerFilter("전체");
    setAgeFilter("전체");
    setGenderFilter("전체");
  };





  // 알림에서 「관심 있어요」를 눌러 넘어오면 그 사람들만 추려 본다 —
  // 목록이 길면 누가 답했는지 찾는 일이 일이 된다.
  const [관심만, set관심만] = useState(false);
  // 스크랩 목록에서 「제안 보내기」로 넘어오면 그 사람 제안 창을 바로 연다 —
  // 찜해 둔 사람을 다시 검색해서 찾게 하지 않는다.
  const [보낼사람, set보낼사람] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    set보낼사람(new URLSearchParams(window.location.search).get("propose"));
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    set관심만(new URLSearchParams(window.location.search).get("interested") === "1");
  }, []);

  const fetchTalents = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        jobType: activeTab,
        search: search || undefined,
        jobGroups: selectedJobGroups.length > 0 ? selectedJobGroups.join(",") : undefined,
        careerFilter,
        page: 1,
        limit: 50,
      };
      if (관심만) params.interested = true;
      if (activeTab === "STORE") {
        if (selectedRegions.length > 0) params.regions = selectedRegions.join(",");
        if (ageFilter !== "전체") params.ageGroup = ageFilter;
        if (genderFilter !== "전체") params.gender = genderFilter;
      }
      const res = await companyTalentApi.list(params);
      if (res.success && res.data) {
        setTalents(res.data);
        if (보낼사람) {
          // 공고를 들고 넘어오면 목록이 그 공고의 직군으로 걸러져 있어, 스크랩해 둔 사람이
          // 안 들어 있을 수 있다(네일 공고로 담아 둔 헤어 경력자). 그러면 스크랩 목록에서 찾는다.
          let 그사람: TalentItem | undefined = res.data.find((t) => t.id === 보낼사람);
          if (!그사람) {
            const r2: any = await companyTalentApi.list({ scrapped: true, limit: 200 }).catch(() => null);
            그사람 = r2?.success ? (r2.data || []).find((t: TalentItem) => t.id === 보낼사람) : undefined;
          }
          if (그사람) openPropose(그사람);
          set보낼사람(null);
        }
        setTotal(res.meta?.total ?? res.data.length);
      }
    } catch (e) {
      console.error("[talent fetch]", e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, selectedJobGroups, careerFilter, selectedRegions, ageFilter, genderFilter, 관심만]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch("/api/company/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        const ct = res?.data?.company_type as "OFFICE" | "STORE" | "BOTH" | undefined;
        if (ct) {
          setCompanyType(ct);
          if (ct === "OFFICE") setActiveTab("OFFICE");
          else setActiveTab("STORE");
        }
      })
      .catch((e) => console.error("[company me]", e));
  }, []);

  // 스크랩 목록도 인재 검색과 같은 API 로 받는다(scrapped=1). 예전에는 따로 만든
  // /api/company/talent/scrapped 를 불렀는데, 거기에는 열람권 잠금이 없어 유료가 아닌
  // 기업에도 스크랩한 사람의 실명이 보였고 응답에는 전화번호까지 실려 있었다.
  // 목록이 두 벌이면 곧 어긋난다 — 스크랩 인재 화면과 같은 한 벌을 쓴다.
  const fetchScrapped = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await companyTalentApi.list({ scrapped: true, limit: 200 });
      const rows: TalentItem[] = res?.success ? (res.data || []) : [];
      setTalents(rows);
      setTotal(rows.length);
    } catch (e) {
      console.error("[talent scrapped fetch]", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view !== "search") return;
    const t = setTimeout(fetchTalents, 300);
    return () => clearTimeout(t);
  }, [view, fetchTalents]);

  useEffect(() => {
    if (view !== "scrap") return;
    fetchScrapped();
  }, [view, fetchScrapped]);

  const switchView = (next: "search" | "scrap") => {
    if (next === view) return;
    setView(next);
    setFilterOpen(false);
    setTalents([]);
    setTotal(0);
  };

  const toggleScrap = async (item: TalentItem) => {
    const next = !item.scrapped;
    const update = (on: boolean) => {
      setTalents((prev) => prev.map((t) => t.id === item.id ? { ...t, scrapped: on } : t));
    };
    update(next);
    try {
      if (next) await companyTalentApi.scrap(item.id);
      else await companyTalentApi.unscrap(item.id);
    } catch {
      update(!next);
    }
  };

  // 스크랩을 담을 공고 — 진행 중인 공고만. 북마크를 누르면 여기서 고른다.
  const [scrapJobs, setScrapJobs] = useState<{ id: string; title: string }[]>([]);
  useEffect(() => {
    companyJobsApi.list({ status: "ACTIVE", limit: 100 })
      .then((res: any) => {
        if (!res?.success || !res.data) return;
        setScrapJobs(res.data
          .filter((j: any) => !j.deadline || new Date(j.deadline) >= new Date(new Date().toDateString()))
          .map((j: any) => ({ id: j.id, title: j.title })));
      })
      .catch(() => {});
  }, []);

  // 공고 하나에 담거나 뺀다. 화면을 먼저 바꾸고, 서버가 알려 준 담은 공고로 맞춘다.
  const scrapJob = async (item: TalentItem, key: string, on: boolean) => {
    const 앞 = item.scrapJobIds || [];
    const 뒤 = on ? Array.from(new Set([...앞, key])) : 앞.filter((k) => k !== key);
    const 맞추기 = (ids: string[]) => setTalents((prev) => prev.map((t) =>
      t.id === item.id ? { ...t, scrapJobIds: ids, scrapped: ids.length > 0 } : t));
    맞추기(뒤);
    try {
      const res: any = on
        ? await companyTalentApi.scrap(item.id, key === "none" ? null : key)
        : await companyTalentApi.unscrap(item.id, key);
      if (res?.success && Array.isArray(res.data?.scrapJobIds)) 맞추기(res.data.scrapJobIds);
    } catch {
      맞추기(앞);
    }
  };

  const openPropose = async (item: TalentItem) => {
    setProposeTarget(item);
    setProposeJobId("");
    setProposeMessage("");
    if (proposeJobs.length === 0) {
      setProposeJobsLoading(true);
      try {
        const res = await companyJobsApi.list({ status: "ACTIVE", limit: 100 });
        if (res.success && res.data)
          setProposeJobs(res.data
            // 상태가 ACTIVE 여도 마감일이 지났으면 실질 마감이다. 이미 닫힌 공고로
            // 제안하면 받은 사람은 열어봐야 지원할 수 없다.
            .filter((j: any) => !j.deadline || new Date(j.deadline) >= new Date(new Date().toDateString()))
            .map((j: any) => ({
              id: j.id, title: j.title, location: j.location || null,
              employment_type: j.employment_type || null, salary_type: j.salary_type || null,
              salary_min: j.salary_min ?? null, deadline: j.deadline || null,
              job_type: j.job_type || null,
              positions: Array.isArray(j.positions) ? j.positions.filter((x: any) => x && x.category) : [],
            })));
      } catch (e) {
        console.error("[propose jobs fetch]", e);
      } finally {
        setProposeJobsLoading(false);
      }
    }
  };

  // 고른 공고의 근무지와 후보자 희망 지역이 어긋나면 보내기 전에 알려 준다.
  // 알 수 없을 때는 경고하지 않는다 — 확실할 때만 말한다.
  const 고른공고 = proposeJobs.find((j) => j.id === proposeJobId);
  const 지역어긋남 = 지역비교(고른공고?.location, proposeTarget?.regionPrefer) === "differ";

  // 공고를 고르면 인사말을 깔아 둔다. 빈 칸을 마주하면 대충 쓰거나 그냥 닫는다 —
  // 버튼으로 두면 못 찾는 사람에게는 여전히 빈 칸이라, 고르는 순간 채운다.
  // 이미 손대 쓴 글이 있으면 덮지 않는다.
  const 공고고르기 = (id: string) => {
    setProposeJobId(id);
    // 자리가 하나뿐이면 고르고 말고가 없다. 여럿이면 비워 두고 고르게 한다.
    const 자리들 = proposeJobs.find((j) => j.id === id)?.positions || [];
    setProposePos(자리들.length === 1 ? 0 : null);
    if (!id || !proposeTarget) return;
    const 공고 = proposeJobs.find((j) => j.id === id);
    const 직 = proposeTarget.subJob || proposeTarget.mainJobGroup || "";
    const 년 = proposeTarget.careerCount && proposeTarget.careerYears ? proposeTarget.careerYears : null;
    const 경력 = 직 && 년 ? `${직} 경력 ${년}년`
      : 년 ? `${년}년 경력`
      : 직 ? `${직} 경험` : "";
    const 이유 = 경력 ? `${경력}을 보고 ` : "";
    const 초안 = `안녕하세요, ${proposeTarget.name}님.\n${이유}저희 '${공고?.title || "채용공고"}'에 함께하시면 좋을 것 같아 연락드립니다.\n공고 보시고 관심 있으시면 편하게 연락 주세요.`;
    setProposeMessage((prev) => (prev.trim() && prev !== 초안 && !prev.startsWith("안녕하세요,") ? prev : 초안));
  };

  // 보낸 제안에서 공고를 안고 넘어왔으면 창이 열릴 때 그 공고를 골라 둔다.
  // 한 번만 한다 — 사람이 일부러 다른 공고로 바꿨는데 되돌려 놓으면 안 된다.
  const 미리고름적용 = useRef(false);
  useEffect(() => {
    if (!proposeTarget) { 미리고름적용.current = false; return; }
    if (미리고름적용.current || !미리고른공고 || proposeJobId) return;
    if (!proposeJobs.some((j) => j.id === 미리고른공고)) return;
    미리고름적용.current = true;
    공고고르기(미리고른공고);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposeTarget, proposeJobs, 미리고른공고, proposeJobId]);

  const sendPropose = async () => {
    if (!proposeTarget || !proposeJobId || !proposeMessage.trim()) return;
    if ((고른공고?.positions?.length || 0) > 1 && proposePos === null) {
      alert("어느 자리로 제안할지 골라 주세요.");
      return;
    }
    setProposeSending(true);
    try {
      await companyTalentApi.propose(proposeTarget.id, { jobPostingId: proposeJobId, positionIndex: proposePos, message: proposeMessage.trim() });
      alert("제안을 보냈어요.");
      const 보낸이 = proposeTarget.id;
      const 지금 = new Date().toISOString();
      setTalents((prev) => prev.map((t) => (t.id === 보낸이 ? { ...t, proposedAt: 지금 } : t)));
      setProposeTarget(null);
    } catch (e: any) {
      alert(e?.message || "제안 전송에 실패했습니다.");
    } finally {
      setProposeSending(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedJobGroups([]);
    setSelectedRegions([]);
    setCareerFilter("전체");
    setAgeFilter("전체");
    setGenderFilter("전체");
  };


  // 고른 직군이 있으면 그 직군의 사다리만, 없으면 이 탭에 있는 단계를 모은다.
  const 경력선택지 = useMemo(() => {
    const 모음 = new Set<string>();
    if (selectedJobGroups.length > 0) {
      selectedJobGroups.forEach((g) => 직군의경력단계(g).forEach((s) => 모음.add(s)));
    } else {
      getJobGroups(activeTab).forEach((g) => 경력단계(g.group).forEach((s) => 모음.add(s)));
    }
    return ["전체", ...단계차례.filter((s) => 모음.has(s))];
  }, [selectedJobGroups, activeTab]);


  // 사이드 필터. 대분류를 누르면 소분류가 옆으로 펼쳐진다 — 채용공고 페이지와
  // 같은 방식이다. 예전에는 여기만 상단 드롭다운이라, 같은 일을 하는 두 화면이
  // 서로 다르게 움직였다.
  const 필터 = (
    <div className="co-side-filter" ref={필터판}>
      {activeTab === "STORE" && (
        <div className="jobs-side-box">
          <p className="jobs-side-t">지역</p>
          {/* 시도는 한 줄에 셋. 세로로 세우면 열일곱 줄이 되어 아래 직군이
              화면 밖으로 밀린다 — 채용공고 페이지와 같은 짜임이다. */}
          <div className="jobs-side-grid c3">
            {SIDO_LIST.map((시도) => {
              const 고른수 = selectedRegions.filter((r) => r === 시도 || r.startsWith(시도 + " ")).length;
              const 열림 = 열린팝?.종류 === "지역" && 열린팝.키 === 시도;
              return (
                <span key={시도} className="jobs-pop-wrap">
                  <button type="button" className={고른수 ? "on" : undefined}
                    onClick={(e) => 열림 ? set열린팝(null) : 팝열기(e, "지역", 시도)}>
                    <span>{shortSido(시도)}</span>
                    {고른수 > 0 && <em>{고른수}</em>}
                    <ChevronRight size={13} className="jobs-side-arr" />
                  </button>
                  {열림 && (
                    <Pop onClose={() => set열린팝(null)} title={시도} 좌={열린팝.좌} 상={열린팝.상}>
                      <PopItem on={selectedRegions.includes(시도)}
                        onClick={() => 지역토글(시도, true)}>{shortSido(시도)} 전체</PopItem>
                      {getSigunguList(시도).map((gu) => (
                        <PopItem key={gu} on={selectedRegions.includes(`${시도} ${gu}`)}
                          onClick={() => 지역토글(`${시도} ${gu}`, false)}>{gu}</PopItem>
                      ))}
                    </Pop>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="jobs-side-box">
        <p className="jobs-side-t">직군</p>
        <div className="jobs-side-list">
          {getJobGroups(activeTab).map((g) => {
            const 소 = getJobSubGroups(activeTab, g.group);
            const 고른수 = 소.filter((x) => selectedJobGroups.includes(x)).length;
            const 열림 = 열린팝?.종류 === "직군" && 열린팝.키 === g.group;
            return (
              <span key={g.group} className="jobs-pop-wrap block">
                <button type="button" className={고른수 ? "on" : undefined}
                  onClick={(e) => 열림 ? set열린팝(null) : 팝열기(e, "직군", g.group)}>
                  <span>{g.group}</span>
                  {고른수 > 0 && <em>{고른수}</em>}
                  <ChevronRight size={13} className="jobs-side-arr" />
                </button>
                {열림 && (
                  <Pop onClose={() => set열린팝(null)} title={g.group} 좌={열린팝.좌} 상={열린팝.상}>
                    <PopItem on={소.length > 0 && 소.every((x) => selectedJobGroups.includes(x))}
                      onClick={() => {
                        const 전부 = 소.every((x) => selectedJobGroups.includes(x));
                        setSelectedJobGroups(전부 ? selectedJobGroups.filter((x) => !소.includes(x))
                                                 : Array.from(new Set([...selectedJobGroups, ...소])));
                      }}>전체</PopItem>
                    {소.map((x) => (
                      <PopItem key={x} on={selectedJobGroups.includes(x)}
                        onClick={() => setSelectedJobGroups(selectedJobGroups.includes(x)
                          ? selectedJobGroups.filter((y) => y !== x) : [...selectedJobGroups, x])}>{x}</PopItem>
                    ))}
                  </Pop>
                )}
              </span>
            );
          })}
        </div>
      </div>

      <div className="jobs-side-box">
        <p className="jobs-side-t">조건</p>
        <div className="jobs-side-list">
          {([
            { 키: "경력", 값: careerFilter !== "전체" ? 1 : 0 },
            ...(activeTab === "STORE" ? [
              { 키: "연령", 값: ageFilter !== "전체" ? 1 : 0 },
              { 키: "성별", 값: genderFilter !== "전체" ? 1 : 0 },
            ] : []),
          ]).map(({ 키, 값 }) => {
            const 열림 = 열린팝?.종류 === 키;
            const 목록 = 키 === "경력" ? 경력선택지 : 키 === "연령" ? AGE_FILTERS : GENDER_FILTERS;
            const 고른값 = 키 === "경력" ? careerFilter : 키 === "연령" ? ageFilter : genderFilter;
            const 고르기 = 키 === "경력" ? setCareerFilter : 키 === "연령" ? setAgeFilter : setGenderFilter;
            return (
              <span key={키} className="jobs-pop-wrap block">
                <button type="button" className={값 ? "on" : undefined}
                  onClick={(e) => 열림 ? set열린팝(null) : 팝열기(e, 키)}>
                  <span>{키}</span>
                  {값 > 0 && <em>{고른값}</em>}
                  <ChevronRight size={13} className="jobs-side-arr" />
                </button>
                {열림 && (
                  <Pop onClose={() => set열린팝(null)} title={키} 좌={열린팝.좌} 상={열린팝.상}>
                    {목록.map((o) => (
                      <PopItem key={o} on={고른값 === o}
                        onClick={() => 고르기(고른값 === o ? "전체" : o)}>{o}</PopItem>
                    ))}
                  </Pop>
                )}
              </span>
            );
          })}
        </div>
      </div>

      <button type="button" className="co-side-reset" onClick={resetFilters}>필터 초기화</button>
    </div>
  );
  // 직군을 바꾸면 없던 단계가 골라져 있을 수 있다. 그때는 전체로 되돌린다.
  useEffect(() => {
    if (!경력선택지.includes(careerFilter)) setCareerFilter("전체");
  }, [경력선택지, careerFilter]);

  const jobGroupLabel = selectedJobGroups.length > 0
    ? selectedJobGroups.slice(0, 2).join(", ") + (selectedJobGroups.length > 2 ? ` 외 ${selectedJobGroups.length - 2}` : "")
    : "직군 선택";
  const regionLabel = selectedRegions.length > 0
    ? selectedRegions.slice(0, 2).join(", ") + (selectedRegions.length > 2 ? ` 외 ${selectedRegions.length - 2}` : "")
    : "지역 선택";

  const cell = (flexVal: number, last = false): React.CSSProperties => ({
    flex: flexVal,
    minWidth: 0,
    height: ROW_H,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "0 12px",
    borderRight: last ? "none" : divider,
    textAlign: "center",
    overflow: "hidden",
  });

  const headCell = (flexVal: number, last = false): React.CSSProperties => ({
    flex: flexVal,
    minWidth: 0,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 12px",
    borderRight: last ? "none" : divider,
    textAlign: "center",
  });

  return (
    <CompanyLayout activePage="talent" sideExtra={!isMobile && view === "search" ? 필터 : undefined}>
      {/* 인재 구분 — 겸업(BOTH) 회원만 고른다. 매장·본사는 제 유형으로 묶인다. */}
      {companyType === "BOTH" && isMobile && view === "search" && (
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <span style={{ fontSize: 14, color: "#777" }}>인재 구분</span>
          {(["STORE", "OFFICE"] as JobTab[]).map((tab) => (
            <label key={tab} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 15, color: activeTab === tab ? "#582681" : "#555" }}>
              <input type="radio" name="talentTrackM" checked={activeTab === tab}
                onChange={() => handleTabSwitch(tab)}
                style={{ accentColor: "#582681", width: 16, height: 16, margin: 0, cursor: "pointer" }} />
              {tab === "STORE" ? "매장" : "본사"}
            </label>
          ))}
        </div>
      )}

      {/* 검색창 (모바일) — 전체 행 */}
      {isMobile && view === "search" && (
        <div style={{ position: "relative", marginBottom: 14 }}>
          <input
            placeholder="이름, 포지션, 스킬 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", height: 42, padding: "0 42px 0 14px", boxSizing: "border-box",
              border: "1.5px solid #e5e5e5", borderRadius: 10, fontSize: 14, outline: "none",
            }}
          />
          <Search size={18} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none" }} />
        </div>
      )}

      {/* 인재 구분 — 겸업(BOTH) 회원만 고른다. */}
      {companyType === "BOTH" && !isMobile && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 14, color: "#777" }}>인재 구분</span>
          <div style={{ display: "inline-flex", background: "#efeff1", borderRadius: 10, padding: 3 }}>
            {(["STORE", "OFFICE"] as JobTab[]).map((tab) => (
              <button key={tab} onClick={() => handleTabSwitch(tab)}
                style={{
                  padding: "7px 18px", borderRadius: 8, fontSize: 14, cursor: "pointer", border: "none",
                  background: activeTab === tab ? "#fff" : "transparent",
                  color: activeTab === tab ? "#582681" : "#888",
                  boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all .15s",
                }}>
                {tab === "STORE" ? "매장" : "본사"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ width: "100%" }}>
      {/* 컨트롤 바 (모바일) */}
      {isMobile && (
        <>
          <style>{`
            .co-mbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
            .co-mbar-count { font-size: 13.5px; color: #888; line-height: 1; position: relative; top: 2px; }
            .co-mbar-count strong { color: #555; }
            .co-mbar-actions { display: flex; gap: 8px; }
            .co-mbar-btn { display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 12px; border-radius: 8px; border: 1px solid #e2e2e6; background: #fff; color: #555; font-size: 13.5px; font-weight: 500; cursor: pointer; }
            .co-mbar-btn.on { border-color: #582681; color: #582681; background: #f7f7f8; }
            .co-sheet-ov { position: fixed; inset: 0; z-index: 70; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
            .co-sheet { width: 100%; background: #fff; border-radius: 18px 18px 0 0; padding: 0 18px calc(20px + env(safe-area-inset-bottom)); max-height: 84vh; overflow-y: auto; animation: co-sheet-up .22s ease; }
            @keyframes co-sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
            .co-sheet-grip { width: 38px; height: 4px; border-radius: 2px; background: #d8d8dc; margin: 9px auto 4px; }
            .co-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 0 14px; }
            .co-sheet-title { font-size: 17px; font-weight: 400; color: #555; }
            .co-sheet-reset { background: none; border: none; color: #888; font-size: 13.5px; font-weight: 400; cursor: pointer; }
            .co-sheet-body { display: flex; flex-direction: column; gap: 18px; }
            .co-fseg-label { font-size: 13px; font-weight: 400; color: #555; margin-bottom: 9px; }
            .co-fseg-opts { display: flex; flex-wrap: wrap; gap: 8px; }
            .co-fseg-btn { padding: 9px 16px; border-radius: 999px; border: 1px solid #e2e2e6; background: #fff; color: #555; font-size: 14px; font-weight: 400; cursor: pointer; }
            .co-fseg-btn.on { border-color: #efeff1; background: #f7f7f8; color: #582681; font-weight: 400; }
            .co-fsel-btn { display: flex; align-items: center; gap: 6px; width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid #e2e2e6; background: #fff; color: #555; font-size: 14px; font-weight: 400; cursor: pointer; text-align: left; }
            .co-fsel-btn .ph { color: #aaa; }
            .co-sheet-apply { margin-top: 22px; width: 100%; height: 50px; border: none; border-radius: 12px; background: #f7f7f8; color: #582681; font-size: 16px; font-weight: 400; cursor: pointer; }
            .co-selbar { position: fixed; left: 0; right: 0; bottom: calc(56px + env(safe-area-inset-bottom)); z-index: 55; display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: #fff; border-top: 1px solid #eee; box-shadow: 0 -4px 16px rgba(0,0,0,0.06); }
            .co-selbar-count { font-size: 14px; font-weight: 600; color: #555; }
            .co-selbar-act { display: inline-flex; align-items: center; gap: 5px; background: none; border: none; cursor: pointer; color: #582681; font-size: 14px; font-weight: 600; padding: 6px; }
          `}</style>
          <div className="co-mbar">
            <span className="co-mbar-count">
              {view === "scrap" ? "스크랩" : "총"} <strong>{total}</strong>명
            </span>
            <div className="co-mbar-actions">
              {view === "search" && (
                <button className={`co-mbar-btn ${filterOpen ? "on" : ""}`} onClick={() => setFilterOpen((v) => !v)}>
                  <SlidersHorizontal size={15} /> 필터
                </button>
              )}
              <button
                className={`co-mbar-btn ${view === "scrap" ? "on" : ""}`}
                onClick={() => switchView(view === "scrap" ? "search" : "scrap")}
              >
                {view === "scrap" ? <BookmarkCheck size={15} /> : <Bookmark size={15} />} 스크랩
              </button>
            </div>
          </div>
        </>
      )}
      {/* 필터 (데스크톱) */}
      {!isMobile && (
      <div style={{ marginBottom: 12 }}>
        {/* 필터는 사이드로 옮겼다. 같은 일을 하는 채용공고 페이지와 짜임을
            맞춘다 — 여기만 상단 드롭다운이라 두 화면이 다르게 움직였다.
            남는 것은 이름·스킬 검색뿐이다. */}
        <div className="admin-search-wrap" style={{ maxWidth: 400 }}>
          <Search size={16} className="admin-search-icon" />
          <input
            className="admin-search-input"
            placeholder="이름, 포지션, 스킬 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      )}

      {/* 필터 시트 (모바일) */}
      {isMobile && filterOpen && (
        <div className="co-sheet-ov" onClick={() => setFilterOpen(false)}>
          <div className="co-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="co-sheet-grip" />
            <div className="co-sheet-head">
              <span className="co-sheet-title">필터</span>
              <button className="co-sheet-reset" onClick={resetFilters}>초기화</button>
            </div>
            <div className="co-sheet-body">
              <div>
                <div className="co-fseg-label">직군</div>
                <button className="co-fsel-btn"
                  onClick={() => { setFilterOpen(false); setJobGroupOpen(true); }}>
                  <span className={selectedJobGroups.length > 0 ? "" : "ph"} style={{ flex: 1 }}>{jobGroupLabel}</span>
                  <ChevronDown size={15} />
                </button>
              </div>
              {activeTab === "STORE" && (
                <div>
                  <div className="co-fseg-label">지역</div>
                  <button className="co-fsel-btn"
                    onClick={() => { setFilterOpen(false); setRegionOpen(true); }}>
                    <MapPin size={15} />
                    <span className={selectedRegions.length > 0 ? "" : "ph"} style={{ flex: 1 }}>{regionLabel}</span>
                    <ChevronDown size={15} />
                  </button>
                </div>
              )}
              <div>
                <div className="co-fseg-label">경력</div>
                <div className="co-fseg-opts">
                  {경력선택지.map((o) => (
                    <button key={o} className={`co-fseg-btn ${careerFilter === o ? "on" : ""}`}
                      onClick={() => setCareerFilter(o)}>{o}</button>
                  ))}
                </div>
              </div>
              {activeTab === "STORE" && (
                <>
                  <div>
                    <div className="co-fseg-label">연령</div>
                    <div className="co-fseg-opts">
                      {AGE_FILTERS.map((o) => (
                        <button key={o} className={`co-fseg-btn ${ageFilter === o ? "on" : ""}`}
                          onClick={() => setAgeFilter(o)}>{o}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="co-fseg-label">성별</div>
                    <div className="co-fseg-opts">
                      {GENDER_FILTERS.map((o) => (
                        <button key={o} className={`co-fseg-btn ${genderFilter === o ? "on" : ""}`}
                          onClick={() => setGenderFilter(o)}>{o}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <button className="co-sheet-apply" onClick={() => setFilterOpen(false)}>적용</button>
          </div>
        </div>
      )}

      {(보내는공고이름 || selectedJobGroups.length > 0 || selectedRegions.length > 0) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {/* 채용제안에서 넘어왔으면 그 공고를 맨 앞 칩으로. 예전에는 「…공고로
              보낼 사람을 찾는 중」이라고 한 줄 적어 두었는데, 그건 설명문이지
              화면이 아니다 — 고른 조건은 이미 칩으로 서니 공고도 같은 칩이면 된다.
              ×를 누르면 그 공고와의 연결이 풀린다. */}
          {보내는공고이름 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", background: "#f7f7f8", color: "#582681", borderRadius: 20, fontSize: 13, fontWeight: 500 }}>
              {보내는공고이름}
              <button onClick={() => { set보내는공고이름(""); set미리고른공고(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#582681", padding: 0, lineHeight: 1 }}>×</button>
            </span>
          )}
          {selectedJobGroups.map((g) => (
            <span key={g} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", background: "#f7f7f8", color: "#582681", borderRadius: 20, fontSize: 13 }}>
              {g}
              <button onClick={() => setSelectedJobGroups((p) => p.filter((x) => x !== g))} style={{ background: "none", border: "none", cursor: "pointer", color: "#582681", padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
          {selectedRegions.map((r) => (
            <span key={r} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", background: "#f7f7f8", color: "#1a6fb5", borderRadius: 20, fontSize: 13 }}>
              {r}
              <button onClick={() => setSelectedRegions((p) => p.filter((x) => x !== r))} style={{ background: "none", border: "none", cursor: "pointer", color: "#1a6fb5", padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* 결과 수 (데스크톱 — 모바일은 컨트롤 바에 표시) */}
      {!isMobile && (
        <div style={{ fontSize: 14, color: "#888", margin: "0 0 8px" }}>총 <strong style={{ color: "#555" }}>{total}</strong>명</div>
      )}

      {/* 리스트 */}
      <div style={{ width: "100%" }}>
      {loading ? (
        <div className="admin-empty">불러오는 중...</div>
      ) : talents.length === 0 ? (
        <div className="admin-empty">{view === "scrap" ? "스크랩한 인재가 없습니다." : "검색 결과가 없습니다."}</div>
      ) : isMobile ? (
        <div className="co-list">
          <style>{`
            .co-list { display: flex; flex-direction: column; gap: 10px; }
            .co-row { display: flex; align-items: center; gap: 10px; }
            .co-row-check { width: 20px; height: 20px; accent-color: #582681; flex-shrink: 0; margin: 0; }
            .co-li { flex: 1; min-width: 0; background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 13px 14px; cursor: pointer; }
            .co-li.on { border-color: #582681; background: #f7f7f8; }
            .co-li-r1 { display: flex; align-items: center; gap: 10px; }
            .co-li-namerow { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
            .co-li-scrap { background: none; border: none; padding: 0; cursor: pointer; display: inline-flex; flex-shrink: 0; }
            /* 이력서 사진과 같은 사각형. 원형 40px 은 얼굴이 너무 작아 알아볼 수 없었다. */
            .co-li-avatar { width: 44px; height: 56px; border-radius: 4px; overflow: hidden; flex-shrink: 0; border: 1px solid #e0e0e0; background: #f5f5f5; color: #582681; font-size: 17px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
            .co-li-avatar img { width: 100%; height: 100%; object-fit: cover; }
            .co-li-nameinfo { display: flex; align-items: baseline; gap: 7px; min-width: 0; }
            .co-li-name { font-size: 15.5px; color: #555; flex-shrink: 0; }
            .co-li-ageg { font-size: 12.5px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .co-li-meta2 { font-size: 12.5px; color: #888; margin-top: 2px; }
            .co-li-job { font-size: 15.5px; color: #582681; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          `}</style>
          {talents.map((t) => {
            const gl = genderLabel(t.gender);
            const region = t.regionPrefer ? shortenRegion(t.regionPrefer) : null;
            const ageGender = [t.age ? `${t.age}세` : null, gl].filter(Boolean).join(" · ");
            const meta2 = [careerLabel(t.careerYears, t.careerCount), region].filter(Boolean).join(" · ");
            return (
              <div key={t.id} className="co-row">
                <div className="co-li"
                  onClick={() => router.push(`${base}/talent/${t.id}`)}>
                  <div className="co-li-r1">
                    <div className="co-li-avatar">
                      {t.avatarUrl
                        ? <img src={t.avatarUrl} alt={t.name} loading="lazy" />
                        : <span>{t.name?.slice(0, 1) || "?"}</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="co-li-job">{t.subJob || t.mainJobGroup || "직군 미정"}</div>
                      <div className="co-li-namerow">
                        <div className="co-li-nameinfo">
                          <span className="co-li-name">{t.name}</span>
                          {ageGender && <span className="co-li-ageg">{ageGender}</span>}
                        </div>
                        <button className="co-li-scrap" title={t.scrapped ? "스크랩됨" : "스크랩"}
                          onClick={(e) => { e.stopPropagation(); toggleScrap(t); }}>
                          {t.scrapped
                            ? <BookmarkCheck size={19} style={{ color: "#582681" }} />
                            : <Bookmark size={19} style={{ color: "#c8c8c8" }} />}
                        </button>
                      </div>
                      <div className="co-li-meta2">{meta2}</div>
                    </div>
                  </div>
                  {t.proposedAt || t.interestedAt ? (
                    <Link href={`${base}/proposals`} onClick={(e) => e.stopPropagation()}
                      style={{ display: "inline-block", marginTop: 10, fontSize: 13, color: "#a0a0a6", textDecoration: "none" }}>
                      제안완료
                    </Link>
                  ) : (
                    <button type="button"
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, background: "none", border: "1px solid #e2e2e6", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#582681", fontSize: 13, fontWeight: 500 }}
                      onClick={(e) => { e.stopPropagation(); openPropose(t); }}>
                      <Send size={13} />
                      <span>제안하기</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="tal-list">
          {/* 표에서 카드로. 표는 관리자 화면을 그대로 가져온 것이라 사람을 줄로
              읽게 만들었다. 채용공고 관리 카드와 같은 구조로 맞춘다 — 위에 이름과
              사진, 오른쪽에 할 일, 아랫줄에 연락처. */}
          {talents.map((t) => (
            <TalentCard key={t.id} t={t} base={base}
              onOpenResume={(x) => router.push(`${base}/talent/${x.id}`)} onToggleScrap={toggleScrap} onPropose={openPropose}
              scrapJobs={scrapJobs} onScrapJob={scrapJob} />
          ))}
        </div>
      )}
      </div>
      </div>

      {/* 직군 모달 */}
      <JobGroupSelectModal
        open={jobGroupOpen}
        onClose={() => setJobGroupOpen(false)}
        jobType={activeTab}
        selected={selectedJobGroups}
        onChange={(groups: string[]) => setSelectedJobGroups(groups)}
      />

      {/* 지역 모달 */}
      <RegionSelectModal
        open={regionOpen}
        onClose={() => setRegionOpen(false)}
        initial={selectedRegions}
        onApply={(regions: string[]) => { setSelectedRegions(regions); setRegionOpen(false); }}
      />

      {/* 제안하기 모달 — 채팅이 아니라 공고 하나를 골라 메시지와 함께 알림·이메일로 보낸다 */}
      {proposeTarget && (
        <div className="rp-modal-overlay" onClick={() => !proposeSending && setProposeTarget(null)}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 440, padding: "22px 22px 18px" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <strong style={{ fontSize: 16 }}>{proposeTarget.name} 님에게 제안하기</strong>
              <button type="button" onClick={() => !proposeSending && setProposeTarget(null)}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#999", display: "flex" }}>
                <X size={20} />
              </button>
            </div>

            {/* 이미 보낸 사람이면 먼저 알려 준다 — 모르고 또 보내면 스팸이 된다 */}
            {proposeTarget.proposedAt && (
              <div style={{ display: "flex", gap: 7, alignItems: "flex-start", marginBottom: 14, padding: "10px 12px",
                background: "#f7f7f8", borderRadius: 8, fontSize: 12.5, color: "#666", lineHeight: 1.55 }}>
                <Send size={13} style={{ marginTop: 2, flexShrink: 0, color: "#999" }} />
                <span>{new Date(proposeTarget.proposedAt).toLocaleDateString("ko-KR")}에 이미 제안을 보냈어요.</span>
              </div>
            )}

            {/* 공고가 없으면 여기서 끝난다. 다만 문장 하나로 막고 끝내면 인재를
                찾아 마음먹은 사람이 그 자리에서 멈춘다 — 왜 막는지(받는 사람
                사정으로) 말하고, 등록 화면까지 데려다준다. */}
            {!proposeJobsLoading && proposeJobs.length === 0 ? (
              <div style={{ padding: "18px 16px", background: "#f9f9fa", borderRadius: 10, textAlign: "center" }}>
                <Lock size={20} style={{ color: "#b4b4b9" }} />
                <p style={{ fontSize: 14.5, color: "#2b2b2b", margin: "8px 0 6px" }}>제안하려면 공고가 필요해요</p>
                <p style={{ fontSize: 13, color: "#888", margin: "0 0 14px", lineHeight: 1.6 }}>
                  받는 분이 근무지·급여·근무형태를 봐야<br />지원할지 판단할 수 있어요.
                </p>
                <button type="button"
                  onClick={() => router.push("/company/dashboard/jobs/new")}
                  style={{ border: "none", background: "#582681", color: "#fff", borderRadius: 9,
                    padding: "10px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
                  공고 등록하러 가기
                </button>
              </div>
            ) : (
            <>
            <label style={{ display: "block", fontSize: 13, color: "#666", marginBottom: 6 }}>제안할 공고</label>
            {proposeJobsLoading ? (
              <div style={{ fontSize: 13.5, color: "#999", padding: "10px 0" }}>불러오는 중...</div>
            ) : (
              <select value={proposeJobId} onChange={(e) => 공고고르기(e.target.value)}
                style={{ width: "100%", height: 42, borderRadius: 8, border: "1px solid #ddd", padding: "0 10px", fontSize: 14, marginBottom: 10, boxSizing: "border-box" }}>
                <option value="">공고를 선택해주세요</option>
                {proposeJobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            )}

            {/* 어느 자리로 제안하는가. 공고에 모집분야가 여럿일 때만 묻는다 —
                하나뿐인 공고에서 뻔한 것을 매번 고르게 하지 않는다.
                이 값이 없으면 받는 사람은 공고의 모든 자리를 보게 되어, 자기가
                어느 자리를 제안받은 것인지 알 수 없다. */}
            {(고른공고?.positions?.length || 0) > 1 && (
              <>
                <label style={{ display: "block", fontSize: 13, color: "#666", marginBottom: 6 }}>모집분야</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                  {고른공고!.positions!.map((pos: any, i: number) => (
                    <button key={i} type="button"
                      className={`filter-chip${proposePos === i ? " on" : ""}`}
                      onClick={() => setProposePos(i)}>
                      {모집분야한줄(pos, (고른공고!.job_type || "") === "OFFICE")}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 고른 공고의 핵심 = 상대가 받아 보게 될 내용. 보내기 전에 확인하는 자리다.
                제안의 알맹이는 메시지가 아니라 공고라, 이게 비면 제안도 빈 것이 된다. */}
            {고른공고 && (
              <div style={{ marginBottom: 지역어긋남 ? 8 : 14, padding: "11px 13px", background: "#faf9fc",
                border: "1px solid #eee7f5", borderRadius: 9 }}>
                <p style={{ margin: "0 0 7px", fontSize: 11.5, color: "#a8a0b4" }}>받는 분에게 이렇게 보여요</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: 12.5, color: "#555" }}>
                  {고른공고.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={12} style={{ color: "#b4b4b9" }} />{고른공고.location}</span>}
                  {고른공고.employment_type && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Briefcase size={12} style={{ color: "#b4b4b9" }} />{고른공고.employment_type}</span>}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Wallet size={12} style={{ color: "#b4b4b9" }} />
                    {고른공고.salary_min ? formatSalaryWon(고른공고.salary_min, 고른공고.salary_type) : "급여 협의"}
                  </span>
                </div>
              </div>
            )}

            {/* 헛수고를 줄인다. 막지는 않는다 — 옮길 생각이 있는 사람도 있다. */}
            {지역어긋남 && (
              <div style={{ display: "flex", gap: 7, alignItems: "flex-start", marginBottom: 14, padding: "10px 12px",
                background: "#fdf6ec", border: "1px solid #f5e3c8", borderRadius: 8, fontSize: 12.5, color: "#8a6d3b", lineHeight: 1.55 }}>
                <MapPin size={13} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>이 분의 희망 지역은 <b>{proposeTarget.regionPrefer}</b>인데, 공고 근무지는 <b>{고른공고?.location}</b>이에요.</span>
              </div>
            )}

            <label style={{ display: "block", fontSize: 13, color: "#666", marginBottom: 6 }}>제안 메시지</label>
            {/* 빈 칸을 두고 '문구 채우기' 버튼을 옆에 달아 뒀더니, 버튼을 못 찾으면
                결국 빈 칸이었다. 공고를 고르는 순간 채워 두고 고쳐 쓰게 한다. */}
            <textarea value={proposeMessage} onChange={(e) => setProposeMessage(e.target.value.slice(0, 1000))}
              placeholder="보낼 메시지"
              rows={5}
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: 8, padding: "10px 12px", fontSize: 14, resize: "vertical", outline: "none", marginBottom: 4 }} />
            <p style={{ fontSize: 11.5, color: "#bbb", margin: "0 0 16px", textAlign: "right" }}>{proposeMessage.length}/1000</p>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setProposeTarget(null)} disabled={proposeSending}
                style={{ flex: 1, height: 44, borderRadius: 9, border: "1px solid #e2e2e6", background: "#fff", color: "#666", fontSize: 14, cursor: "pointer" }}>
                취소
              </button>
              <button type="button" onClick={sendPropose}
                disabled={proposeSending || !proposeJobId || !proposeMessage.trim()
                  || ((고른공고?.positions?.length || 0) > 1 && proposePos === null)}
                style={{ flex: 1, height: 44, borderRadius: 9, border: "none", background: "#582681", color: "#fff",
                  fontSize: 14, fontWeight: 600, cursor: (proposeSending || !proposeJobId || !proposeMessage.trim()) ? "not-allowed" : "pointer",
                  opacity: (proposeSending || !proposeJobId || !proposeMessage.trim()) ? 0.5 : 1 }}>
                {proposeSending ? "보내는 중…" : "제안 보내기"}
              </button>
            </div>
            </>
            )}
          </div>
        </div>
      )}
    </CompanyLayout>
  );
}