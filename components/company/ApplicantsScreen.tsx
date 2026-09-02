"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, Bookmark, BookmarkCheck, XCircle, ChevronDown } from "lucide-react";
import { genderLabel, calcAge, calcCareerYears } from "@/lib/memberFormat";
import Link from "next/link";
import CompanyLayout from "@/components/company/CompanyLayout";
import FilterDropdown from "@/components/company/FilterDropdown";
import { companyApplicationsApi, companyJobsApi, companyTalentApi } from "@/lib/api/company";
import type { CompanyApplication, ApplicationStatus } from "@/lib/types/company";

// 지원자 첨부 이력서 파일 배너 노출 여부 (개인회원 첨부 기능 숨김에 따라 비활성화, 추후 재사용 대비 코드 유지)
const SHOW_RESUME_FILE_BANNER = false;

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  APPLIED: "미열람",
  VIEWED: "열람",
  INTERVIEW: "면접",
  PASSED: "합격",
  REJECTED: "불합격",
  WITHDRAWN: "지원취소",
};

const STATUS_BADGE_CLASS: Record<ApplicationStatus, string> = {
  APPLIED: "company-badge-info",
  VIEWED: "company-badge-warning",
  INTERVIEW: "company-badge-purple",
  PASSED: "company-badge-success",
  REJECTED: "company-badge-danger",
  WITHDRAWN: "company-badge-default",
};

