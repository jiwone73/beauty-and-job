"use client";
import { StoreIcon, OfficeIcon } from "@/components/icons/JobTypeIcon";
import { useState, useEffect, Suspense } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import { 마감인가 } from "@/lib/jobClosed";
import FilterDropdown from "@/components/company/FilterDropdown";
import {
  Users, Edit, X, Trash2, ChevronDown, ChevronRight, ChevronLeft, Plus
} from "lucide-react";
import { companyJobsApi, companyApplicationsApi, companyTalentApi } from "@/lib/api/company";
import ApplicantCard from "@/components/company/ApplicantCard";
import ApplicantTableRow from "@/components/company/ApplicantTableRow";
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
// 판정은 공용 함수 하나로. 여기 따로 두었더니 마감일 당일에 다른 화면과
// 갈렸다(여기는 진행중, 지원자 카드는 마감).
const isJobClosed = (job: { status: string; deadline: string | null }) =>
  마감인가(job.status, job.deadline);

function CompanyJobsContent() {
  const router = useRouter();
  // 대시보드 '마감임박' 카운터에서 넘어오면 같은 조건이 걸린 채로 열린다.
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status");
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [loading, setLoading] = useState(true);
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
  // "신규 등록" 버튼을 헤더로 옮긴다("신규등록버튼을 지우고 새공고 작성 버튼을
  // 헤더에 넣어줘") — PC 머리줄의 "새 공고 작성"과 같은 자리(co-m-header-slot)에
  // 포탈한다(JobPostForm이 임시저장·미리보기 아이콘을 꽂는 것과 같은 방식).
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHeaderSlot(document.getElementById("co-m-header-slot"));
  }, [isMobile]);

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

  // 펼친 지원자 목록의 검색·정렬·상태. 공고마다 따로 기억한다 — 한 공고에서
  // 걸어 둔 조건이 다른 공고에 따라가면 왜 안 보이는지 알 수 없다.
  // 왼쪽에서 고른 공고. 화면을 열면 첫 공고가 골라져 있다 — 아무것도 안 고른
  // 빈 오른쪽 판은 「뭘 눌러야 하지」로 읽힌다.
  const [고른공고, set고른공고] = useState<string | null>(null);
  const [지원자찾기, set지원자찾기] = useState<Record<string, string>>({});
  const 지원자고르기 = (jobId: string) => {
    const 말 = (지원자찾기[jobId] || "").trim();

    let 목록 = (공고지원자[jobId] || [])
      .filter((a) => statusFilter !== "미열람" || a.status === "APPLIED")
;
    if (말) {
      const q = 말.toLowerCase();
      목록 = 목록.filter((a) => [
        a.user_name, (a as any).user_intro, (a as any).user_sub_job,
        (a as any).user_main_job_group, ...((a as any).user_skill_areas || []),
        ...((a as any).user_office_job_areas || []),
      ].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(q)));
    }
    // 늘 최근 지원이 위다 — 차례를 고르게 두어 봐야 한 공고의 지원자는 몇 명뿐이다.
    return [...목록].sort((x, y) =>
      new Date(y.applied_at).getTime() - new Date(x.applied_at).getTime());
  };

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
      (jobGroupFilter === "오피스" && j.job_type === "OFFICE") ||
      (jobGroupFilter === "매장" && j.job_type === "STORE");
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
    return matchGroup && matchStatus;
  }).sort((a, b) => {
    // 늘 최신이 위다 — 진행중이든 마감이든 방금 올린 것부터 본다.
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // 고른 공고가 목록에서 사라졌으면(탭·검색을 바꿨다) 맨 위 것으로 옮긴다.
  // 모바일도 이제 한 번에 하나만 보여주니("공고목록은 1개야 상단에") 똑같이 맨
  // 위 것을 골라 둔다 — 예전에는 목록에서 직접 고르는 화면이라 자동으로 고를
  // 필요가 없었다.
  useEffect(() => {
    if (filtered.length === 0) return;
    if (!고른공고 || !filtered.some((j) => j.id === 고른공고)) set고른공고(filtered[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.map((j) => j.id).join(","), 고른공고]);
  const 지금공고 = filtered.find((j) => j.id === 고른공고) || null;

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
    오피스: jobs.filter(j => j.job_type === "OFFICE").length,
    매장: jobs.filter(j => j.job_type === "STORE").length,
  };
  // 업체 유형(BOTH)이 아니라 실제 공고 구성으로 판단 — 매장 회원이 오피스 공고를 낸 경우도 필터가 살아있다.
  const isBoth = counts.오피스 > 0 && counts.매장 > 0;

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
    // 미열람 지원서만 펼쳐진다.
    { label: "미열람 지원서", value: String(cntUnviewed), unit: "건", status: "미열람" },
  ];

  // 모바일 상단 상태 통계 카드 (마감 임박 기준 필터)
  // 모바일도 데스크톱과 같은 넷으로 — 「≤D-7 / >D-7」은 화면에 없는 말이었다.
  const statusCards = [
    { label: "전체", value: String(counts.전체), status: "전체" },
    { label: "진행중", value: String(counts.진행중), status: "진행중" },
    { label: "마감임박", value: String(cntSoon), status: "마감임박" },
    { label: "마감", value: String(counts.마감), status: "마감" },
    { label: "지원자", value: String(cntApplied), status: "지원자" },
    { label: "미열람 지원서", value: String(cntUnviewed), status: "미열람" },
  ];

  // 공고 하나의 상세(조건·수정/마감/재등록)와 그 공고 지원자 목록. PC는 오른쪽
  // 패널 하나에 이걸 그리고, 모바일은 공고 개수가 몇 안 되니 목록 안에서 그 줄
  // 바로 밑에 펼친다("공고개수가 얼마 안되니 펼침으로 하면 어떨까?") — 페이지를
  // 통째로 넘기는 대신 같은 화면에서 열고 닫는다.
  const renderPaneBody = (job: CompanyJob) => {
    const closed = isJobClosed(job);
    const draft = job.status === "DRAFT";
    const dl = daysLeft(job.deadline);
    const 임박 = !closed && !draft && dl !== null && dl <= 7;
    const 상태 =
      draft ? { 글: "임시저장", 결: "draft" }
      : closed ? { 글: "마감", 결: "closed" }
      : 임박 ? { 글: dl === 0 ? "오늘 마감" : `D-${dl}`, 결: "soon" }
      : { 글: "진행중", 결: "live" };
    const 수 = job.application_count ?? 0;
    const 안본 = job.unviewed_count ?? 0;
    const 기간 = job.deadline
      ? `${md(job.created_at)} ~ ${md(job.deadline)}`
      : `${md(job.created_at)} ~ 상시`;
    const 부문 = ((job as any).positions || []) as any[];
    const 목록 = 지원자고르기(job.id);
    return (
      <>
        <div className="co-pane-card">
          <div className="co-pane-head">
            {/* flex:1 이 없으면 이 칸이 제 글자 너비만 차지해, 안의
                marginLeft:auto(수정 아이콘·마감·재등록)가 카드 오른쪽 끝이
                아니라 글자 바로 옆에서 멈췄다("수정아이콘, 버튼은 오른쪽
                정렬"). */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="co-pane-term">
                <span className={`co-jc-badge ${상태.결}`}>{상태.글}</span>
                {기간}
                {/* 마감·재등록을 진행중 줄로 올린다("마감, 재등록을 ... 진행중
                    라인으로 올리고"). 처음엔 글자뿐이었는데 "버튼형으로 만들어줘
                    (패딩값적은)"라 해서 작은 테두리 버튼으로, 순서도 "마감하고
                    재등록 위치 바꾸고"에 맞춰 마감(또는 삭제)을 먼저 둔다. */}
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {/* 수정(임시저장은 이어서 작성)을 마감 버튼 왼쪽으로 옮긴다("수정
                      아이콘 마감버튼 왼쪽으로 올려") — 공고명 줄에서 이 줄로.
                      마감된 공고는 고칠 게 없어 자리를 안 준다. 아이콘만으론 눌러야
                      할 곳인지 알기 어려워 옆의 마감·재등록과 같은 글자 버튼으로
                      바꾼다("수정아이콘을 수정버튼으로 바꿔줘"). */}
                  {!closed && (
                    <button type="button" className="co-pane-btn"
                      onClick={() => router.push(`/company/dashboard/jobs/new?id=${job.id}`)}>
                      {draft ? "이어서 작성" : "수정"}
                    </button>
                  )}
                  {closed || draft ? (
                    <button type="button" className="co-pane-btn" onClick={() => handleDelete(job.id)}>삭제</button>
                  ) : (
                    <button type="button" className="co-pane-btn" onClick={() => handleClose(job.id)}>마감</button>
                  )}
                  {!draft && (
                    <button type="button" className="co-pane-btn"
                      onClick={() => router.push(`/company/dashboard/jobs/new?copy=${job.id}`)}>
                      재등록
                    </button>
                  )}
                </span>
              </div>
              {/* 공고명은 길어도 2줄까지만("공고명 2줄 ... 제한", co-pane-title CSS
                  의 line-clamp). */}
              <h2 className="co-pane-title">{job.title}</h2>
            </div>
          </div>

          {/* 조건 줄 — 공고 미리보기의 모집부문 표와 같은 차례. 고치고 마감하는
              길은 위 두 줄(진행중·공고명)로 옮겼다. */}
          <div className="co-pane-pos">
            <div style={{ minWidth: 0 }}>
              {(() => {
                const 경력글 = (v: string) =>
                  v === "NEW" ? "신입" : v === "EXPERIENCED" ? "경력" : "경력무관";
                // 학력은 오피스 공고에서만 의미가 있다 — 매장은 늘 "무관"이라 그
                // 값이 뜨는 게 아니라 왜 뜨는지부터 헷갈렸다("무관은 무슨 무관이야?").
                // 근무시간은 이 줄에서 뺀다("근무시간은 빼자") — 상세는 위에서 본다.
                const isOffice = (job as any).job_type === "OFFICE";
                const 줄들 = 부문.length > 0
                  ? 부문.map((p: any) => [
                      p.category || p.group,
                      p.headcount ? `${String(p.headcount).replace(/명$/, "")}명` : null,
                      p.location,
                      p.employment || (job as any).employment_type,
                      p.gender,
                      p.career,
                      isOffice ? p.education : null,
                      p.salary,
                    ].filter(Boolean).join("  |  "))
                  : [[
                      ((job as any).categories || []).join(" · "),
                      (job as any).employment_type,
                      경력글((job as any).experience_level),
                      (job as any).headcount ? `${(job as any).headcount}명` : null,
                    ].filter(Boolean).join("  |  ")];
                return 줄들.filter(Boolean).map((줄: string, i: number) => (
                  <div key={i} className="co-pane-posline">{줄}</div>
                ));
              })()}
            </div>
          </div>
        </div>

        <div className="co-pane-list">
        {/* 공고 머리 밑 띠 — 아래 목록이 이 공고의 지원자라는 것을 글로 말한다.
            보낸 제안·스크랩과 같은 부품이다. 몇 명인지도 여기서 말한다. */}
        <div className="co-pane-band">
          <span>이 공고의 지원자 {목록.length}명</span>
          {안본 > 0 && <><span className="apl-bar-sep">|</span><span>미열람 {안본}</span></>}
          <ChevronDown size={16} aria-hidden="true" />
        </div>

        {수 === 0 ? (
          <p className="apl-none">아직 지원자가 없어요.</p>
        ) : 목록.length === 0 ? (
          <p className="apl-none">찾는 지원자가 없어요.</p>
        ) : isMobile ? (
          <div className="co-pane-apps">
            {목록.map((a) => (
              <ApplicantCard key={a.id} a={a} showJob={false}
                onOpen={(x) => set지원서(x.id)} onNote={메모저장} />
            ))}
          </div>
        ) : (
          /* PC는 카드 대신 표로("PC는 테이블 뷰로 바꾸자. 모바일은 카드 뷰로
             그대로"). */
          <table className="apl-table">
            <thead>
              <tr>
                <th>인재</th><th>모집분야</th><th>경력</th><th>희망연봉</th>
                <th>지원일</th><th>출근가능일</th><th>메모</th>
              </tr>
            </thead>
            <tbody>
              {목록.map((a) => (
                <ApplicantTableRow key={a.id} a={a}
                  onOpen={(x) => set지원서(x.id)} onNote={메모저장} />
              ))}
            </tbody>
          </table>
        )}
        </div>
      </>
    );
  };

  // 왼쪽 사이드는 이 화면이 직접 그린다 — 고정 메뉴(공고·지원자 관리 / 공고 등록)는
  // 등록이 머리줄에 이미 있고, 관리 화면은 지금 보고 있는 이 화면이라 같은 말이었다.
  const 사이드 = isMobile ? null : (
    <div className="co-side">
      <div className="co-side-tabs">
        {(["진행중", "마감"] as const).map((t) => (
          <button key={t} type="button"
            className={`co-side-tab${statusFilter === t ? " on" : ""}`}
            onClick={() => setStatusFilter(t)}>
            {t}<span>{t === "진행중" ? counts.진행중 : counts.마감}</span>
          </button>
        ))}
      </div>
      <div className="co-side-list">
        {filtered.length === 0 && <p className="co-side-none">공고가 없어요.</p>}
        {filtered.map((job) => {
          const 안본 = job.unviewed_count ?? 0;
          return (
            <button key={job.id} type="button"
              className={`co-side-item${고른공고 === job.id ? " on" : ""}`}
              onClick={() => set고른공고(job.id)}>
              {/* 이름만 둔다 — 조건과 성적은 오른쪽 카드가 말한다. */}
              <span className="co-side-t">{job.title}</span>
              {안본 > 0 && <span className="co-side-dot" title={`미열람 ${안본}`} />}
            </button>
          );
        })}
      </div>
    </div>
  );

  // 모바일은 공고를 한 번에 하나만 보여주니 고를 목록이 없다 — 화면 제목
  // "공고·지원자 관리"와 같은 줄 양 끝에 화살표를 두어 넘긴다("제목과 같은
  // 행에 양옆으로 화살표를 넣으면 될거 같아" / "화살표는 왼쪽 오른쪽 끝으로
  // 이동해줘"). 지금 작업은 모바일만이라 PC 제목은 그대로 둔다("피씨는
  // 건드리면 안되") — PC는 왼쪽 목록에서 직접 고른다.
  const jobsPaneTitle = (isMobile && filtered.length > 1 && 지금공고) ? (
    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <button type="button" className="co-pane-nav" aria-label="이전 공고"
        onClick={() => {
          const idx = filtered.findIndex((j) => j.id === 지금공고!.id);
          if (idx === -1) return;
          set고른공고(filtered[(idx - 1 + filtered.length) % filtered.length].id);
        }}>
        <ChevronLeft size={20} />
      </button>
      공고·지원자 관리
      <button type="button" className="co-pane-nav" aria-label="다음 공고"
        onClick={() => {
          const idx = filtered.findIndex((j) => j.id === 지금공고!.id);
          if (idx === -1) return;
          set고른공고(filtered[(idx + 1) % filtered.length].id);
        }}>
        <ChevronRight size={20} />
      </button>
    </span>
  ) : undefined;

  return (
    <CompanyLayout activePage="jobs" side={사이드} title={jobsPaneTitle}>
      <div className="co-joblist" style={{ width: isMobile ? "100%" : "100%", maxWidth: "100%" }}>
      {/* 상태 고르개 (데스크톱만).
          누르면 걸리는 필터인데 네모 상자 넷으로 그려 두니 그냥 숫자판처럼 보였다.
          사람인 공고 관리처럼 이름과 수를 한 줄에 늘어놓은 탭으로 바꾼다 — 무엇이
          켜져 있는지가 밑줄로 바로 보이고, 상자가 사라져 아래 줄과 안 붙는다. */}


      {/* "신규 등록" 버튼은 헤더의 "새 공고 작성"으로 옮기고 여기서는 지운다
          ("신규등록버튼을 지우고 새공고 작성 버튼을 헤더에 넣어줘") — 이 자리에
          있던 필터·선택 모드 관련 죽은 CSS도 전에 다 걷어냈으니 이 블록 자체가
          이제 필요 없다. */}
      {isMobile && headerSlot && createPortal(
        <button className="co-m-addbtn" onClick={() => router.push("/company/dashboard/jobs/new")}
          aria-label="새 공고 작성" title="새 공고 작성">
          {/* 아이콘만으로는 무슨 뜻인지 안 읽혀 글자를 더한다("새공고 작성을
              +새공고 로 바꾸자") — "작성"은 빼 좁은 헤더에 맞춘다. */}
          <Plus size={16} />새공고
        </button>,
        headerSlot
      )}

      {/* 로딩 */}
      {loading && (
        <div className="company-card" style={{ padding: "60px 20px", textAlign: "center", color: "#555" }}>
          불러오는 중...
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && filtered.length === 0 && (
        <div className="company-card" style={{ padding: "60px 20px", textAlign: "center", color: "#555" }}>
          {jobs.length === 0
            ? "등록된 공고가 없어요. 첫 공고를 등록해보세요!"
            : "조건에 맞는 공고가 없어요."}
        </div>
      )}

      {/* 모바일 — 공고 하나만 보여준다("공고목록은 1개야 상단에. 나머지를 보려면
          제목옆에 < >를 누르면 되") — 고를 목록이 없으니 위 제목 옆 화살표
          (jobsPaneTitle)로 다음/이전 공고로 넘긴다. 지금 작업은 모바일만이라
          PC 쪽(사이드+아래 co-pane)은 그대로 둔다. */}
      {!loading && filtered.length > 0 && isMobile && (
          <section className="co-pane co-pane-inline">
            {!지금공고 ? (
              <div className="company-card" style={{ padding: "60px 20px", textAlign: "center", color: "#555" }}>
                불러오는 중...
              </div>
            ) : renderPaneBody(지금공고)}
          </section>
      )}

      {/* 목록 (데스크톱) — 표에서 카드로.
          이 화면에서 하는 일은 "살아 있나 보고, 하나 골라 고치거나 마감하거나 다시 올리기"인데
          표에는 그 할 일이 없었다. 체크칸을 정확히 하나 켜야 툴바 단추가 살아나서,
          있는 줄도 모르고 지나치기 쉬웠다. 카드마다 그 자리에 붙인다.
          할 일은 상태마다 다르다 — 마감된 공고에 '수정'은 뜻이 없고, 대신 다시 올리는 것이 할 일이다. */}
      {/* 데스크톱 — 왼쪽에 공고 이름만, 오른쪽에 고른 공고와 그 지원자. */}
      {!loading && !isMobile && (
          <section className="co-pane">
            {!지금공고 ? (
              <div className="company-card" style={{ padding: "60px 20px", textAlign: "center", color: "#555" }}>
                왼쪽에서 공고를 골라 주세요.
              </div>
            ) : renderPaneBody(지금공고)}
          </section>
      )}
      </div>

      {/* 상세 모달 */}
      {selected && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{maxWidth:"520px"}} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <span className={`jobs-type-badge ${selected.job_type === "STORE" ? "store" : "corp"}`}>
                  {selected.job_type === "STORE" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><StoreIcon size={14} style={{ flexShrink: 0 }} />매장</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><OfficeIcon size={14} style={{ flexShrink: 0 }} />오피스</span>}
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
