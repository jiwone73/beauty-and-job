"use client";
import { StoreIcon, OfficeIcon } from "@/components/icons/JobTypeIcon";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import FilterDropdown from "@/components/company/FilterDropdown";
import {
  Users, Search, Edit, X, Trash2, Copy, Ban, ChevronDown
} from "lucide-react";
import { companyJobsApi, companyApplicationsApi, companyTalentApi } from "@/lib/api/company";
import ApplicantCard from "@/components/company/ApplicantCard";
import ApplicationModal from "@/components/company/ApplicationModal";
import type { CompanyJob, JobStatus, CompanyApplication } from "@/lib/types/company";
import { genderLabel, calcAge } from "@/lib/memberFormat";

// === 매핑 헬퍼 ===
const STATUS_LABEL: Record<JobStatus, string> = {
  ACTIVE: "진행중",
  CLOSED: "마감",
  DRAFT: "임시저장",
  PAUSED: "일시중지",
};

const STATUS_LABEL_APP: Record<string, string> = {
  APPLIED: "미열람", VIEWED: "열람", INTERVIEW: "면접", PASSED: "합격", REJECTED: "불합격",
};

const md = (d: string) => { const x = new Date(d); return `${String(x.getMonth() + 1).padStart(2, "0")}.${String(x.getDate()).padStart(2, "0")}`; };