function shortenRegion(region: string | null | undefined): string | null {
  if (!region) return null;
  return region
    .replace(/특별자치도|특별자치시|특별시|광역시/g, "")
    .replace(/\s+/g, " ")
    .trim() || null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

// 사람이 직접 고르는 상태만 버튼으로 둔다.
// 미열람·열람은 이력서를 열면 자동으로 바뀌므로 손댈 이유가 없다.
const STATUS_ACTIONS: [ApplicationStatus, string, string][] = [
  ["INTERVIEW", "면접", "#582681"],
  ["PASSED", "합격", "#582681"],
  ["REJECTED", "불합격", "#8a8a90"],
];

function ApplicantsContent({ scope = "active" }: { scope?: "active" | "past" }) {
  const 지난 = scope === "past";
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const base = pathname.split("/").filter(Boolean)[0] === "company"
    ? "/company/dashboard"
    : `/${pathname.split("/").filter(Boolean)[0]}`;
  const [jobFilter, setJobFilter] = useState<string>(searchParams.get("job_id") || "");
  const [jobs, setJobs] = useState<{ id: string; title: string; applicationCount: number; createdAt: string; closed: boolean }[]>([]);

  const [applicants, setApplicants] = useState<CompanyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("전체");
  const [resumeFileInfo, setResumeFileInfo] = useState<{ name: string | null; size: number | null; url: string | null }>({ name: null, size: null, url: null });
  const [detailInfo, setDetailInfo] = useState<{ gender: string | null; birth: string | null; sido: string | null; sigungu: string | null; road: string | null; detail: string | null }>({ gender: null, birth: null, sido: null, sigungu: null, road: null, detail: null });
  const [isMobile, setIsMobile] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [jobSheetOpen, setJobSheetOpen] = useState(false);

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

// API 응답(snake_case) → ResumePreview props(camelCase) 변환

  const [checked, setChecked] = useState<string[]>([]);

  const toggleCheck = (id: string) =>
    setChecked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // 예전에는 목록에서 숨겼다(hidden_by_company). 되돌릴 화면이 없어 사실상 삭제였고,
  // 무엇보다 기업 화면만 치우고 구직자 쪽은 「지원함」에 멈춘 채 연락을 기다리게 뒀다.
  // 불합격으로 처리하면 목록도 정리되고 결과도 상대에게 전달된다.
  const handleBulkReject = async () => {
    if (!checked.length) return;
    if (!confirm(`선택한 ${checked.length}명을 불합격 처리할까요?`)) return;
    const ids = [...checked];
    setApplicants(prev => prev.map(a => ids.includes(a.id) ? { ...a, status: "REJECTED" as ApplicationStatus } : a));
    setChecked([]);
    setSelectMode(false);
    try {
      await Promise.all(ids.map(id => companyApplicationsApi.updateStatus(id, "REJECTED")));
    } catch (e) {
      alert("상태 변경 중 오류가 발생했습니다.");
      console.error("[handleBulkReject]", e);
    }
  };

  const handleBulkStatus = async (status: ApplicationStatus) => {
    if (!checked.length) return;
    const ids = [...checked];
    setApplicants(prev => prev.map(a => ids.includes(a.id) ? { ...a, status } : a));
    setChecked([]);
    setSelectMode(false);
    try {
      await Promise.all(ids.map(id => companyApplicationsApi.updateStatus(id, status)));
    } catch (e) {
      alert("상태 변경 중 오류가 발생했습니다.");
      console.error("[handleBulkStatus]", e);
      loadApplicants();
    }
  };

  const loadApplicants = async () => {
    setLoading(true);
    try {
      const res = await companyApplicationsApi.list({
        ...(jobFilter ? { job_id: jobFilter } : {}),
        scope,
        limit: 100,
      });
      setApplicants(res.data);
    } catch (e) {
      console.error("[loadApplicants]", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplicants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobFilter, scope]);

  // 공고 목록 (필터용)
  useEffect(() => {
    companyJobsApi.list({ limit: 100 })
      .then((res) => setJobs((res.data || []).map((j: any) => ({
        id: j.id,
        title: j.title,
        applicationCount: j.application_count ?? 0,
        createdAt: j.created_at,
        closed: j.status === "CLOSED" || (j.deadline && new Date(j.deadline) < new Date()),
      }))))
      .catch((e) => console.error("[applicants jobs]", e));
  }, []);

  const jobFilterTitle = jobFilter ? (jobs.find((j) => j.id === jobFilter)?.title || "") : "";

  const filtered = applicants.filter(a => {
    const matchSearch = !search || a.user_name.includes(search);
    const matchStatus = statusFilter === "전체" || STATUS_LABEL[a.status] === statusFilter;
    return matchSearch && matchStatus;
  });

  const 열기 = (a: CompanyApplication) => router.push(`${base}/applicants/${a.id}`);

  const toggleAll = () =>
    setChecked(checked.length === filtered.length ? [] : filtered.map(a => a.id));

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    try {
      await companyApplicationsApi.updateStatus(id, status);
      setApplicants(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (e) {
      alert("상태 변경 중 오류가 발생했습니다.");
      console.error("[handleStatusChange]", e);
    }
  };

  // 스크랩은 이력서가 아니라 사람에 대한 표시라 이름 옆에서 켜고 끈다. 인재검색·스크랩 인재와 같은 자리.
  const toggleScrap = async (a: CompanyApplication) => {
    const userId = (a as any).user_id;
    if (!userId) return;
    const was = !!(a as any).scrapped;
    setApplicants(prev => prev.map(x =>
      (x as any).user_id === userId ? ({ ...x, scrapped: !was } as any) : x));
    try {
      if (was) await companyTalentApi.unscrap(userId);
      else await companyTalentApi.scrap(userId);
    } catch (e) {
      setApplicants(prev => prev.map(x =>
        (x as any).user_id === userId ? ({ ...x, scrapped: was } as any) : x));
      console.error("[toggleScrap]", e);
    }
  };

  // 마감된 공고의 지원자는 지금 할 일이 아니다. 카운터에서 빼고 목록에는 '마감' 표시만 남긴다.
  // (상태를 임의로 바꾸면 매장이 직접 남긴 면접·합격 기록과 섞이므로 값은 그대로 둔다.)
  const isJobClosed = (a: CompanyApplication) =>
    a.job_status === "CLOSED" || (!!a.job_deadline && new Date(a.job_deadline) < new Date());
  const live = applicants.filter((a) => !isJobClosed(a));

  const counts = {
    전체: applicants.length,
    // 배지와 같은 기준(상태값)으로 센다. 이력서를 열면 곧바로 VIEWED가 되므로 APPLIED가 곧 미열람이고,
    // viewed_at 은 초기 데이터에 빠진 건이 있어 배지와 숫자가 어긋난다.
    미열람: live.filter(a => a.status === "APPLIED").length,
    합격: live.filter(a => a.status === "PASSED").length,
    열람: live.filter(a => a.status === "VIEWED").length,
    면접: live.filter(a => a.status === "INTERVIEW").length,
  };

  // 카운터가 곧 상태 필터다(드롭다운과 같은 값을 두 번 두지 않는다).
  const statCardsData = [
    // 미열람 → 열람 → 면접 → 합격 순서. '전체'는 바로 아래 '총 N명'이 이미 보여주므로 칸을 쓰지 않고,
    // 선택된 카드를 다시 누르면 전체로 돌아간다.
    // 상태값 APPLIED는 이력서를 열면 곧바로 VIEWED가 되므로 사실상 미열람과 같아 따로 세지 않는다.
    // 색은 쓰지 않는다. 0 이면 흐리게, 숫자가 있으면 보라 — 홈과 같은 규칙이다.
    { label: "미열람", value: String(counts.미열람), status: "미열람" },
    { label: "열람", value: String(counts.열람), status: "열람" },
    { label: "면접", value: String(counts.면접), status: "면접" },
    { label: "합격", value: String(counts.합격), status: "합격" },
  ];

  return (
    <CompanyLayout activePage={지난 ? "applicants-past" : "applicants"}>
      <div style={{ width: "100%" }}>
      {isMobile ? (
        <div className="co-topbar">
          <button className="co-jobdd" onClick={() => setJobSheetOpen(true)}>
            <span className="val">{jobFilterTitle || "전체 공고"}</span>
            <ChevronDown size={15} className="chev" />
          </button>
          <div className="co-statrow">
            {statCardsData.map((s) => (
              <button key={s.label} type="button"
                className={`co-stat${Number(s.value) > 0 ? " has" : ""}${statusFilter === s.status ? " on" : ""}`}
                onClick={() => setStatusFilter((cur) => (cur === s.status ? "전체" : s.status))}>
                <span className="l">{s.label}</span>
                <span className="n">{s.value}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* 홈의 카운터와 같은 짜임 — 한 판 안에 칸, 라벨이 위 숫자가 아래.
           여기서는 칸이 곧 상태 필터라, 고른 칸만 바탕을 준다. */
        <div className="co-counts">
          {statCardsData.map((s) => (
            <button key={s.label} type="button"
              className={`co-count${Number(s.value) > 0 ? " on" : ""}${statusFilter === s.status ? " sel" : ""}`}
              onClick={() => setStatusFilter((cur) => (cur === s.status ? "전체" : s.status))}>
              <span className="co-count-label">{s.label}</span>
              <span className="co-count-value">{s.value}</span>
            </button>
          ))}
        </div>
      )}

      {!isMobile && jobFilter && (
        <div style={{
          background: "#f7f7f8",
          border: "1px solid #f7f7f8",
          borderRadius: "10px",
          padding: "12px 16px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}>
          <span style={{ fontSize: "14px", color: "#582681", fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {jobFilterTitle ? `'${jobFilterTitle}' 지원자` : "특정 공고의 지원자만 표시 중"}
          </span>
          <button
            onClick={() => setJobFilter("")}
            style={{
              border: "1px solid #582681",
              background: "#fff",
              color: "#582681",
              padding: "4px 12px",
              borderRadius: "6px",
              fontSize: "13px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            전체 보기
          </button>
        </div>
      )}

      {!isMobile && (
      <div className="company-toolbar">
        <div className="company-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="지원자 이름 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {checked.length > 0 && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 13, color: "#888" }}>{checked.length}명 선택 · 상태변경</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {(STATUS_ACTIONS).map(([sv, sl, c]) => (
                <button key={sv} onClick={() => handleBulkStatus(sv)}
                  style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${c}`, background: "#fff", color: c, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                  {sl}
                </button>
              ))}
            </div>
            <button className="admin-danger-btn" onClick={handleBulkReject}>
              <XCircle size={15} /> 불합격 처리
            </button>
          </div>
        )}
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
            .co-jobdd { display: inline-flex; align-items: center; justify-content: space-between; gap: 5px; height: 46px; padding: 0 11px; border-radius: 9px; border: 1px solid #e2e2e6; background: #fff; color: #333; font-size: 13px; font-weight: 500; cursor: pointer; width: 108px; flex-shrink: 0; }
            .co-jobdd .val { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .co-jobdd .chev { flex-shrink: 0; color: #999; }
            .co-statrow { display: flex; gap: 6px; flex: 1; min-width: 0; }
            .co-stat { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; height: 46px; padding: 0 3px; border: 1px solid #eee; border-radius: 9px; background: #fff; cursor: pointer; font: inherit; transition: border-color .15s, background .15s; }
            .co-stat .l { font-size: 11px; color: #888; white-space: nowrap; }
            .co-stat .n { font-size: 17px; line-height: 1; color: #c8c8ce; }
            .co-stat.has .n { color: #582681; }
            .co-stat.on { border-color: #582681; background: #f7f7f8; }
            .co-mbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
            .co-mbar-count { font-size: 13.5px; color: #888; line-height: 1; position: relative; top: 2px; }
            .co-mbar-count strong { color: #1a1a1a; }
            .co-mbar-actions { display: flex; gap: 8px; }
            .co-mbar-btn { display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 12px; border-radius: 8px; border: 1px solid #e2e2e6; background: #fff; color: #444; font-size: 13.5px; font-weight: 500; cursor: pointer; }
            .co-mbar-btn.on { border-color: #582681; color: #582681; background: #f7f7f8; }
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
            .co-statbar { display: flex; align-items: center; gap: 16px; margin-bottom: 10px; }
            .co-statbar-label { font-size: 12.5px; color: #888; flex-shrink: 0; margin-right: 2px; }
            .co-statbtn { flex-shrink: 0; padding: 4px 2px; border: none; background: none; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; }
            .co-joblist { display: flex; flex-direction: column; gap: 2px; }
            .co-jobopt { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; text-align: left; width: 100%; padding: 13px 14px; border: none; background: none; border-radius: 10px; color: #333; cursor: pointer; }
            .co-jobopt .jt { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
            .co-jobopt .jmeta { font-size: 12px; color: #999; }
            .co-jobopt.on { background: #f7f7f8; }
            .co-jobopt.on .jt { color: #582681; font-weight: 600; }
          `}</style>
          <div className="co-mbar">
            <span className="co-mbar-count">총 <strong>{filtered.length}</strong>명</span>
            <div className="co-mbar-actions">
              <button className={`co-mbar-btn ${selectMode ? "on" : ""}`} onClick={toggleSelectMode}>
                {selectMode ? "취소" : "선택"}
              </button>
            </div>
          </div>
          {selectMode && checked.length > 0 && (
            <div className="co-statbar">
              <span className="co-statbar-label">{checked.length}명 상태변경</span>
              {(STATUS_ACTIONS).map(([sv, sl, c]) => (
                <button key={sv} className="co-statbtn" style={{ color: c }}
                  onClick={() => handleBulkStatus(sv)}>{sl}</button>
              ))}
            </div>
          )}
          {jobSheetOpen && (
            <div className="co-sheet-ov" onClick={() => setJobSheetOpen(false)}>
              <div className="co-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="co-sheet-grip" />
                <div className="co-sheet-head">
                  <span className="co-sheet-title">공고 선택</span>
                </div>
                <div className="co-sheet-body">
                  <div className="co-joblist">
                    <button className={`co-jobopt ${jobFilter === "" ? "on" : ""}`}
                      onClick={() => { setJobFilter(""); setJobSheetOpen(false); }}>
                      <span className="jt">전체 공고</span>
                    </button>
                    {jobs.map((j) => (
                      <button key={j.id} className={`co-jobopt ${jobFilter === j.id ? "on" : ""}`}
                        onClick={() => { setJobFilter(j.id); setJobSheetOpen(false); }}>
                        <span className="jt">{j.title}</span>
                        <span className="jmeta">
                          {j.closed ? "마감 · " : ""}등록 {j.createdAt ? new Date(j.createdAt).toLocaleDateString("ko-KR") : "-"} · 지원자 {j.applicationCount}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="company-card" style={{ padding: "60px 20px", textAlign: "center", color: "#888" }}>
          불러오는 중...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="company-card" style={{ padding: "60px 20px", textAlign: "center", color: "#888" }}>
          {applicants.length === 0
            ? (지난 ? "마감 후 90일 안에 받은 지원이 없어요." : "아직 지원자가 없어요.")
            : "조건에 맞는 지원자가 없어요."}
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
            .co-li-r1 { display: flex; align-items: center; gap: 10px; }
            .co-li-namerow { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
            .co-li-nameinfo { display: flex; align-items: baseline; gap: 7px; min-width: 0; }
            .co-li-status { font-size: 12.5px; font-weight: 600; flex-shrink: 0; }
            /* 이력서 사진과 같은 사각형. 원형 40px 은 얼굴이 너무 작아 알아볼 수 없었다. */
            .co-li-avatar { width: 44px; height: 56px; border-radius: 4px; overflow: hidden; flex-shrink: 0; border: 1px solid #e0e0e0; background: #f5f5f5; color: #582681; font-size: 17px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
            .co-li-avatar img { width: 100%; height: 100%; object-fit: cover; }
            .co-li-name { font-size: 15.5px; color: #1a1a1a; flex-shrink: 0; }
            .co-li-ageg { font-size: 12.5px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .co-li-meta2 { font-size: 12.5px; color: #888; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .co-li-jobrow { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 3px; }
            .co-li-job { flex: 1; font-size: 15.5px; color: #582681; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
            .co-li-metarow { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-top: 2px; }
            .co-li-date { font-size: 12px; color: #999; flex-shrink: 0; white-space: nowrap; }
            .co-li-date .lbl { color: #999; margin-right: 3px; }
          `}</style>
          {filtered.map((a) => {
            const on = checked.includes(a.id);
            const st = a.status;
            const stColor = st === "APPLIED" ? "#0ea5e9" : st === "VIEWED" ? "#f59e0b" : st === "PASSED" ? "#10b981" : "#999";
            const age = calcAge((a as any).user_birth_date);
            const ct = (a as any).career_type;
            const career = ct === "NEWCOMER" ? "신입"
              : (() => { const y = calcCareerYears((a as any).recent_start_date); return y ? `경력 ${y}` : "경력"; })();
            const gender = genderLabel((a as any).user_gender);
            const ageGender = [age != null ? `${age}세` : null, gender || null, career || null].filter(Boolean).join(" · ");
            const region = shortenRegion([(a as any).user_region_sido, (a as any).user_region_sigungu].filter(Boolean).join(" "));
            const scrapBtn = (
              <button type="button" title={(a as any).scrapped ? "스크랩 해제" : "스크랩"}
                onClick={(e) => { e.stopPropagation(); toggleScrap(a); }}
                style={{ background: "none", border: "none", padding: 2, cursor: "pointer", display: "inline-flex", flexShrink: 0 }}>
                {(a as any).scrapped
                                ? <BookmarkCheck size={15} style={{ color: "#582681" }} />
                                : <Bookmark size={15} style={{ color: "#c8c8c8" }} />}
              </button>
            );
            return (
              <div key={a.id} className="co-row">
                {selectMode && (
                  <input type="checkbox" className="co-row-check" checked={on}
                    onChange={() => toggleCheck(a.id)} />
                )}
                <div className={`co-li ${on ? "on" : ""}`}
                  onClick={() => selectMode ? toggleCheck(a.id) : router.push(`${base}/applicants/${a.id}`)}>
                  <div className="co-li-r1">
                    <div className="co-li-avatar">
                      {(a as any).user_avatar_url
                        ? <img src={(a as any).user_avatar_url} alt={a.user_name} loading="lazy" />
                        : (a.user_name || "?").slice(0, 1)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {!jobFilter && (
                        <div className="co-li-jobrow">
                          <span className="co-li-job">{a.job_title}</span>
                          {isJobClosed(a) && <span style={{ flexShrink: 0, fontSize: 11, color: "#999", background: "#f2f2f4", borderRadius: 4, padding: "1px 5px" }}>마감</span>}
                          {scrapBtn}
                        </div>
                      )}
                      <div className="co-li-namerow">
                        <div className="co-li-nameinfo">
                          <span className="co-li-name">{a.user_name}</span>
                          {ageGender && <span className="co-li-ageg">{ageGender}</span>}
                          {/* 공고 행이 없으면(공고 필터) 이 줄이 첫 줄이라 여기 붙는다. */}
                          {jobFilter && scrapBtn}
                        </div>
                        <span className="co-li-status" style={{ color: stColor }}>
                          {STATUS_LABEL[st]}
                        </span>
                      </div>
                      <div className="co-li-metarow">
                        <span className="co-li-meta2">{region}</span>
                        <span className="co-li-date">
                          <span className="lbl">지원일</span> {formatDate(a.applied_at).slice(5)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 테이블 (데스크톱) */}
      {!loading && filtered.length > 0 && !isMobile && (
        <div>
          {/* 표에서 카드로. 인재풀과 같은 구조로 맞춘다 — 사진과 이름이 앞에,
              할 일이 오른쪽에, 연락처가 아랫줄에. 지원자는 여기에 체크(일괄
              처리)와 상태가 더 붙는다. */}
          <div className="tal-listhead">
            <label className="tal-all">
              <input type="checkbox"
                checked={checked.length === filtered.length && filtered.length > 0}
                onChange={toggleAll} />
              전체 선택
            </label>
            <span>총 <strong>{filtered.length}</strong>명</span>
          </div>
          <div className="tal-list">
            {filtered.map((a) => {
              const 고름 = checked.includes(a.id);
              const 나이 = calcAge((a as any).user_birth_date);
              const ct = (a as any).career_type;
              // 연차를 모르면 「경력」이라는 말만 덩그러니 남는다 — 그럴 바엔 안 적는다.
              const 경력 = ct === "NEWCOMER"
                ? "신입"
                : (() => { const y = calcCareerYears((a as any).recent_start_date); return y ? `경력 ${y}` : ""; })();
              const 나이성별 = [나이 != null ? `${나이}세` : null, genderLabel((a as any).user_gender)].filter(Boolean).join(" · ");
              const 지역 = shortenRegion([(a as any).user_region_sido, (a as any).user_region_sigungu].filter(Boolean).join(" "));
              // 브랜드 보라 하나로 간다. 아직 안 본 사람만 보라(할 일이 남은 것),
              // 끝난 것(불합격·지원취소)은 흐리게, 나머지는 먹색.
              const 상태색 = a.status === "APPLIED" ? "#582681"
                : (a.status === "REJECTED" || a.status === "WITHDRAWN") ? "#b4b4b9" : "#1a1a1a";
              return (
                <div key={a.id} className={`tal-card${고름 ? " on" : ""}`}>
                  <div className="tal-top">
                    <input type="checkbox" className="tal-check" checked={고름} onChange={() => toggleCheck(a.id)} />
                    <div className="tal-avatar" onClick={() => 열기(a)} title="지원서 보기">
                      {(a as any).user_avatar_url
                        ? <img src={(a as any).user_avatar_url} alt={a.user_name} loading="lazy" />
                        : <span>{(a.user_name || "?").slice(0, 1)}</span>}
                    </div>

                    {/* 인재 카드와 같은 얼굴 — 맨 위는 본인이 고른 한 마디, 그 아래에
                        그 사람을 특정하는 값. 한줄소개를 안 쓴 사람은 이름이 대신한다. */}
                    <div className="tal-main" role="button" tabIndex={0} title="지원서 보기"
                      onClick={() => 열기(a)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); 열기(a); } }}>
                      <div className="tal-name">{(a as any).user_intro || a.user_name}</div>
                      <div className="tal-who">
                        {(a as any).user_intro ? a.user_name : ""}
                        {(a as any).user_intro && 나이성별 ? " " : ""}
                        {나이성별 && `(${나이성별})`}
                        {경력 && <>{((a as any).user_intro || 나이성별) ? " · " : ""}{경력}</>}
                      </div>
                      {지역 && <div className="tal-who">{지역}</div>}
                    </div>

                    <div className="tal-acts">
                      <button type="button" title={(a as any).scrapped ? "스크랩 해제" : "스크랩"}
                        className="tal-scrap" onClick={(e) => { e.stopPropagation(); toggleScrap(a); }}>
                        {(a as any).scrapped
                          ? <BookmarkCheck size={18} style={{ color: "#582681" }} />
                          : <Bookmark size={18} style={{ color: "#c8c8c8" }} />}
                      </button>
                      <span style={{ fontSize: 12.5, color: 상태색 }}>
                        {a.status === "WITHDRAWN" ? "지원취소" : STATUS_LABEL[a.status]}
                      </span>
                    </div>
                  </div>

                  {/* 아랫줄은 인재 카드의 태그·날짜 자리 — 여기서는 어느 공고로 어떻게
                      들어왔는지와 지원한 날. 연락처는 지원서를 열면 나온다. */}
                  <div className="tal-foot">
                    <span className="tal-tags">
                      {a.job_title}
                      {isJobClosed(a) && <span style={{ marginLeft: 5, fontSize: 11, color: "#999", background: "#f2f2f4", borderRadius: 4, padding: "1px 5px" }}>마감</span>}
                      {(a as any).proposal_interested_at
                        ? <span className="tal-from">대화 후 지원</span>
                        : (a as any).proposed_at
                          ? <span className="tal-from">제안 후 지원</span>
                          : null}
                    </span>
                    <span className="tal-when">{formatDate(a.applied_at)} 지원</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 기한은 목록 아래 한 줄로. 카드마다 붙이면 같은 말이 스무 번 선다. */}
      {지난 && !loading && filtered.length > 0 && (
        <p style={{ margin: "14px 2px 0", fontSize: 12.5, color: "#a0a0a6" }}>
          마감 후 90일까지 볼 수 있어요.
        </p>
      )}
      </div>

      {/* 선택 액션바 (모바일) */}
      {isMobile && selectMode && checked.length > 0 && (
        <div className="co-selbar">
          <span className="co-selbar-count">{checked.length}개 선택됨</span>
          <button className="co-selbar-del" onClick={handleBulkReject} aria-label="불합격 처리">
            <XCircle size={20} />
          </button>
        </div>
      )}

    </CompanyLayout>
  );
}

/** 지원자 화면. 「지원자 목록」과 「지난 지원자」가 같은 화면을 쓰고 범위만 바꾼다.
 *  라우트 파일이 아니라 컴포넌트로 둔 것은 Next 가 page.tsx 의 내보내기를 검사해
 *  props 도, 이름을 단 내보내기도 허락하지 않아서다. */
export default function ApplicantsScreen({ scope = "active" }: { scope?: "active" | "past" }) {
  return (
    <Suspense fallback={<CompanyLayout activePage={scope === "past" ? "applicants-past" : "applicants"}><div /></CompanyLayout>}>
      <ApplicantsContent scope={scope} />
    </Suspense>
  );
}