"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X, FileText, Bookmark, BookmarkCheck, Paperclip, EyeOff, Download, Printer, Trash2, ChevronDown, Instagram } from "lucide-react";
import { genderLabel, calcAge, calcCareerYears } from "@/lib/memberFormat";
import { formatPhone } from "@/lib/phone";
import LinkCell from "@/components/company/LinkCell";
import Link from "next/link";
import CompanyLayout from "@/components/company/CompanyLayout";
import FilterDropdown from "@/components/company/FilterDropdown";
import ApplicationDocument from "@/components/resume/ApplicationDocument";
import { downloadApplicationPdf, printApplication } from "@/lib/applicationPdf";
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
  ["INTERVIEW", "면접", "#8b5cf6"],
  ["PASSED", "합격", "#10b981"],
  ["REJECTED", "불합격", "#e74c3c"],
];

function ApplicantsContent() {
  const searchParams = useSearchParams();
  const [jobFilter, setJobFilter] = useState<string>(searchParams.get("job_id") || "");
  const [jobs, setJobs] = useState<{ id: string; title: string; applicationCount: number; createdAt: string; closed: boolean }[]>([]);

  const [applicants, setApplicants] = useState<CompanyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("전체");
  const [selected, setSelected] = useState<CompanyApplication | null>(null);
  const [resumeData, setResumeData] = useState<any>(null);
  const [coverLetter, setCoverLetter] = useState<string>("");
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeFileInfo, setResumeFileInfo] = useState<{ name: string | null; size: number | null; url: string | null }>({ name: null, size: null, url: null });
  const [detailInfo, setDetailInfo] = useState<{ gender: string | null; birth: string | null; sido: string | null; sigungu: string | null; road: string | null; detail: string | null }>({ gender: null, birth: null, sido: null, sigungu: null, road: null, detail: null });
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
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

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setIsDownloading(true);
    try {
      await downloadApplicationPdf(previewRef.current, selected?.user_name ? `${selected.user_name}_이력서.pdf` : "이력서.pdf");
    } catch {
      alert("다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (!previewRef.current) return;
    try {
      await printApplication(previewRef.current);
    } catch {
      alert("인쇄 준비 중 오류가 발생했습니다.");
    }
  };
// API 응답(snake_case) → ResumePreview props(camelCase) 변환
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
  // selected 변경 시 이력서 데이터 fetch
  useEffect(() => {
    if (!selected) {
      setResumeData(null);
      setResumeFileInfo({ name: null, size: null, url: null });
      setDetailInfo({ gender: null, birth: null, sido: null, sigungu: null, road: null, detail: null });
      setCoverLetter("");
      return;
    }
    const token = localStorage.getItem("access_token");
    if (!token) return;
    // 이력서를 열면 미열람 → 열람으로 자동 전환
    if (selected.status === "APPLIED") {
      handleStatusChange(selected.id, "VIEWED");
    }
    setResumeLoading(true);
    fetch(`/api/company/applications/${selected.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          if (res.data.resume) setResumeData(res.data.resume);
          setResumeFileInfo({ name: res.data.resume_file_name || null, size: res.data.resume_file_size || null, url: res.data.resume_file_preview_url || null });
          setCoverLetter(res.data.cover_letter || "");
          setDetailInfo({ gender: res.data.user_gender || null, birth: res.data.user_birth_date || null, sido: res.data.user_region_sido || null, sigungu: res.data.user_region_sigungu || null, road: res.data.user_address_road || null, detail: res.data.user_address_detail || null });
        }
      })
      .catch(console.error)
      .finally(() => setResumeLoading(false));
  }, [selected?.id]);

  const [checked, setChecked] = useState<string[]>([]);

  const toggleCheck = (id: string) =>
    setChecked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleBulkHide = async () => {
    if (!checked.length) return;
    if (!confirm(`선택한 ${checked.length}명을 목록에서 삭제하시겠습니까?`)) return;
    try {
      await Promise.all(checked.map(id => companyApplicationsApi.hide(id)));
      setApplicants(prev => prev.filter(a => !checked.includes(a.id)));
      setChecked([]);
      setSelectMode(false);
    } catch (e) {
      alert("숨김 처리 중 오류가 발생했습니다.");
      console.error("[handleBulkHide]", e);
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
  }, [jobFilter]);

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

  const toggleAll = () =>
    setChecked(checked.length === filtered.length ? [] : filtered.map(a => a.id));

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    try {
      await companyApplicationsApi.updateStatus(id, status);
      setApplicants(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
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
    { label: "미열람", value: String(counts.미열람), unit: "명", color: "#e05252", status: "미열람" },
    { label: "열람", value: String(counts.열람), unit: "명", color: "#f59e0b", status: "열람" },
    { label: "면접", value: String(counts.면접), unit: "명", color: "#8b5cf6", status: "면접" },
    { label: "합격", value: String(counts.합격), unit: "명", color: "#10b981", status: "합격" },
  ];

  return (
    <CompanyLayout activePage="applicants">
      <div style={{ width: isMobile ? "100%" : "fit-content", maxWidth: "100%" }}>
      {isMobile ? (
        <div className="co-topbar">
          <button className="co-jobdd" onClick={() => setJobSheetOpen(true)}>
            <span className="val">{jobFilterTitle || "전체 공고"}</span>
            <ChevronDown size={15} className="chev" />
          </button>
          <div className="co-statrow">
            {statCardsData.map((s) => (
              <button key={s.label} type="button"
                className={`co-stat ${statusFilter === s.status ? "on" : ""}`}
                onClick={() => setStatusFilter((cur) => (cur === s.status ? "전체" : s.status))}
                style={statusFilter === s.status ? { borderColor: s.color, background: "#faf7fd" } : undefined}>
                <span className="n" style={{ color: s.color }}>{s.value}</span>
                <span className="l">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="company-stat-grid">
          {statCardsData.map((s) => (
            <button key={s.label} type="button" className="company-stat-card"
              onClick={() => setStatusFilter((cur) => (cur === s.status ? "전체" : s.status))}
              style={{ cursor: "pointer", textAlign: "left", font: "inherit",
                border: statusFilter === s.status ? `1px solid ${s.color}` : undefined,
                background: statusFilter === s.status ? "#faf7fd" : undefined }}>
              <div className="company-stat-value" style={{color: s.color}}>
                {s.value}<span className="company-stat-unit">{s.unit}</span>
              </div>
              <div className="company-stat-label">{s.label}</div>
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
            <button className="admin-danger-btn" onClick={handleBulkHide}>
              <EyeOff size={15} /> 선택 삭제
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
            .co-stat .n { font-size: 16px; font-weight: 600 !important; line-height: 1; }
            .co-stat .l { font-size: 11px; color: #666; white-space: nowrap; }
            .co-mbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
            .co-mbar-count { font-size: 13.5px; color: #888; line-height: 1; position: relative; top: 2px; }
            .co-mbar-count strong { color: #1a1a1a; }
            .co-mbar-actions { display: flex; gap: 8px; }
            .co-mbar-btn { display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 12px; border-radius: 8px; border: 1px solid #e2e2e6; background: #fff; color: #444; font-size: 13.5px; font-weight: 500; cursor: pointer; }
            .co-mbar-btn.on { border-color: #582681; color: #582681; background: #f8f5fb; }
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
            ? "아직 지원자가 없어요."
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
            .co-li.on { border-color: #582681; background: #f8f5fb; }
            .co-li-r1 { display: flex; align-items: center; gap: 10px; }
            .co-li-namerow { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
            .co-li-nameinfo { display: flex; align-items: baseline; gap: 7px; min-width: 0; }
            .co-li-status { font-size: 12.5px; font-weight: 600; flex-shrink: 0; }
            .co-li-avatar { width: 40px; height: 40px; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: #582681; color: #fff; font-size: 17px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
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
                  onClick={() => selectMode ? toggleCheck(a.id) : setSelected(a)}>
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
        <div className="company-card">
          <div className="admin-table-meta">총 <strong>{filtered.length}</strong>명</div>
          <table className="company-table">
            <thead>
              <tr>
                <th style={{ width: "36px" }}>
                  <input type="checkbox"
                    checked={checked.length === filtered.length && filtered.length > 0}
                    onChange={toggleAll} />
                </th>
                <th>이름</th>
                <th>지원 공고</th>
                <th>지원일</th>
                <th>지역</th>
                <th>연락처</th>
                <th>상태</th>
                <th>이력서</th>
                <th>포트폴리오</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} style={{ background: checked.includes(a.id) ? "#f7f7f8" : "" }}>
                  <td style={{ textAlign: "center" }}>
                    <input type="checkbox"
                      checked={checked.includes(a.id)}
                      onChange={() => toggleCheck(a.id)} />
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div className="tbl-name-btn" title="이력서 보기" onClick={() => setSelected(a)}
                        style={{ display: "flex", alignItems: "center", gap: 10, width: 160, flexShrink: 0 }}>
                      <div className="talent-avatar" style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#582681", color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {(a as any).user_avatar_url
                          ? <img src={(a as any).user_avatar_url} alt={a.user_name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : (a.user_name || "?").slice(0, 1)}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span className="tbl-name-txt" style={{ color: "#1a1a1a", fontWeight: 400, fontSize: 15 }}>{a.user_name}</span>
                          {genderLabel((a as any).user_gender) && (
                            <span style={{ fontSize: 12, fontWeight: 400, color: "#999" }}>{genderLabel((a as any).user_gender)}</span>
                          )}
                          <button type="button" title={(a as any).scrapped ? "스크랩 해제" : "스크랩"}
                            onClick={(e) => { e.stopPropagation(); toggleScrap(a); }}
                            style={{ background: "none", border: "none", padding: 2, cursor: "pointer", display: "inline-flex", flexShrink: 0 }}>
                            {(a as any).scrapped
                                ? <BookmarkCheck size={15} style={{ color: "#582681" }} />
                                : <Bookmark size={15} style={{ color: "#c8c8c8" }} />}
                          </button>
                        </div>
                        <span style={{ fontSize: 13, color: "#888" }}>
                          {(() => {
                            const age = calcAge((a as any).user_birth_date);
                            const ct = (a as any).career_type;
                            const career = ct === "NEWCOMER"
                              ? "신입"
                              : (() => { const y = calcCareerYears((a as any).recent_start_date); return y ? `경력 ${y}` : "경력"; })();
                            return [age != null ? `${age}세` : null, career].filter(Boolean).join(" · ");
                          })()}
                        </span>
                      </div>
                    </div>
                    </div>
                  </td>
                  <td className="company-td-sub">
                    {a.job_title}
                    {isJobClosed(a) && <span style={{ marginLeft: 5, fontSize: 11, color: "#999", background: "#f2f2f4", borderRadius: 4, padding: "1px 5px" }}>마감</span>}
                  </td>
                  <td className="company-td-sub">
                    {formatDate(a.applied_at)}
                  </td>
                  <td className="company-td-sub">
                    {shortenRegion([(a as any).user_region_sido, (a as any).user_region_sigungu].filter(Boolean).join(" ")) || <span style={{ color: "#ccc" }}>—</span>}
                  </td>
                  <td className="company-td-sub">
                    <div style={{ marginBottom: 2, ...(a.user_email ? {} : { color: "#ccc" }) }}>
                      {a.user_email || "이메일 없음"}
                    </div>
                    <div style={a.user_phone ? undefined : { color: "#ccc" }}>
                      {a.user_phone ? formatPhone(a.user_phone) : "전화번호 없음"}
                    </div>
                  </td>
                  <td>
                    <span style={{ color: a.status === "APPLIED" ? "#0ea5e9" : a.status === "VIEWED" ? "#f59e0b" : a.status === "PASSED" ? "#10b981" : a.status === "REJECTED" ? "#e74c3c" : "#999", fontSize: 14 }}>
                      {a.status === "WITHDRAWN" ? "지원취소" : STATUS_LABEL[a.status]}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => setSelected(a)} title="이력서 보기"
                          style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: "#582681", fontSize: 14, fontWeight: 500, padding: 0 }}>
                          <FileText size={16} /><span>이력서</span>
                        </button>
                      </div>
                    </div>
                  </td>
                  {/* 작업물은 이력서와 성격이 달라 열을 나눈다 — 미용은 사진이 곧 경력이다. */}
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <LinkCell url={(a as any).portfolio_images?.[0]?.url ?? null} icon={<Paperclip size={14} />} label="포트폴리오" />
                      <LinkCell url={(a as any).sns_url} icon={<Instagram size={14} />} label="SNS" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* 선택 액션바 (모바일) */}
      {isMobile && selectMode && checked.length > 0 && (
        <div className="co-selbar">
          <span className="co-selbar-count">{checked.length}개 선택됨</span>
          <button className="co-selbar-del" onClick={handleBulkHide} aria-label="삭제">
            <Trash2 size={20} />
          </button>
        </div>
      )}

      {selected && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{maxWidth:"720px", maxHeight:"90vh", display:"flex", flexDirection:"column"}} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">{selected.user_name}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                {resumeData && (
                  <>
                    <button onClick={handleDownloadPdf} disabled={isDownloading} title="PDF 다운로드"
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, borderRadius: 8, border: "none", background: "none", color: "#582681", cursor: isDownloading ? "not-allowed" : "pointer", opacity: isDownloading ? 0.5 : 1 }}>
                      <Download size={20} />
                    </button>
                    <button onClick={handlePrint} title="인쇄"
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, borderRadius: 8, border: "none", background: "none", color: "#582681", cursor: "pointer" }}>
                      <Printer size={20} />
                    </button>
                  </>
                )}
                <button className="admin-modal-close" onClick={() => setSelected(null)}><X size={20} /></button>
              </div>
            </div>
            <div className="admin-modal-body">
              {/* ===== PDF 캡처 영역 (공용 지원서 문서) ===== */}
              {resumeLoading ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>불러오는 중...</div>
              ) : resumeData ? (
                <>
                <div style={{ margin: "-24px" }}>{/* admin-modal-body(24px) 4면 상쇄 → 문서 여백 40px로 통일 */}
                <ApplicationDocument
                  ref={previewRef}
                  coverLetter={coverLetter}
                  subtitle={selected.job_title}
                  resume={{
                    name: selected.user_name,
                    birthDisplay: detailInfo.birth ? `${new Date(detailInfo.birth).getFullYear()}년생` : "",
                    ageDisplay: calcAge(detailInfo.birth) != null ? `${calcAge(detailInfo.birth)}세` : "",
                    genderDisplay: genderLabel(detailInfo.gender) || "",
                    addressDisplay: [detailInfo.road, detailInfo.detail].filter(Boolean).join(" ") || [detailInfo.sido, detailInfo.sigungu].filter(Boolean).join(" "),
                    jobDisplay: "",
                    phone: selected.user_phone || "",
                    email: selected.user_email || "",
                    portfolioImages: (selected as any).portfolio_images || [],
                    avatarUrl: (selected as any).user_avatar_url || null,
                    resumeType: selected.user_job_type === "STORE" ? "salon" : "office",
                    ...mapResume(resumeData),
                  }}
                />
                </div>
                {/* 첨부 이력서 파일 배너: 화면에서만(클릭 다운로드), PDF/인쇄 캡처에는 제외. SHOW_RESUME_FILE_BANNER로 노출 제어 */}
                {SHOW_RESUME_FILE_BANNER && resumeFileInfo.url && (
                  <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "#f9f5fc", border: "1.5px solid #efeff1", borderRadius: "10px" }}>
                    <FileText size={22} color="#582681" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {resumeFileInfo.name || "첨부 이력서"}
                      </p>
                      <p style={{ fontSize: "13px", color: "#888", margin: "2px 0 0" }}>지원자가 첨부한 이력서 파일</p>
                    </div>
                    <a href={resumeFileInfo.url} target="_blank" rel="noopener noreferrer"
                      style={{ padding: "8px 14px", borderRadius: "8px", background: "#582681", color: "#fff", fontSize: "14px", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
                      다운로드
                    </a>
                  </div>
                )}
                </>
              ) : (
                <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>이력서 정보가 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </CompanyLayout>
  );
}

export default function CompanyApplicantsPage() {
  return (
    <Suspense fallback={<CompanyLayout activePage="applicants"><div /></CompanyLayout>}>
      <ApplicantsContent />
    </Suspense>
  );
}