// D-day만 있으면 오늘이 며칠인지 알아야 계산이 되는데, 날짜는 바로 읽힌다(사람인도
// 이 방식 — 마감 임박한 것만 D-N, 나머진 실제 날짜). 그래서 평소엔 날짜로 보여주고,
// 진짜 급한 D-3 이내일 때만 눈에 띄게 D-N으로 바꾼다.
function formatDeadline(deadline: string | null): string {
  if (!deadline) return "상시";
  const today = new Date();
  const dl = new Date(deadline);
  const dDay = Math.ceil((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (dDay < 0) return "마감";
  if (dDay === 0) return "오늘";
  if (dDay <= 3) return `D-${dDay}`;
  return md(deadline);
}

// 마감까지 남은 일수 (상시=마감일 없음 → null)
function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
}

// 실질 마감 여부: 상태가 CLOSED이거나 마감일이 지난 경우
function isJobClosed(job: { status: string; deadline: string | null }): boolean {
  if (job.status === "CLOSED") return true;
  const dl = daysLeft(job.deadline);
  return dl !== null && dl < 0;
}

function CompanyJobsContent() {
  const router = useRouter();
  // 대시보드 '마감임박' 카운터에서 넘어오면 같은 조건이 걸린 채로 열린다.
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status");
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // 기본은 진행중 + 마감일순 — 이 화면에서 할 일은 대개 "곧 내려가는 진행 공고"를 손보는 것이다.
  const [statusFilter, setStatusFilter] = useState(
    initialStatus && ["전체", "진행중", "마감임박", "마감", "지원자", "미열람"].includes(initialStatus) ? initialStatus : "진행중"
  );
  const [jobGroupFilter, setJobGroupFilter] = useState("전체");
  const [sortBy, setSortBy] = useState("마감일순");
  const [selected, setSelected] = useState<CompanyJob | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [companyType, setCompanyType] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/company/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success && res.data) setCompanyType(res.data.company_type || null); })
      .catch(() => {});
  }, []);


  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const toggleSelectMode = () => {
    setSelectMode((v) => {
      if (v) setChecked([]);
      return !v;
    });
  };

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await companyJobsApi.list({ limit: 100 });
      setJobs(res.data);
    } catch (e) {
      console.error("[loadJobs]", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  // 공고와 지원자는 한 덩어리다 — 공고를 올리는 이유가 지원자를 받는 것이라,
  // 그 공고에 누가 왔는지는 공고 카드 안에서 바로 열린다.
  const [접은공고, set접은공고] = useState<string[]>([]);
  const [지원서, set지원서] = useState<string | null>(null);
  const [공고지원자, set공고지원자] = useState<Record<string, CompanyApplication[]>>({});

  // 한 번에 받아 공고별로 나눈다 — 카드마다 부르면 공고 수만큼 왕복한다.
  useEffect(() => {
    companyApplicationsApi.list({ limit: 200 })
      .then((res) => {
        const 묶음: Record<string, CompanyApplication[]> = {};
        (res.data || []).forEach((a) => {
          const k = (a as any).job_id;
          (묶음[k] = 묶음[k] || []).push(a);
        });
        set공고지원자(묶음);
      })
      .catch((e) => console.error("[job applicants]", e));
  }, []);

  // 기본은 펼침 — 공고를 여는 이유가 지원자다. 접은 것만 기억한다.
  const 펼치기 = (jobId: string) =>
    set접은공고((prev) => prev.includes(jobId) ? prev.filter((x) => x !== jobId) : [...prev, jobId]);

  const 지원자바꾸기 = (id: string, 바꿈: Partial<CompanyApplication>) =>
    set공고지원자((prev) => {
      const out: Record<string, CompanyApplication[]> = {};
      for (const k of Object.keys(prev)) out[k] = prev[k].map((a) => a.id === id ? { ...a, ...바꿈 } : a);
      return out;
    });

  const 메모저장 = async (a: CompanyApplication, note: string) => {
    const 이전 = a.note || "";
    지원자바꾸기(a.id, { note });
    try {
      await companyApplicationsApi.updateNote(a.id, note);
    } catch {
      지원자바꾸기(a.id, { note: 이전 });
      alert("메모를 저장하지 못했어요.");
    }
  };

  const 스크랩토글 = async (a: CompanyApplication) => {
    const 다음 = !(a as any).scrapped;
    지원자바꾸기(a.id, { scrapped: 다음 } as any);
    try {
      if (다음) await companyTalentApi.scrap((a as any).user_id);
      else await companyTalentApi.unscrap((a as any).user_id);
    } catch {
      지원자바꾸기(a.id, { scrapped: !다음 } as any);
    }
  };

  const filtered = jobs.filter(j => {
    const matchGroup = jobGroupFilter === "전체" ||
      (jobGroupFilter === "본사" && j.job_type === "OFFICE") ||
      (jobGroupFilter === "매장" && j.job_type === "STORE");
    const matchSearch = !search || j.title.includes(search);
    const dl = daysLeft(j.deadline);
    const matchStatus =
      statusFilter === "전체" ? true :
      statusFilter === "진행중" ? !isJobClosed(j) :
      statusFilter === "마감임박" ? (!isJobClosed(j) && dl !== null && dl <= 2) :
      statusFilter === "마감" ? isJobClosed(j) :
      statusFilter === "지원자" ? (j.application_count ?? 0) > 0 :
      statusFilter === "미열람" ? (j.unviewed_count ?? 0) > 0 :
      statusFilter === "<D-7" ? (!isJobClosed(j) && dl !== null && dl <= 7) :
      statusFilter === ">D-7" ? (!isJobClosed(j) && (dl === null || dl > 7)) :
      STATUS_LABEL[j.status] === statusFilter;
    return matchGroup && matchSearch && matchStatus;
  }).sort((a, b) => {
    // 마감일순: 임박한 것이 먼저. 상시(마감일 없음)는 급할 게 없어 맨 뒤로 보낸다.
    if (sortBy === "마감일순") {
      const av = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bv = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      if (av !== bv) return av - bv;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const toggleCheck = (id: string) => setChecked(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  const toggleAll = () => setChecked(checked.length === filtered.length ? [] : filtered.map(j => j.id));

  const handleBulkDelete = async () => {
    if (!checked.length) return;
    if (!confirm(`선택한 ${checked.length}건을 삭제하시겠습니까?`)) return;
    try {
      await Promise.all(checked.map(id => companyJobsApi.delete(id)));
      setChecked([]);
      setSelectMode(false);
      await loadJobs();
    } catch (e) {
      alert("삭제 중 오류가 발생했습니다.");
      console.error("[handleBulkDelete]", e);
    }
  };

  const handleClose = async (id: string) => {
    if (!confirm("이 공고를 마감하시겠습니까?")) return;
    try {
      await companyJobsApi.close(id);
      await loadJobs();
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      alert("마감 처리 중 오류가 발생했습니다.");
      console.error("[handleClose]", e);
    }
  };

  // 선택한 공고 일괄 마감 (진행 중인 것만)
  const handleBulkClose = async () => {
    const targets = jobs.filter(j => checked.includes(j.id) && !isJobClosed(j));
    if (targets.length === 0) { alert("마감할 진행 중인 공고가 없습니다."); return; }
    if (!confirm(`선택한 ${targets.length}건을 마감하시겠습니까?`)) return;
    try {
      await Promise.all(targets.map(j => companyJobsApi.close(j.id)));
      setChecked([]);
      setSelectMode(false);
      await loadJobs();
    } catch (e) {
      alert("마감 처리 중 오류가 발생했습니다.");
      console.error("[handleBulkClose]", e);
    }
  };

  // 복사 등록: 1건 선택 시 내용 복사해 새 공고 등록 화면으로
  const handleReRegister = () => {
    if (checked.length !== 1) return;
    router.push(`/company/dashboard/jobs/new?copy=${checked[0]}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    try {
      await companyJobsApi.delete(id);
      await loadJobs();
      setSelected(null);
    } catch (e) {
      alert("삭제 중 오류가 발생했습니다.");
      console.error("[handleDelete]", e);
    }
  };

  const counts = {
    전체: jobs.length,
    진행중: jobs.filter(j => !isJobClosed(j)).length,
    마감: jobs.filter(j => isJobClosed(j)).length,
    본사: jobs.filter(j => j.job_type === "OFFICE").length,
    매장: jobs.filter(j => j.job_type === "STORE").length,
  };
  // 업체 유형(BOTH)이 아니라 실제 공고 구성으로 판단 — 매장 회원이 본사 공고를 낸 경우도 필터가 살아있다.
  const isBoth = counts.본사 > 0 && counts.매장 > 0;

  // 카운터가 곧 진행상태 필터다(드롭다운과 같은 값을 두 번 두지 않는다).
  // 총 지원자는 공고 상태가 아니라 사람 수라 이 줄에 섞지 않는다 — 지원자 관리의 '전체'가 같은 값을 센다.
  // 마감임박은 사흘 안. 하루만 세면 오늘 못 본 사람은 놓친다.
  // 탭은 모두 공고 건수다 — 지원이 들어온 공고, 그중 아직 안 본 사람이 있는 공고.
  const cntApplied = jobs.filter(j => (j.application_count ?? 0) > 0).length;
  const cntUnviewed = jobs.filter(j => (j.unviewed_count ?? 0) > 0).length;
  const cntSoon = jobs.filter(j => { const d = daysLeft(j.deadline); return !isJobClosed(j) && d !== null && d <= 2; }).length;
  const statCardsData = [
    { label: "전체 공고", value: String(counts.전체), unit: "건", status: "전체" },
    { label: "진행중", value: String(counts.진행중), unit: "건", status: "진행중" },
    { label: "마감임박", value: String(cntSoon), unit: "건", status: "마감임박" },
    { label: "마감", value: String(counts.마감), unit: "건", status: "마감" },
    { label: "지원자", value: String(cntApplied), unit: "건", status: "지원자" },
    // 지금 손이 가야 할 공고 — 아직 안 본 지원자가 있는 곳. 고르면 그 공고들의
    // 미열람 지원자만 펼쳐진다.
    { label: "미열람 지원자", value: String(cntUnviewed), unit: "건", status: "미열람" },
  ];

  // 모바일 상단 상태 통계 카드 (마감 임박 기준 필터)
  // 모바일도 데스크톱과 같은 넷으로 — 「≤D-7 / >D-7」은 화면에 없는 말이었다.
  const statusCards = [
    { label: "전체", value: String(counts.전체), status: "전체" },
    { label: "진행중", value: String(counts.진행중), status: "진행중" },
    { label: "마감임박", value: String(cntSoon), status: "마감임박" },
    { label: "마감", value: String(counts.마감), status: "마감" },
    { label: "지원자", value: String(cntApplied), status: "지원자" },
    { label: "미열람 지원자", value: String(cntUnviewed), status: "미열람" },
  ];

  return (
    <CompanyLayout activePage="jobs">
      <div className="co-joblist" style={{ width: isMobile ? "100%" : "100%", maxWidth: "100%" }}>
      {/* 상태 고르개 (데스크톱만).
          누르면 걸리는 필터인데 네모 상자 넷으로 그려 두니 그냥 숫자판처럼 보였다.
          사람인 공고 관리처럼 이름과 수를 한 줄에 늘어놓은 탭으로 바꾼다 — 무엇이
          켜져 있는지가 밑줄로 바로 보이고, 상자가 사라져 아래 줄과 안 붙는다. */}
      {!isMobile && (
        <div className="co-jobtabs">
          {statCardsData.map((s) => (
            <button key={s.label} type="button"
              className={`co-jobtab ${statusFilter === s.status ? "on" : ""}`}
              onClick={() => setStatusFilter(s.status)}>
              {s.label}<span className="co-jobtab-n">{s.value}</span>
            </button>
          ))}
        </div>
      )}

      {/* 툴바 (데스크톱) */}
      {!isMobile && (
      <div className="company-toolbar">
        <div className="company-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="공고명 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {isBoth && (
            <FilterDropdown label="채용유형" value={jobGroupFilter}
              options={["전체", "매장", "본사"]} onChange={setJobGroupFilter} />
          )}
          <FilterDropdown label="정렬" value={sortBy}
            options={["등록일순", "마감일순"]} onChange={setSortBy} />
        </div>
        {/* 마감·복사·삭제는 이제 카드마다 붙어 있다. 여기 또 두면 체크칸을 켜야만
            살아나는 단추가 되어(무엇을 고르라는 건지 알기 어려웠다) 같은 일을 하는 길이
            둘이 된다. 등록도 머리줄 단추와 사이드에 이미 있어 뺀다. */}
      </div>
      )}

      {/* 컨트롤 바 (모바일) */}
      {isMobile && (
        <>
          <style>{`
            .co-sumtog { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 10px 13px; margin-bottom: 10px; background: #fff; border: 1px solid #eee; border-radius: 10px; font-size: 13.5px; font-weight: 600; color: #333; cursor: pointer; }
            .co-sumtog .chev { transition: transform .2s; color: #999; }
            .co-sumtog .chev.open { transform: rotate(180deg); }
            .company-stat-grid.co-4 { grid-auto-flow: row; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-bottom: 12px; }
            .company-stat-grid.co-4 .company-stat-card { padding: 9px 5px; align-items: center; text-align: center; gap: 2px; }
            .company-stat-grid.co-4 .company-stat-value { font-size: 16px; }
            .company-stat-grid.co-4 .company-stat-label { font-size: 10.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
            .co-topbar { display: flex; align-items: stretch; gap: 7px; margin-bottom: 10px; }
            .co-addbtn { display: inline-flex; align-items: center; justify-content: center; gap: 3px; height: 46px; padding: 0 15px; flex-shrink: 0; border-radius: 9px; border: none; background: #582681; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; white-space: nowrap; }
            .co-statrow { display: flex; gap: 6px; flex: 1; min-width: 0; }
            .co-stat { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; height: 46px; padding: 0 3px; border: 1px solid #eee; border-radius: 9px; background: #fff; cursor: pointer; font: inherit; transition: border-color .15s, background .15s; }
            .co-stat .l { font-size: 11px; color: #888; white-space: nowrap; }
            .co-stat .n { font-size: 17px; line-height: 1; color: #c8c8ce; }
            .co-stat.has .n { color: #582681; }
            .co-stat.on { border-color: #582681; background: #f7f7f8; }
            .co-mbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
            .co-mbar-left { display: flex; align-items: center; gap: 11px; }
            .co-mbar-count { font-size: 13.5px; color: #888; line-height: 1; position: relative; top: 2px; }
            .co-mbar-count strong { color: #582681; }
            .co-mbar-actions { display: flex; gap: 8px; }
            .co-mbar-btn { display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 12px; border-radius: 8px; border: 1px solid #e2e2e6; background: #fff; color: #444; font-size: 13.5px; font-weight: 500; cursor: pointer; text-decoration: none; }
            .co-mbar-btn.on { border-color: #582681; color: #582681; background: #f7f7f8; }
            .co-mbar-btn.primary { border: none; background: #582681; color: #fff; }
            .co-mbar-btn:disabled { opacity: 0.4; cursor: not-allowed; }
            .co-sheet-ov { position: fixed; inset: 0; z-index: 70; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
            .co-sheet { width: 100%; background: #fff; border-radius: 18px 18px 0 0; padding: 0 18px calc(20px + env(safe-area-inset-bottom)); max-height: 82vh; overflow-y: auto; animation: co-sheet-up .22s ease; }
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
            .co-sheet-apply { margin-top: 22px; width: 100%; height: 50px; border: none; border-radius: 12px; background: #f7f7f8; color: #582681; font-size: 16px; font-weight: 400; cursor: pointer; }
            .co-selbar { position: fixed; left: 0; right: 0; bottom: calc(56px + env(safe-area-inset-bottom)); z-index: 55; display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: #fff; border-top: 1px solid #eee; box-shadow: 0 -4px 16px rgba(0,0,0,0.06); }
            .co-selbar-count { font-size: 14px; font-weight: 600; color: #1a1a1a; }
            .co-selbar-del { background: none; border: none; cursor: pointer; color: #e74c3c; display: inline-flex; padding: 6px; }
          `}</style>
          <div className="co-topbar">
            {/* 모바일도 같은 규칙 — 선택 중에는 아래 선택 바의 액션만 남긴다. */}
            {checked.length === 0 && (
              <Link href="/company/dashboard/jobs/new" className="co-addbtn">
                신규 등록
              </Link>
            )}
            <div className="co-statrow">
              {statusCards.map((s) => (
                <button key={s.label} type="button"
                  className={`co-stat${Number(s.value) > 0 ? " has" : ""}${statusFilter === s.status ? " on" : ""}`}
                  onClick={() => setStatusFilter(s.status)}>
                  <span className="l">{s.label}</span>
                  <span className="n">{s.value}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="co-mbar">
            <span className="co-mbar-count">총 <strong>{filtered.length}</strong>건</span>
            <div className="co-mbar-actions">
              {selectMode && (
                <>
                  <button className="co-mbar-btn" disabled={checked.length === 0} onClick={handleBulkClose}>
                    <Ban size={14} /> 공고마감
                  </button>
                  <button className="co-mbar-btn" disabled={checked.length !== 1} onClick={handleReRegister}>
                    <Copy size={14} /> 복사 등록
                  </button>
                </>
              )}
              <button className={`co-mbar-btn ${selectMode ? "on" : ""}`} onClick={toggleSelectMode}>
                {selectMode ? "취소" : "선택"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="company-card" style={{ padding: "60px 20px", textAlign: "center", color: "#888" }}>
          불러오는 중...
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && filtered.length === 0 && (
        <div className="company-card" style={{ padding: "60px 20px", textAlign: "center", color: "#888" }}>
          {jobs.length === 0
            ? "등록된 공고가 없어요. 첫 공고를 등록해보세요!"
            : "조건에 맞는 공고가 없어요."}
        </div>
      )}

      {/* 모바일 리스트 */}
      {!loading && filtered.length > 0 && isMobile && (
        <div className="co-list">
          <style>{`
            .co-list { display: flex; flex-direction: column; gap: 10px; }
            .co-list-meta { font-size: 12.5px; color: #888; padding: 2px 2px 4px; }
            .co-list-meta strong { color: #582681; }
            .co-row { display: flex; align-items: center; gap: 10px; }
            .co-row-check { width: 20px; height: 20px; accent-color: #582681; flex-shrink: 0; margin: 0; }
            .co-li { flex: 1; min-width: 0; background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 13px 14px; cursor: pointer; }
            .co-li.on { border-color: #582681; background: #f7f7f8; }
            .co-li-r1 { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 9px; }
            .co-li-title { font-size: 15.5px; color: #582681; line-height: 1.35; word-break: break-all; min-width: 0; }
            .co-li-r1r { display: flex; align-items: center; gap: 9px; flex-shrink: 0; }
            .co-li-status { font-size: 12.5px; font-weight: 600; flex-shrink: 0; }
            .co-rebtn { display: inline-flex; align-items: center; gap: 3px; border: 1px solid #582681; background: #fff; color: #582681; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; cursor: pointer; }
            .co-closebtn { display: inline-flex; align-items: center; gap: 3px; border: 1px solid #ddd; background: #fff; color: #666; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; cursor: pointer; }
            .co-li-r2 { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12.5px; color: #777; }
            .co-li-r2 b { color: #444; font-weight: 500; }
          `}</style>
          {filtered.map((job) => {
            const on = checked.includes(job.id);
            const closed = isJobClosed(job);
            const dl = daysLeft(job.deadline);
            const badgeLabel = closed ? "마감" : formatDeadline(job.deadline);
            const badgeColor = closed ? "#888" : !job.deadline ? "#10b981" : (dl !== null && dl <= 7) ? "#e74c3c" : "#10b981";
            return (
              <div key={job.id} className="co-row">
                {selectMode && (
                  <input type="checkbox" className="co-row-check" checked={on}
                    onChange={() => toggleCheck(job.id)} />
                )}
                <div className={`co-li ${on ? "on" : ""}`}
                  onClick={() => {
                    if (selectMode) { toggleCheck(job.id); return; }
                    // 카드형과 같다 — 이름을 누르면 그 공고를 본다. 임시저장만
                    // 보여 줄 화면이 없어 이어서 쓰러 간다.
                    if (job.status === "DRAFT") router.push(`/company/dashboard/jobs/new?id=${job.id}`);
                    else window.open(`/jobs/${job.id}`, "_blank", "noopener");
                  }}>
                  <div className="co-li-r1">
                    <span className="co-li-title">{job.title}</span>
                    <span className="co-li-status" style={{ color: badgeColor }}>
                      {badgeLabel}
                    </span>
                  </div>
                  <div className="co-li-r2">
                    {/* 등록일 하나만 보여주면 기간 감이 안 온다. 같은 자리에 게시 기간으로 적는다(상시는 마감일 없음). */}
                    <span>{job.deadline ? `${md(job.created_at)} ~ ${md(job.deadline)}` : `${md(job.created_at)} ~ 상시`}</span>
                    {job.application_count > 0 ? (
                      <span style={{ color: "#582681" }}
                        onClick={(e) => { if (!selectMode) { e.stopPropagation(); router.push(`/company/dashboard/applicants?job_id=${job.id}`); } }}>
                        지원자 <b style={{ color: "#582681" }}>{job.application_count}</b>
                      </span>
                    ) : (
                      <span>지원자 <b>{job.application_count}</b></span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 목록 (데스크톱) — 표에서 카드로.
          이 화면에서 하는 일은 "살아 있나 보고, 하나 골라 고치거나 마감하거나 다시 올리기"인데
          표에는 그 할 일이 없었다. 체크칸을 정확히 하나 켜야 툴바 단추가 살아나서,
          있는 줄도 모르고 지나치기 쉬웠다. 카드마다 그 자리에 붙인다.
          할 일은 상태마다 다르다 — 마감된 공고에 '수정'은 뜻이 없고, 대신 다시 올리는 것이 할 일이다. */}
      {!loading && filtered.length > 0 && !isMobile && (
        <div>
          <div className="co-jc-count">총 <strong>{filtered.length}</strong>건</div>
          {filtered.map((job) => {
            const closed = isJobClosed(job);
            const draft = job.status === "DRAFT";
            const dl = daysLeft(job.deadline);
            const 임박 = !closed && !draft && dl !== null && dl <= 7;
            const 상태 =
              draft ? { 글: "임시저장", 결: "draft" }
              : closed ? { 글: "마감", 결: "closed" }
              : 임박 ? { 글: dl === 0 ? "오늘 마감" : `D-${dl}`, 결: "soon" }
              : { 글: "진행중", 결: "live" };
            const 기간 = job.deadline ? `${md(job.created_at)} ~ ${md(job.deadline)}` : `${md(job.created_at)} ~ 상시`;
            return (
              <div key={job.id} className={`co-jc ${closed || draft ? "off" : ""}`}>
                {/* 윗줄 — 왼쪽에 상태와 제목, 오른쪽에 자주 쓰는 할 일.
                    공고명은 공고를 보러 가는 자리다(고치는 건 옆의 '수정'이 맡는다).
                    임시저장은 아직 공개된 화면이 없어 이어서 쓰러 간다. 새 탭으로
                    여는 건 목록을 잃지 않기 위해서다 — 공고 화면의 되돌아가기는
                    구직자용 목록으로 가서, 여기서 넘어가면 돌아올 데가 없어진다. */}
                <div className="co-jc-top">
                  <div className="co-jc-main">
                    <div className="co-jc-head">
                      <span className={`co-jc-badge ${상태.결}`}>{상태.글}</span>
                      <span className="co-jc-term">{기간}</span>
                    </div>
                    <button type="button" className="co-jc-title" title={job.title}
                      onClick={() => draft
                        ? router.push(`/company/dashboard/jobs/new?id=${job.id}`)
                        : window.open(`/jobs/${job.id}`, "_blank", "noopener")}>
                      {job.title}
                    </button>
                  </div>
                  <div className="co-jc-acts">
                    {draft ? (
                      <>
                        <button className="co-jc-act key"
                          onClick={() => router.push(`/company/dashboard/jobs/new?id=${job.id}`)}>이어서 작성</button>
                        <button className="co-jc-act" onClick={() => handleDelete(job.id)}>삭제</button>
                      </>
                    ) : closed ? (
                      <button className="co-jc-act" onClick={() => handleDelete(job.id)}>삭제</button>
                    ) : (
                      <>
                        <button className="co-jc-act"
                          onClick={() => router.push(`/company/dashboard/jobs/new?id=${job.id}`)}>수정</button>
                        <button className="co-jc-act" onClick={() => handleClose(job.id)}>마감</button>
                      </>
                    )}
                  </div>
                </div>
                {/* 아랫줄 — 선 아래 왼쪽에 다시 올리기, 오른쪽 끝에 성적.
                    임시저장은 아직 올린 적이 없어 복사할 것도 셀 것도 없다. */}
                {!draft && (() => {
                  const 수 = job.application_count ?? 0;
                  const 안본 = job.unviewed_count ?? 0;
                  const 열림 = !접은공고.includes(job.id);
                  return (
                    <>
                      <div className="co-jc-foot">
                        <button className="co-jc-act key"
                          onClick={() => router.push(`/company/dashboard/jobs/new?copy=${job.id}`)}>
                          {closed ? "복사해서 다시 올리기" : "복사해서 등록"}
                        </button>
                        {/* 숫자가 곧 문이다 — 눌러서 그 자리에서 펼친다. */}
                        <button type="button" className={`co-jc-nums${수 > 0 ? " open" : ""}`}
                          disabled={수 === 0}
                          onClick={() => 수 > 0 && 펼치기(job.id)}>
                          지원자 <b className={수 === 0 ? "zero" : ""}>{수}</b>
                          {안본 > 0 && <><i>·</i>미열람 <b>{안본}</b></>}
                          {수 > 0 && <ChevronDown size={15} className={`co-jc-chev${열림 ? " up" : ""}`} />}
                        </button>
                      </div>

                      {열림 && (공고지원자[job.id] || [])
                        .filter((a) => statusFilter !== "미열람" || a.status === "APPLIED").length > 0 && (
                        <div className="co-jc-apps">
                          {(공고지원자[job.id] || [])
                            .filter((a) => statusFilter !== "미열람" || a.status === "APPLIED")
                            .map((a, i) => (
                            <ApplicantCard key={a.id} a={a} showJob={false} 순번={i + 1}
                              onOpen={(x) => set지원서(x.id)}
                              onToggleScrap={스크랩토글} onNote={메모저장} />
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* 선택 액션바 (모바일) */}
      {isMobile && selectMode && checked.length > 0 && (
        <div className="co-selbar">
          <span className="co-selbar-count">{checked.length}개 선택됨</span>
          <button className="co-selbar-del" onClick={handleBulkDelete} aria-label="삭제">
            <Trash2 size={20} />
          </button>
        </div>
      )}

      {/* 상세 모달 */}
      {selected && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{maxWidth:"520px"}} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <span className={`jobs-type-badge ${selected.job_type === "STORE" ? "store" : "corp"}`}>
                  {selected.job_type === "STORE" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><StoreIcon size={14} style={{ flexShrink: 0 }} />매장</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><OfficeIcon size={14} style={{ flexShrink: 0 }} />본사</span>}
                </span>
                <h2 className="admin-modal-title">{selected.title}</h2>
              </div>
              <button className="admin-modal-close" onClick={() => setSelected(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-modal-info-grid">
                <div><label>마감일</label><span>{formatDeadline(selected.deadline)}</span></div>
                <div><label>지원자</label><span>{selected.application_count}명</span></div>
                <div><label>상태</label><span>{STATUS_LABEL[selected.status]}</span></div>
                <div><label>등록일</label><span>{new Date(selected.created_at).toLocaleDateString("ko-KR")}</span></div>
              </div>
              <div style={{display:"flex", gap:"8px", marginTop:"20px", flexWrap:"wrap"}}>
                <Link href={`/company/dashboard/applicants?job_id=${selected.id}`} className="company-primary-btn">
                  <Users size={14} /> 지원자 보기
                </Link>
                <button className="company-action-btn"
                  onClick={() => router.push(`/company/dashboard/jobs/new?id=${selected.id}`)}>
                  <Edit size={14} /> 수정
                </button>
                {selected.status === "ACTIVE" && (
                  <button className="company-action-btn secondary"
                    onClick={() => handleClose(selected.id)}>마감</button>
                )}
                <button className="admin-danger-btn"
                  onClick={() => handleDelete(selected.id)}>
                  <Trash2 size={14} /> 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {지원서 && (
        <ApplicationModal applicationId={지원서} onClose={() => set지원서(null)}
          onStatus={(id, st) => 지원자바꾸기(id, { status: st })} />
      )}
    </CompanyLayout>
  );
}

// useSearchParams는 Suspense 경계가 필요하다(지원자 관리 화면과 같은 구조).
export default function CompanyJobsPage() {
  return (
    <Suspense fallback={<CompanyLayout activePage="jobs"><div /></CompanyLayout>}>
      <CompanyJobsContent />
    </Suspense>
  );
}
