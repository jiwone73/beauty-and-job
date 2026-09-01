"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import {
  Search, BookmarkCheck, Bookmark, X, FileText, Paperclip, Instagram,
  Download, Printer, MapPin, ChevronDown, SlidersHorizontal, Send, Lock, Briefcase, Wallet,
} from "lucide-react";
import { companyTalentApi, companyJobsApi, type TalentItem } from "@/lib/api/company";
import ResumePreview from "@/components/profile/ResumePreview";
import JobGroupSelectModal from "@/components/JobGroupSelectModal";
import FilterDropdown from "@/components/company/FilterDropdown";
import ProposalThread from "@/components/proposal/ProposalThread";
import RegionSelectModal from "@/components/RegionSelectModal";
import { formatPhone } from "@/lib/phone";
import { 지역비교 } from "@/lib/regionMatch";
import { formatSalaryWon } from "@/lib/salary";
import LinkCell from "@/components/company/LinkCell";

type JobTab = "OFFICE" | "STORE";

const CAREER_OPTIONS = ["전체", "신입", "1-3년", "3-5년", "5-10년", "10년+"];
const AGE_FILTERS    = ["전체", "20대", "30대", "40+"];
const GENDER_FILTERS = ["무관", "여성", "남성"];

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
  const [ageFilter, setAgeFilter]                 = useState("전체");
  const [genderFilter, setGenderFilter]           = useState("무관");

  const [selected, setSelected]           = useState<TalentItem | null>(null);
  const [resumeData, setResumeData]       = useState<any>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<"search" | "scrap">("search");
  // 공고가 곧 입장권(셀렉미와 같은 규칙). 없으면 연락처가 잠기고 제안도 못 보낸다.
  const [talentAccess, setTalentAccess] = useState(true);

  // 제안하기 — 채팅 없이, 고른 공고 링크 + 메시지를 알림·이메일로만 보낸다.
  const [proposeTarget, setProposeTarget] = useState<TalentItem | null>(null);
  const [proposeJobs, setProposeJobs] = useState<{
    id: string; title: string; location?: string | null;
    employment_type?: string | null; salary_type?: string | null;
    salary_min?: number | null; deadline?: string | null;
  }[]>([]);
  const [proposeJobsLoading, setProposeJobsLoading] = useState(false);
  const [proposeJobId, setProposeJobId] = useState("");
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
    setGenderFilter("무관");
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      await new Promise((r) => setTimeout(r, 300));
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      const pageH = pdf.internal.pageSize.getHeight();
      let left = pdfH, pos = 0;
      pdf.addImage(imgData, "PNG", 0, pos, pdfW, pdfH);
      left -= pageH;
      while (left > 0) {
        pos = left - pdfH;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, pos, pdfW, pdfH);
        left -= pageH;
      }
      pdf.save(selected?.name ? `${selected.name}_이력서.pdf` : "이력서.pdf");
    } catch {
      alert("다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (!previewRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      await new Promise((r) => setTimeout(r, 300));
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(`<html><body style="margin:0"><img src="${canvas.toDataURL("image/png")}" style="width:100%" onload="window.print();window.close()"/></body></html>`);
      w.document.close();
    } catch {
      alert("인쇄 준비 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    if (!selected) { setResumeData(null); return; }
    const token = localStorage.getItem("access_token");
    setResumeLoading(true);
    fetch(`/api/company/talent/${selected.id}/resume`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => { if (res.success) setResumeData(res.data); })
      .catch((e) => console.error("[talent resume]", e))
      .finally(() => setResumeLoading(false));
  }, [selected]);

  const calcAge = (birth: string | null) => {
    if (!birth) return null;
    const y = Number(String(birth).slice(0, 4));
    return y ? new Date().getFullYear() - y : null;
  };

  const mapResume = (data: any) => {
    const p = data?.profile || {};
    return {
      careers: (data?.careers || []).map((c: any) => ({
        id: String(c.id), company: c.company || "", department: c.department || "",
        position: c.position || "", startDate: c.start_date || "", endDate: c.end_date || "",
        isVerified: c.is_verified || false, description: c.description || "",
      })),
      educations: (data?.educations || []).map((e: any) => ({
        id: String(e.id), school: e.school || "", major: e.major || "",
        status: e.status || "", startDate: e.start_date || "", endDate: e.end_date || "",
        description: e.description || "",
      })),
      experiences: (data?.experiences || []).map((x: any) => ({
        id: String(x.id), category: x.category || "", title: x.title || "", description: x.description || "",
      })),
      languages: (data?.languages || []).map((l: any) => ({
        id: String(l.id), language: l.language || "", level: l.level || "", test: l.test || "",
      })),
      links: (data?.links || []).map((lk: any) => ({
        id: String(lk.id), category: lk.category || "", url: lk.url || "",
      })),
      skills: p.skills || [],
      skillAreas: p.skill_areas || [],
      officeJobAreas: p.office_job_areas || [],
      certificates: p.certificates || [],
      intro: p.intro || "",
      coreCompetencies: p.core_competencies || "",
      workTypePrefer: p.work_type_prefer || "",
      regionPrefer: p.region_prefer || "",
    };
  };

  // 알림에서 「관심 있어요」를 눌러 넘어오면 그 사람들만 추려 본다 —
  // 목록이 길면 누가 답했는지 찾는 일이 일이 된다.
  const [관심만, set관심만] = useState(false);
  // 관심을 보인 사람과 이어서 말한다. 목록을 떠나지 않는다.
  const [대화, set대화] = useState<{ id: string; 이름: string } | null>(null);
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
        if (genderFilter !== "무관") params.gender = genderFilter;
      }
      const res = await companyTalentApi.list(params);
      if (res.success && res.data) {
        setTalents(res.data);
        setTotal(res.meta?.total ?? res.data.length);
        setTalentAccess(((res.meta as any)?.talentAccess) !== false);
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

  const fetchScrapped = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/company/talent/scrapped", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const rows = data?.data?.talents || data?.talents || [];
      const mapped: TalentItem[] = rows.map((r: any) => ({
        id: r.user_id,
        name: r.name,
        email: null,
        phone: r.phone ?? null,
        avatarUrl: r.avatar_url ?? null,
        portfolioImages: null,
        gender: r.gender ?? null,
        age: r.age ?? null,
        intro: r.headline ?? null,
        mainJobGroup: r.job_category ?? null,
        subJob: r.sub_job ?? null,
        skills: r.skills || [],
        skillAreas: [],
        officeJobAreas: [],
        regionPrefer: r.location ?? null,
        workTypePrefer: null,
        careerYears: r.career_years ?? null,
        careerCount: r.career_count ?? 0,
        educationDetail: r.educationDetail ?? null,
        careerDetail: r.careerDetail ?? null,
        jobSearchStatus: r.job_search_status ?? "SEEKING",
        jobSearchStatusAt: r.job_search_status_at ?? null,
        scrapped: true,
      }));
      setTalents(mapped);
      setTotal(mapped.length);
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
      if (selected?.id === item.id) setSelected((prev) => prev ? { ...prev, scrapped: on } : null);
    };
    update(next);
    try {
      if (next) await companyTalentApi.scrap(item.id);
      else await companyTalentApi.unscrap(item.id);
    } catch {
      update(!next);
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

  const sendPropose = async () => {
    if (!proposeTarget || !proposeJobId || !proposeMessage.trim()) return;
    setProposeSending(true);
    try {
      await companyTalentApi.propose(proposeTarget.id, { jobPostingId: proposeJobId, message: proposeMessage.trim() });
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
    setGenderFilter("무관");
  };

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
    <CompanyLayout activePage="talent">

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

      <div style={{ width: isMobile ? "100%" : "fit-content", maxWidth: "100%" }}>
      {/* 컨트롤 바 (모바일) */}
      {isMobile && (
        <>
          <style>{`
            .co-mbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
            .co-mbar-count { font-size: 13.5px; color: #888; line-height: 1; position: relative; top: 2px; }
            .co-mbar-count strong { color: #1a1a1a; }
            .co-mbar-actions { display: flex; gap: 8px; }
            .co-mbar-btn { display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 12px; border-radius: 8px; border: 1px solid #e2e2e6; background: #fff; color: #444; font-size: 13.5px; font-weight: 500; cursor: pointer; }
            .co-mbar-btn.on { border-color: #582681; color: #582681; background: #f7f7f8; }
            .co-sheet-ov { position: fixed; inset: 0; z-index: 70; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
            .co-sheet { width: 100%; background: #fff; border-radius: 18px 18px 0 0; padding: 0 18px calc(20px + env(safe-area-inset-bottom)); max-height: 84vh; overflow-y: auto; animation: co-sheet-up .22s ease; }
            @keyframes co-sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
            .co-sheet-grip { width: 38px; height: 4px; border-radius: 2px; background: #d8d8dc; margin: 9px auto 4px; }
            .co-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 0 14px; }
            .co-sheet-title { font-size: 17px; font-weight: 400; color: #1a1a1a; }
            .co-sheet-reset { background: none; border: none; color: #888; font-size: 13.5px; font-weight: 400; cursor: pointer; }
            .co-sheet-body { display: flex; flex-direction: column; gap: 18px; }
            .co-fseg-label { font-size: 13px; font-weight: 400; color: #555; margin-bottom: 9px; }
            .co-fseg-opts { display: flex; flex-wrap: wrap; gap: 8px; }
            .co-fseg-btn { padding: 9px 16px; border-radius: 999px; border: 1px solid #e2e2e6; background: #fff; color: #444; font-size: 14px; font-weight: 400; cursor: pointer; }
            .co-fseg-btn.on { border-color: #efeff1; background: #f7f7f8; color: #582681; font-weight: 400; }
            .co-fsel-btn { display: flex; align-items: center; gap: 6px; width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid #e2e2e6; background: #fff; color: #333; font-size: 14px; font-weight: 400; cursor: pointer; text-align: left; }
            .co-fsel-btn .ph { color: #aaa; }
            .co-sheet-apply { margin-top: 22px; width: 100%; height: 50px; border: none; border-radius: 12px; background: #f7f7f8; color: #582681; font-size: 16px; font-weight: 400; cursor: pointer; }
            .co-selbar { position: fixed; left: 0; right: 0; bottom: calc(56px + env(safe-area-inset-bottom)); z-index: 55; display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: #fff; border-top: 1px solid #eee; box-shadow: 0 -4px 16px rgba(0,0,0,0.06); }
            .co-selbar-count { font-size: 14px; font-weight: 600; color: #1a1a1a; }
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <button
            onClick={() => setJobGroupOpen(true)}
            className="filter-dd-btn"
            style={{ gap: 6, minWidth: 130, color: selectedJobGroups.length > 0 ? "#333" : "#999" }}
          >
            <span style={{ flex: 1, textAlign: "left" }}>{jobGroupLabel}</span>
            <ChevronDown size={14} />
          </button>

          {activeTab === "STORE" && (
            <button
              onClick={() => setRegionOpen(true)}
              className="filter-dd-btn"
              style={{ gap: 6, minWidth: 130, color: selectedRegions.length > 0 ? "#333" : "#999" }}
            >
              <MapPin size={14} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: "left" }}>{regionLabel}</span>
              <ChevronDown size={14} />
            </button>
          )}

          <FilterDropdown label="경력" value={careerFilter}
            options={CAREER_OPTIONS as unknown as string[]} onChange={setCareerFilter} />


          {activeTab === "STORE" && (
            <>
              <FilterDropdown label="연령" value={ageFilter}
                options={AGE_FILTERS as unknown as string[]} onChange={setAgeFilter} />
              <FilterDropdown label="성별" value={genderFilter}
                options={GENDER_FILTERS as unknown as string[]} onChange={setGenderFilter} />
            </>
          )}

          <button onClick={resetFilters} style={{ marginLeft: "auto", fontSize: 13, color: "#888", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}>필터 초기화</button>
        </div>

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
                  {CAREER_OPTIONS.map((o) => (
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

      {(selectedJobGroups.length > 0 || selectedRegions.length > 0) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
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
        <div style={{ fontSize: 14, color: "#888", margin: "0 0 8px" }}>총 <strong style={{ color: "#1a1a1a" }}>{total}</strong>명</div>
      )}

      {/* 리스트 */}
      <div style={{ width: isMobile ? "100%" : "fit-content", maxWidth: "100%" }}>
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
            .co-li-avatar { width: 40px; height: 40px; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: #582681; color: #fff; font-size: 17px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
            .co-li-avatar img { width: 100%; height: 100%; object-fit: cover; }
            .co-li-nameinfo { display: flex; align-items: baseline; gap: 7px; min-width: 0; }
            .co-li-name { font-size: 15.5px; color: #1a1a1a; flex-shrink: 0; }
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
                  onClick={() => setSelected(t)}>
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
                  <button type="button"
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, background: "none", border: "1px solid #e2e2e6", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#582681", fontSize: 13, fontWeight: 500 }}
                    onClick={(e) => { e.stopPropagation(); openPropose(t); }}>
                    <Send size={13} />
                    <span>제안하기</span>
                  </button>
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
          {talents.map((t) => {
            const gl = genderLabel(t.gender);
            const 나이성별 = [t.age ? `${t.age}세` : null, gl].filter(Boolean).join(" · ");
            const 직군 = [t.mainJobGroup, t.subJob].filter(Boolean).join(" · ");
            const 지역 = shortenRegion(t.regionPrefer);
            const 최근 = t.careerDetail
              ? [t.careerDetail.company, t.careerDetail.position].filter(Boolean).join(" · ")
              : null;
            return (
              <div key={t.id} className="tal-card">
                <div className="tal-top">
                  <div className="tal-avatar" onClick={() => setSelected(t)} title="이력서 보기">
                    {t.avatarUrl
                      ? <img src={t.avatarUrl} alt={t.name} loading="lazy" />
                      : <span>{t.name?.slice(0, 1) || "?"}</span>}
                  </div>

                  <div className="tal-main">
                    <div className="tal-head">
                      {t.interestedAt && <span className="tal-badge">관심 있어요</span>}
                      {나이성별 && <span className="tal-sub">{나이성별}</span>}
                      <span className="tal-sub">{careerLabel(t.careerYears, t.careerCount)}</span>
                    </div>
                    <button type="button" className="tal-name" onClick={() => setSelected(t)}>{t.name}</button>
                    <div className="tal-meta">
                      {직군 && <span>{직군}</span>}
                      {지역 && <span>{지역}</span>}
                    </div>
                    {최근 && <div className="tal-recent">최근 · {최근}</div>}
                  </div>

                  <div className="tal-acts">
                    <button type="button" title={t.scrapped ? "스크랩 해제" : "스크랩"}
                      className="tal-scrap" onClick={(e) => { e.stopPropagation(); toggleScrap(t); }}>
                      {t.scrapped
                        ? <BookmarkCheck size={18} style={{ color: "#582681" }} />
                        : <Bookmark size={18} style={{ color: "#c8c8c8" }} />}
                    </button>
                    <button type="button" className="tal-btn" onClick={() => setSelected(t)}>
                      <FileText size={14} /> 이력서
                    </button>
                    {t.interestedAt ? (
                      /* 물어본 말은 카드에 늘어놓지 않는다 — 대화창을 열면 보인다. */
                      <button type="button" className="tal-btn key"
                        onClick={() => { if (t.interestProposalId) set대화({ id: t.interestProposalId, 이름: t.name }); }}>
                        <Send size={14} /> 대화하기
                      </button>
                    ) : (
                      <button type="button" className="tal-btn"
                        title={t.proposedAt ? `${new Date(t.proposedAt).toLocaleDateString("ko-KR")}에 제안함` : "제안하기"}
                        onClick={() => openPropose(t)}>
                        <Send size={14} /> {t.proposedAt ? "제안함" : "제안하기"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="tal-foot">
                  {/* 관심을 보낸 사람은 스스로 연 것이라 열람권과 무관하게 보인다.
                      잠겼을 때는 빈칸으로 두지 않는다 — 왜 비었는지 알아야 한다. */}
                  {(talentAccess || t.interestedAt) ? (
                    <span className="tal-contact">
                      {t.phone ? formatPhone(t.phone) : "전화번호 없음"}
                      {t.email && <><i>·</i>{t.email}</>}
                    </span>
                  ) : (
                    <span className="tal-locked">
                      <Lock size={12} />
                      공고를 올리면 연락처가 열려요
                    </span>
                  )}
                  <span className="tal-links">
                    <LinkCell url={t.portfolioImages?.[0]?.url ?? null} icon={<Paperclip size={13} />} label="사진" />
                    <LinkCell url={t.snsUrl} icon={<Instagram size={13} />} label="SNS" />
                  </span>
                </div>
              </div>
            );
          })}
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

      {/* 이력서 모달 */}
      {selected && (
        <div className="rp-modal-overlay">
          <div className="rp-modal resume-modal-flat" onClick={(e) => e.stopPropagation()}>
            <div className="rp-modal-header">
              <h2 style={{ fontSize: 18, color: "#1a1a1a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.name}</h2>
              <div className="rp-modal-actions">
                {/* 이력서를 읽다가 "이 사람이다" 싶을 때가 제안할 때다. 창을 닫고
                    목록에서 버튼을 다시 찾게 하지 않는다. */}
                <button onClick={() => { const t = selected; setSelected(null); openPropose(t); }} title="제안하기"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8,
                    border: "1px solid #e2d9ee", background: "#fff", color: "#582681", fontSize: 13, cursor: "pointer", marginRight: 4 }}>
                  <Send size={14} />제안하기
                </button>
                <button onClick={handleDownloadPdf} disabled={isDownloading || resumeLoading} title="PDF 다운로드"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, borderRadius: 8, border: "none", background: "none", color: "#582681", cursor: (isDownloading || resumeLoading) ? "not-allowed" : "pointer", opacity: (isDownloading || resumeLoading) ? 0.5 : 1 }}>
                  <Download size={20} />
                </button>
                <button onClick={handlePrint} title="인쇄"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, borderRadius: 8, border: "none", background: "none", color: "#582681", cursor: "pointer" }}>
                  <Printer size={20} />
                </button>
                <button onClick={() => setSelected(null)} title="닫기"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 4, borderRadius: 6, border: "none", background: "none", color: "#888", cursor: "pointer" }}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="rp-modal-body">
              {resumeLoading ? (
                <div style={{ padding: 60, textAlign: "center", color: "#888" }}>불러오는 중...</div>
              ) : resumeData ? (
                <ResumePreview
                  ref={previewRef}
                  name={resumeData.user?.name || selected.name}
                  birthDisplay={resumeData.user?.birth_date
                    ? `${String(resumeData.user.birth_date).slice(0, 4)}년 (${calcAge(resumeData.user.birth_date)}세, ${resumeData.user.gender === "FEMALE" ? "여" : resumeData.user.gender === "MALE" ? "남" : ""})`
                    : ""}
                  jobDisplay={resumeData.user?.job_type === "STORE" ? "매장" : "본사"}
                  phone={resumeData.user?.phone || ""}
                  email={resumeData.user?.email || ""}
                  portfolioImages={resumeData.user?.portfolio_images || []}
                  avatarUrl={resumeData.user?.avatar_url || null}
                  resumeType={resumeData.user?.job_type === "STORE" ? "salon" : "office"}
                  {...mapResume(resumeData)}
                />
              ) : (
                <div style={{ padding: 60, textAlign: "center", color: "#888" }}>이력서 정보가 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}

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
              placeholder="공고를 고르면 인사말이 채워져요. 덧붙이고 싶은 말이 있으면 고쳐 쓰세요."
              rows={5}
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: 8, padding: "10px 12px", fontSize: 14, resize: "vertical", outline: "none", marginBottom: 4 }} />
            <p style={{ fontSize: 11.5, color: "#bbb", margin: "0 0 16px", textAlign: "right" }}>{proposeMessage.length}/1000</p>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setProposeTarget(null)} disabled={proposeSending}
                style={{ flex: 1, height: 44, borderRadius: 9, border: "1px solid #e2e2e6", background: "#fff", color: "#666", fontSize: 14, cursor: "pointer" }}>
                취소
              </button>
              <button type="button" onClick={sendPropose}
                disabled={proposeSending || !proposeJobId || !proposeMessage.trim()}
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
      {대화 && (
        <ProposalThread
          proposalId={대화.id}
          제목="제안한 공고"
          상대={대화.이름}
          token={localStorage.getItem("access_token") || ""}
          onClose={() => set대화(null)}
        />
      )}
    </CompanyLayout>
  );
}