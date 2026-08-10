"use client";
import { industryGroupsFor } from "@/lib/data/industries";
import { useState, useEffect, useRef, useCallback, type ChangeEvent, type ClipboardEvent, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronDown, Trash2, Upload, Eye, Save, MapPin, Briefcase, Building2, Clock, Users, Tag, GraduationCap, Settings } from "lucide-react";
import { shortRegion } from "@/lib/regionShort";
import JobDetailView from "@/components/jobs/JobDetailView";
import { formatSalaryWon } from "@/lib/salary";
import JobGroupField from "@/components/JobGroupField";
import RegionSelectModal from "@/components/RegionSelectModal";
import { REGIONS } from "@/lib/data/regions";

// 근무지역 인라인 자동완성용: "시도 시군구" 평탄화 목록
const ALL_REGIONS: string[] = REGIONS.flatMap((r) => r.sigungu.map((g) => `${r.sido} ${g}`));

const WORK_DAY_OPTIONS = ["월", "화", "수", "목", "금", "토", "일"];
const CAREER_OPTIONS = ["신입", "1년 이상", "2년 이상", "3년 이상", "5년 이상", "경력 무관"];
const EDUCATION_OPTIONS = ["학력무관", "고졸 이상", "초대졸 이상", "대졸 이상", "석사 이상"];
const EMPLOYMENT_TYPES = ["정규직", "계약직", "위촉직", "프리랜서", "인턴", "아르바이트", "협의"];
// 공고 이슈 메모에서 선택하는 문제 필드 목록(불러오기 파싱 오류를 어느 항목인지 특정)
const ISSUE_FIELDS = ["채용유형", "제목", "회사명", "모집분야(직군)", "경력", "학력", "마감일", "모집인원", "급여", "고용형태", "근무기간", "근무요일", "근무시간", "복리후생", "근무지역/주소", "담당자 연락처", "상단 배너", "상세요강 이미지", "포지션 소개", "자격요건", "우대사항", "회사 소개(기업정보)", "지원방식", "기타"];
const CONTACT_METHOD_OPTIONS = ["문자", "이메일", "전화", "온라인 지원", "홈페이지 지원"]; // 지원방법(복수)
const CONVERTIBLE_SUFFIX = " · 정규직 전환 가능"; // 계약직·인턴 하위 옵션
const WORK_PERIODS = ["~6개월", "6개월 ~ 1년", "1년 이상", "협의"];
// 복리후생 옵션은 DB 마스터(benefit_tags)로 이관 → /api/benefit-tags 에서 로드
const PRESET_PROCESS: Record<string, string[]> = {
  기업: ["서류전형", "전화면접", "1차 면접", "2차 면접", "과제전형", "최종합격"],
  매장: ["서류전형", "전화면접", "대면면접", "시술테스트", "최종합격"],
};

type Company = { id: string; company_name: string; brand_name: string | null };

type TextKey = "benefits" | "description" | "responsibilities" | "requirements" | "preferred";

export interface JobPostFormProps {
  mode: "company" | "admin";
  editId?: string | null;
  listHref: string;
  companyType?: "OFFICE" | "STORE" | "BOTH" | null;
  companies?: Company[];
  uploadImage: (file: File) => Promise<{ success: boolean; url?: string; name?: string; error?: string }>;
  onSubmit: (payload: any, status: "draft" | "publish", company: { companyId: string | null; newCompany: { company_name: string; brand_name: string } | null }) => Promise<{ success: boolean; error?: string; id?: string }>;
  loadEditData?: (editId: string) => Promise<any | null>;
  // 임시저장(DRAFT) 목록 로더 — 넘기면 상단에 "임시저장 목록" 노출(관리자 직접등록 전용)
  listDrafts?: () => Promise<Array<{ id: string; title: string; company_name?: string; created_at?: string }>>;
  initialFindQuery?: string; // 외부에서 전달된 초기 검색어(회사명/URL) — 검색창에 미리 채움
}

// 공고 상단 이미지(기업 커버) 표시 전용 배너 — 한 배너에 최대 3개 균등, 3개 초과 시 ▶로 회전
function CoverBanner({ images }: { images: string[] }) {
  const [start, setStart] = useState(0);
  if (!images.length) {
    return (
      <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", background: "#faf7fc", border: "1px dashed #e0d4ec", borderRadius: 10, color: "#b0a0c0", fontSize: 13 }}>
        기업설정에서 등록한 커버 이미지가 없어요.
      </div>
    );
  }
  const n = images.length;
  const visible = n <= 3 ? images : [0, 1, 2].map((i) => images[(start + i) % n]);
  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 0, borderRadius: 10, overflow: "hidden", border: "1px solid #eee" }}>
        {visible.map((u, i) => (
          <div key={`${start}-${i}`} style={{ flex: 1, minWidth: 0, aspectRatio: "4 / 3", background: "#f3f3f3" }}>
            <img src={u} alt={`커버 이미지 ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}
      </div>
      {n > 3 && (
        <button type="button" onClick={() => setStart((s) => (s + 1) % n)} aria-label="다음 이미지"
          style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.55)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}

export default function JobPostForm({
  mode, editId = null, listHref, companyType = null, companies = [],
  uploadImage, onSubmit, loadEditData, listDrafts, initialFindQuery = "",
}: JobPostFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  // 임시저장 목록(관리자 직접등록 전용) — 상단에서 이어쓰기
  const [drafts, setDrafts] = useState<Array<{ id: string; title: string; company_name?: string; created_at?: string }>>([]);
  const [draftMenuOpen, setDraftMenuOpen] = useState(false); // 임시저장 버튼 옆 드롭다운(목록)
  const draftMenuRef = useRef<HTMLDivElement>(null);
  const reloadDrafts = useCallback(() => {
    if (!listDrafts) return;
    listDrafts().then((d) => setDrafts(Array.isArray(d) ? d : [])).catch(() => {});
  }, [listDrafts]);
  useEffect(() => { reloadDrafts(); }, [reloadDrafts]);
  // ── 이 공고 이슈 메모(불러온 원문 URL에 매칭, DB 저장 → 클로드가 조회·수정) ──
  const [issueItems, setIssueItems] = useState<{ field: string; note: string }[]>([]);
  const [issueStatus, setIssueStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const issueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ── 전체 공고 이슈 개수/목록(상단 '🐞 이슈' 버튼 → 별도 페이지) ──
  const [issueList, setIssueList] = useState<{ url: string; title: string; items: { field: string; note: string }[] }[]>([]);
  const reloadIssueList = useCallback(() => {
    if (mode !== "admin") return;
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    fetch(`/api/admin/app-notes?list=jobissue`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) setIssueList(res.data.items || []); })
      .catch(() => {});
  }, [mode]);
  useEffect(() => { reloadIssueList(); }, [reloadIssueList]);
  useEffect(() => {
    if (!draftMenuOpen) return;
    const onDown = (e: MouseEvent) => { if (draftMenuRef.current && !draftMenuRef.current.contains(e.target as Node)) setDraftMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [draftMenuOpen]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // 최상단 헤더(알림종 옆)로 임시저장·미리보기 아이콘을 포탈
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHeaderSlot(document.getElementById("co-m-header-slot"));
  }, [isMobile]);

  // 기업설정에 등록한 커버 이미지(공고 상단 이미지) — 표시 전용
  const [coverImages, setCoverImages] = useState<string[]>([]);
  useEffect(() => {
    if (mode !== "company") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/company/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data?.cover_images)) {
          setCoverImages(res.data.cover_images.map((c: any) => c?.url).filter(Boolean));
        }
      })
      .catch(() => {});
  }, [mode]);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [showCompanyList, setShowCompanyList] = useState(false);
  const [nonMember, setNonMember] = useState(mode === "admin");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [nmContactEmail, setNmContactEmail] = useState("");
  const [nmHomepage, setNmHomepage] = useState("");
  const [applyMethod, setApplyMethod] = useState<"MANAGED" | "EMAIL" | "REDIRECT">("MANAGED");
  const [externalApplyUrl, setExternalApplyUrl] = useState("");
  const [nmDescription, setNmDescription] = useState("");
  const [nmAddress, setNmAddress] = useState("");
  const [nmIndustry, setNmIndustry] = useState("");
  const [nmSize, setNmSize] = useState("");
  const [nmFounded, setNmFounded] = useState("");
  const [nmRepresentative, setNmRepresentative] = useState("");
  const [nmPhone, setNmPhone] = useState("");
  const [bannerImages, setBannerImages] = useState<{ url: string; name: string }[]>([]); // 상단 배너(여러 장, 3장씩 회전)
  const [nmCoverUploading, setNmCoverUploading] = useState(false);
  const [nmManagerName, setNmManagerName] = useState("");
  const [nmManagerPhone, setNmManagerPhone] = useState("");
  const [contactMethods, setContactMethods] = useState<string[]>([]); // 지원방법: 문자·이메일·전화·온라인 지원(복수)
  const toggleContactMethod = (m: string) =>
    setContactMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]).sort((a, b) => CONTACT_METHOD_OPTIONS.indexOf(a) - CONTACT_METHOD_OPTIONS.indexOf(b)));
  const [contactMethodsOpen, setContactMethodsOpen] = useState(false);
  const contactMethodsRef = useRef<HTMLDivElement>(null);
  const [parseUrl, setParseUrl] = useState("");
  const [urlEditing, setUrlEditing] = useState(true); // 불러오기 후엔 URL을 링크로 표시(클릭 시 원문 새 창)
  const [importMode, setImportMode] = useState<"url" | "ocr">("url"); // 회사명/URL vs 화면 캡처(OCR)
  const [ocrFiles, setOcrFiles] = useState<File[]>([]); // OCR: 여러 장 캡처 누적
  const [parsing, setParsing] = useState(false);
  const [parseMsg, setParseMsg] = useState("");
  // 회사명으로 공고 찾기(헤어인잡)
  const [findQuery, setFindQuery] = useState(initialFindQuery);
  const [finding, setFinding] = useState(false);
  const [findMsg, setFindMsg] = useState("");
  const [findResults, setFindResults] = useState<{ idx: number; title: string; url: string; source: string }[]>([]);
  // 검색 목록에서 특정 공고를 불러오면 상단 입력칸 대신 '선택한 공고'를 링크로 표시(클릭 시 원문 새 탭)
  const [picked, setPicked] = useState<{ title: string; url: string; source?: string } | null>(null);
  // 이슈 메모: 불러온 원문 URL이 바뀌면 그 공고의 저장된 이슈를 불러온다.
  useEffect(() => {
    if (mode !== "admin" || !picked?.url) { setIssueItems([]); setIssueStatus("idle"); return; }
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    fetch(`/api/admin/app-notes?key=${encodeURIComponent(`jobissue:${picked.url}`)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) return;
        try { const v = JSON.parse(res.data.value || "{}"); setIssueItems(Array.isArray(v.items) ? v.items : []); }
        catch { setIssueItems([]); }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked?.url, mode]);
  // 이슈 메모 저장(디바운스) — 전체 목록을 원문 URL 키로 저장
  const saveIssues = (items: { field: string; note: string }[]) => {
    if (!picked?.url) return;
    setIssueStatus("saving");
    if (issueTimer.current) clearTimeout(issueTimer.current);
    const url = picked.url, title = picked.title;
    issueTimer.current = setTimeout(async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
        const res = await fetch(`/api/admin/app-notes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ key: `jobissue:${url}`, value: JSON.stringify({ title, items: items.filter((it) => it.field || it.note.trim()) }) }),
        });
        // fetch는 HTTP 400/500에도 예외를 안 던지므로 res.ok로 실제 성공 여부 판정(거짓 "저장됨" 방지)
        if (!res.ok) { setIssueStatus("error"); return; }
        setIssueStatus("saved");
        reloadIssueList(); // 상단 '이슈' 드롭다운 카운트·목록 갱신
      } catch { setIssueStatus("error"); }
    }, 600);
  };
  const updateIssues = (items: { field: string; note: string }[]) => { setIssueItems(items); saveIssues(items); };
  const [contactNotice, setContactNotice] = useState("");
  const [curating, setCurating] = useState(false);
  const [jobGroupType, setJobGroupType] = useState<"" | "기업" | "매장">("매장"); // 기본값 매장(관리자). 선택 전 직군·급여·복지 잠금 해제용
  const [categories, setCategories] = useState<string[]>([]);
  const [regionList, setRegionList] = useState<string[]>([]);
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [regionQuery, setRegionQuery] = useState("");
  const regionInlineRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    title: "", career: "", education: "",
    type: "", deadline: "", salary: "", description: "",
    requirements: "", preferred: "", benefits: "", responsibilities: "",
    headcount: "",
  });
  const [saved, setSaved] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false); // 임시저장 완료 표시(발행완료와 구분)
  const [alwaysOpen, setAlwaysOpen] = useState(false);
  const [detailImages, setDetailImages] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hiringProcess, setHiringProcess] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [benefitTags, setBenefitTags] = useState<string[]>([]);
  const [benefitTagOptions, setBenefitTagOptions] = useState<{ name: string; is_curated: boolean }[]>([]); // 복리후생 마스터(DB)
  const [benefitSearch, setBenefitSearch] = useState("");
  const [salaryNego, setSalaryNego] = useState(false);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [salaryDraft, setSalaryDraft] = useState("");
  const [salaryNegoDraft, setSalaryNegoDraft] = useState(false);
  const [salaryType, setSalaryType] = useState<string>("MONTHLY");     // ANNUAL/MONTHLY/WEEKLY/HOURLY
  const [salaryTypeDraft, setSalaryTypeDraft] = useState<string>("MONTHLY");
  const [salaryMax, setSalaryMax] = useState<string>("");             // 급여 상한(범위 공고). 단일이면 ""
  const salaryRef = useRef<HTMLDivElement>(null);
  // 급여 표시(범위면 "연봉 3,000만원 ~ 3,300만원")
  const fmtSalary = (): string => {
    if (salaryNego) return "급여 협의";
    const min = parseInt(String(form.salary).replace(/[^0-9]/g, "")) || 0;
    if (!min) return "급여 협의";
    const unit = (salaryType === "HOURLY" || salaryType === "DAILY") ? 1 : 10000;
    const base = formatSalaryWon(min * unit, salaryType);
    const max = parseInt(String(salaryMax).replace(/[^0-9]/g, "")) || 0;
    if (max > min) return `${base} ~ ${formatSalaryWon(max * unit, salaryType).replace(/^[^0-9]*/, "")}`;
    return base;
  };
  const applySalary = () => {
    setSalaryNego(salaryNegoDraft);
    setSalaryType(salaryTypeDraft);
    setSalaryMax(""); // 수동 입력 시 범위 초기화(단일 값)
    setForm({ ...form, salary: salaryNegoDraft ? "" : salaryDraft });
    setSalaryModalOpen(false);
  };
  // 신규 등록 시 채용유형에 맞춰 기본 급여유형 설정(편집·불러오기로 지정된 급여유형은 덮어쓰지 않음)
  const importSalaryRef = useRef(false);
  useEffect(() => {
    if (editId) return;
    if (!jobGroupType) return; // 미선택이면 급여유형 자동설정 보류(선택 시 설정)
    if (importSalaryRef.current) { importSalaryRef.current = false; return; }
    setSalaryType(jobGroupType === "매장" ? "MONTHLY" : "ANNUAL");
    // 오피스(기업)는 급여가 대부분 회사내규/면접 후 협의 → 협의를 기본값으로
    setSalaryNego(jobGroupType === "기업");
  }, [jobGroupType, editId]);
  useEffect(() => {
    if (!salaryModalOpen) return;
    const onDown = (e: MouseEvent) => {
      if (salaryRef.current && !salaryRef.current.contains(e.target as Node)) setSalaryModalOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [salaryModalOpen]);
  // 근무지역 인라인 자동완성: 바깥 클릭 시 닫기
  useEffect(() => {
    if (!regionOpen) return;
    const onDown = (e: MouseEvent) => {
      if (regionInlineRef.current && !regionInlineRef.current.contains(e.target as Node)) { setRegionOpen(false); setRegionQuery(""); }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [regionOpen]);
  const [deadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [deadlineDraft, setDeadlineDraft] = useState("");
  const [alwaysOpenDraft, setAlwaysOpenDraft] = useState(false);
  const deadlineRef = useRef<HTMLDivElement>(null);
  const applyDeadline = () => {
    setAlwaysOpen(alwaysOpenDraft);
    setForm({ ...form, deadline: alwaysOpenDraft ? "" : deadlineDraft });
    setDeadlineModalOpen(false);
  };
  useEffect(() => {
    if (!deadlineModalOpen) return;
    const onDown = (e: MouseEvent) => {
      if (deadlineRef.current && !deadlineRef.current.contains(e.target as Node)) setDeadlineModalOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [deadlineModalOpen]);
  const [imgModalOpen, setImgModalOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // 붙여넣기(Ctrl+V) 대상 표시 — 포커스된 드롭존을 강조해 어디로 붙는지 알려준다.
  const [pasteZone, setPasteZone] = useState<"banner" | "body" | null>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!imgModalOpen) return;
    const onDown = (e: MouseEvent) => {
      if (imgRef.current && !imgRef.current.contains(e.target as Node)) setImgModalOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [imgModalOpen]);
  const [welfareOpen, setWelfareOpen] = useState(false);
  const [workcondOpen, setWorkcondOpen] = useState(false);
  const welfareRef = useRef<HTMLDivElement>(null);
  const workcondRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!welfareOpen) return;
    const onDown = (e: MouseEvent) => {
      if (welfareRef.current && !welfareRef.current.contains(e.target as Node)) setWelfareOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [welfareOpen]);
  useEffect(() => {
    if (!workcondOpen) return;
    const onDown = (e: MouseEvent) => {
      if (workcondRef.current && !workcondRef.current.contains(e.target as Node)) setWorkcondOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [workcondOpen]);
  useEffect(() => {
    if (!contactMethodsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (contactMethodsRef.current && !contactMethodsRef.current.contains(e.target as Node)) setContactMethodsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [contactMethodsOpen]);
  // 근무 조건(매장직): 요일 / 시간 / 시간대
  const [workDays, setWorkDays] = useState<string[]>([]);
  const [workDaysNego, setWorkDaysNego] = useState(false);
  const [workDaysOpen, setWorkDaysOpen] = useState(false);
  const workDaysRef = useRef<HTMLDivElement>(null);
  const [workPeriod, setWorkPeriod] = useState(""); // 근무기간
  const [workPeriodOpen, setWorkPeriodOpen] = useState(false);
  const workPeriodRef = useRef<HTMLDivElement>(null);
  const [employOpen, setEmployOpen] = useState(false);
  const employRef = useRef<HTMLDivElement>(null);
  const [fullTimeConvertible, setFullTimeConvertible] = useState(false); // 계약직·인턴 → 정규직 전환 가능
  const [workTimeStart, setWorkTimeStart] = useState("");
  const [workTimeEnd, setWorkTimeEnd] = useState("");
  const [workTimeNego, setWorkTimeNego] = useState(false);
  const [workTimeOpen, setWorkTimeOpen] = useState(false);
  const workTimeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!workDaysOpen) return;
    const onDown = (e: MouseEvent) => { if (workDaysRef.current && !workDaysRef.current.contains(e.target as Node)) setWorkDaysOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [workDaysOpen]);
  useEffect(() => {
    if (!workTimeOpen) return;
    const onDown = (e: MouseEvent) => { if (workTimeRef.current && !workTimeRef.current.contains(e.target as Node)) setWorkTimeOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [workTimeOpen]);
  useEffect(() => {
    if (!workPeriodOpen) return;
    const onDown = (e: MouseEvent) => { if (workPeriodRef.current && !workPeriodRef.current.contains(e.target as Node)) setWorkPeriodOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [workPeriodOpen]);
  useEffect(() => {
    if (!employOpen) return;
    const onDown = (e: MouseEvent) => { if (employRef.current && !employRef.current.contains(e.target as Node)) setEmployOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [employOpen]);
  // 회사 소개 textarea 자동 높이(불러오기로 긴 내용이 채워져도 잘리지 않게)
  const nmDescRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = nmDescRef.current;
    if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }
  }, [nmDescription, nonMember]);
  const [showPreview, setShowPreview] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  useEffect(() => {
    if (!showPreview || mode !== "company" || companyProfile) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/company/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d?.success && d.data) setCompanyProfile(d.data); })
      .catch(() => {});
  }, [showPreview, mode, companyProfile]);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // ── 모달 상태 ──────────────────────────────
  const [textModalKey, setTextModalKey] = useState<TextKey | null>(null);
  const [textModalValue, setTextModalValue] = useState("");
  const textPopRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!textModalKey) return;
    const onDown = (e: MouseEvent) => {
      if (textPopRef.current && !textPopRef.current.contains(e.target as Node)) setTextModalKey(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [textModalKey]);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [processDraft, setProcessDraft] = useState<string[]>([]);
  const [processCustom, setProcessCustom] = useState("");
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesModalValue, setNotesModalValue] = useState("");
  const processPopRef = useRef<HTMLDivElement>(null);
  const notesPopRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!processModalOpen) return;
    const onDown = (e: MouseEvent) => {
      if (processPopRef.current && !processPopRef.current.contains(e.target as Node)) setProcessModalOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [processModalOpen]);
  useEffect(() => {
    if (!notesModalOpen) return;
    const onDown = (e: MouseEvent) => {
      if (notesPopRef.current && !notesPopRef.current.contains(e.target as Node)) setNotesModalOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [notesModalOpen]);

  useEffect(() => {
    // 타입 고정 기업회원은 자동 지정(잠금 없음). 관리자·BOTH는 미선택("")으로 시작해 직접 고르게 함.
    if (companyType === "BOTH") setJobGroupType("");
    else if (companyType === "STORE") setJobGroupType("매장");
    else if (companyType === "OFFICE") setJobGroupType("기업");
  }, [companyType]);

  useEffect(() => {
    if (!editId || !loadEditData) return;
    loadEditData(editId).then((j) => {
      if (!j) return;
      const career = j.experience_level === "NEW" ? "신입"
        : j.experience_level === "EXPERIENCED" ? "2년 이상" : "경력 무관";
      const rawType = j.employment_type
        || (j.work_type === "PART_TIME" ? "파트타임"
          : j.work_type === "CONTRACT" ? "계약직" : "정규직");
      // 저장된 "계약직 · 정규직 전환 가능" → 기본 고용형태 + 전환 체크 복원
      const convertible = typeof rawType === "string" && rawType.includes("정규직 전환 가능");
      const type = convertible ? rawType.replace(CONVERTIBLE_SUFFIX, "").trim() : rawType;
      setFullTimeConvertible(convertible);
      const loadedSalaryType = j.salary_type || (j.job_type === "STORE" ? "MONTHLY" : "ANNUAL");
      const salary = j.salary_min ? String(loadedSalaryType === "HOURLY" ? j.salary_min : j.salary_min / 10000) : "";
      setSalaryMax(j.salary_max && j.salary_max > j.salary_min ? String(loadedSalaryType === "HOURLY" ? j.salary_max : j.salary_max / 10000) : "");
      setSalaryType(loadedSalaryType);
      setForm({
        title: j.title || "", career, education: j.education || "", type,
        deadline: j.deadline ? String(j.deadline).slice(0, 10) : "",
        salary, description: j.description || "", requirements: j.requirements || "",
        preferred: j.preferred_qualifications || "", benefits: j.benefits || "",
        responsibilities: j.responsibilities || "",
        headcount: j.headcount != null ? String(j.headcount) : "",
      });
      setAlwaysOpen(!j.deadline);
      setCategories(j.categories || []);
      setRegionList(j.location ? String(j.location).split(",").map((s: string) => s.trim()).filter(Boolean) : []);
      setDetailImages(j.detail_images || []);
      setBannerImages(((j.cover_images && j.cover_images.length ? j.cover_images : j.company?.cover_images) || []).map((c: any) => ({ url: c?.url, name: "배너" })).filter((x: any) => x.url));
      setHiringProcess(j.hiring_process || []);
      setNotes(j.notes || "");
      setBenefitTags(j.benefit_tags || []);
      // 근무 조건 복원
      setWorkPeriod(j.work_period || "");
      if (j.work_days === "협의") { setWorkDaysNego(true); setWorkDays([]); }
      else { setWorkDaysNego(false); setWorkDays(j.work_days ? String(j.work_days).split(",").filter(Boolean) : []); }
      if (j.work_time === "협의") { setWorkTimeNego(true); setWorkTimeStart(""); setWorkTimeEnd(""); }
      else if (j.work_time && String(j.work_time).includes("~")) {
        const [st, en] = String(j.work_time).split("~");
        setWorkTimeNego(false); setWorkTimeStart(st || ""); setWorkTimeEnd(en || "");
      } else { setWorkTimeNego(false); setWorkTimeStart(""); setWorkTimeEnd(""); }
      setSalaryNego(!j.salary_min);
      if (j.job_type) setJobGroupType(j.job_type === "STORE" ? "매장" : "기업");
      if (j.company_id) setCompanyId(j.company_id);

      // 관리자 편집: 회원 공고면 회원 모드, 외부(비회원) 공고면 회사·담당자·지원방식 복원
      if (mode === "admin") {
        const isMemberJob = j.company?.is_member === true;
        setNonMember(!isMemberJob);
        if (!isMemberJob && j.company) {
          setNewCompanyName(j.company.company_name || "");
          setNewBrandName(j.company.brand_name || "");
          setNmDescription(j.company.description || "");
          setNmHomepage(j.company.website_url || "");
          setNmAddress(
            j.company.address ||
            [j.company.region_sido, j.company.region_sigungu].filter(Boolean).join(" ") ||
            ""
          );
          setNmIndustry(j.company.industry || "");
          setNmSize(j.company.company_size || "");
          setNmFounded(j.company.founded_year ? String(j.company.founded_year) : "");
          setNmRepresentative(j.company.representative_name || "");
          setNmPhone(j.company.company_phone || "");
        }
        setNmManagerName(j.external_contact_name || "");
        setNmManagerPhone(j.external_contact_phone || "");
        setNmContactEmail(j.external_contact_email || "");
        setContactMethods(Array.isArray(j.contact_methods) ? j.contact_methods : []);
        if (["MANAGED", "EMAIL", "REDIRECT"].includes(j.apply_method)) {
          setApplyMethod(j.apply_method === "EMAIL" ? "MANAGED" : j.apply_method);
        }
        setExternalApplyUrl(j.external_apply_url || "");
      }
    }).catch(console.error);
  }, [editId, loadEditData]);

  const showTypeToggle = mode === "admin" || companyType === "BOTH";
  // 채용유형 미선택(관리자·BOTH가 아직 안 고름) → 직군·급여·복지 입력 잠금
  const typeLocked = showTypeToggle && !jobGroupType;

  // ── 텍스트 모달 핸들러 ─────────────────────
  const openTextModal = (key: TextKey) => {
    setTextModalKey(key);
    setTextModalValue((form as any)[key] || "");
  };
  const saveTextModal = () => {
    if (textModalKey) setForm({ ...form, [textModalKey]: textModalValue });
    setTextModalKey(null);
  };

  // ── 채용절차 모달 핸들러 ───────────────────
  const openProcessModal = () => {
    setProcessDraft([...hiringProcess]);
    setProcessCustom("");
    setProcessModalOpen(true);
  };
  const togglePreset = (p: string) =>
    setProcessDraft((d) => (d.includes(p) ? d.filter((x) => x !== p) : [...d, p]));
  const addCustomStep = () => {
    const v = processCustom.trim();
    if (!v) return;
    if (processDraft.includes(v)) { setProcessCustom(""); return; }
    if (processDraft.length >= 8) { alert("채용 절차는 최대 8단계까지 추가할 수 있어요."); return; }
    setProcessDraft([...processDraft, v]);
    setProcessCustom("");
  };
  const removeDraftStep = (idx: number) =>
    setProcessDraft(processDraft.filter((_, i) => i !== idx));
  const saveProcessModal = () => {
    setHiringProcess(processDraft.map((s) => s.trim()).filter(Boolean));
    setProcessModalOpen(false);
  };

  // ── 비고 모달 핸들러 ───────────────────────
  const openNotesModal = () => { setNotesModalValue(notes); setNotesModalOpen(true); };
  const saveNotesModal = () => { setNotes(notesModalValue); setNotesModalOpen(false); };

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    if (detailImages.length + files.length > 12) {
      alert("상세 이미지는 최대 12장까지 첨부할 수 있습니다."); return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const r = await uploadImage(file);
        if (r.success && r.url) {
          setDetailImages((prev) => [...prev, { url: r.url!, name: r.name || file.name }]);
        } else {
          alert(r.error || "이미지 업로드에 실패했습니다.");
        }
      }
    } finally {
      setUploading(false);
    }
  };
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    await processFiles(e.target.files || []);
    e.target.value = "";
  };
  // 클립보드(Ctrl+V)에 담긴 이미지 파일 추출 — 스크린샷·복사한 이미지 붙여넣기 지원(드롭존이 포커스일 때)
  const imagesFromClipboard = (e: ClipboardEvent): File[] => {
    const items = e.clipboardData?.items ? Array.from(e.clipboardData.items) : [];
    const out: File[] = [];
    for (const it of items) {
      if (it.kind === "file" && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) out.push(f);
      }
    }
    return out;
  };
  // 비회원 기업 로고/커버 단일 업로드
  const uploadSingle = async (file: File, setUrl: (u: string) => void, setBusy: (b: boolean) => void) => {
    setBusy(true);
    try {
      const r = await uploadImage(file);
      if (r.success && r.url) setUrl(r.url);
      else alert(r.error || "이미지 업로드에 실패했습니다.");
    } finally { setBusy(false); }
  };

  const removeImage = (idx: number) =>
    setDetailImages((prev) => prev.filter((_, i) => i !== idx));

  // ── 배너(bannerImages) ↔ 상세 이미지(detailImages) 드래그 이동/재정렬 ──
  const imgDragRef = useRef<{ zone: "banner" | "body"; idx: number } | null>(null);
  const dropToBanner = (dropIdx: number | null = null) => {
    const src = imgDragRef.current; imgDragRef.current = null;
    if (!src) return;
    if (src.zone === "banner") {
      // 배너 내 재정렬
      if (dropIdx == null || dropIdx === src.idx) return;
      const arr = [...bannerImages];
      const [it] = arr.splice(src.idx, 1);
      arr.splice(dropIdx > src.idx ? dropIdx - 1 : dropIdx, 0, it);
      setBannerImages(arr);
    } else {
      // 본문 → 배너
      if (bannerImages.length >= 10) { alert("배너는 최대 10장까지예요."); return; }
      const body = [...detailImages];
      const moved = body[src.idx]; if (!moved) return;
      body.splice(src.idx, 1);
      const arr = [...bannerImages];
      if (dropIdx == null) arr.push(moved); else arr.splice(dropIdx, 0, moved);
      setDetailImages(body);
      setBannerImages(arr);
    }
  };
  const dropToBody = (dropIdx: number | null = null) => {
    const src = imgDragRef.current; imgDragRef.current = null;
    if (!src) return;
    if (src.zone === "body") {
      // 본문 내 재정렬
      if (dropIdx == null || dropIdx === src.idx) return;
      const arr = [...detailImages];
      const [it] = arr.splice(src.idx, 1);
      arr.splice(dropIdx > src.idx ? dropIdx - 1 : dropIdx, 0, it);
      setDetailImages(arr);
    } else {
      // 배너 → 본문
      const arr = [...bannerImages];
      const moved = arr[src.idx]; if (!moved) return;
      arr.splice(src.idx, 1);
      const body = [...detailImages];
      if (dropIdx == null) body.push(moved); else body.splice(dropIdx, 0, moved);
      setBannerImages(arr);
      setDetailImages(body);
    }
  };
  // 배너 직접 업로드(여러 장 추가)
  const addBannerFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    if (bannerImages.length + files.length > 10) { alert("배너는 최대 10장까지예요."); return; }
    setNmCoverUploading(true);
    try {
      for (const file of files) {
        const r = await uploadImage(file);
        if (r.success && r.url) setBannerImages((prev) => [...prev, { url: r.url!, name: r.name || file.name }]);
        else alert(r.error || "이미지 업로드에 실패했습니다.");
      }
    } finally { setNmCoverUploading(false); }
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight, position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`${form.title || "채용공고"}.pdf`);
    } catch { alert("다운로드 중 오류가 발생했습니다."); }
    finally { setIsDownloading(false); }
  };

  const handlePrint = async () => {
    if (!previewRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      const imgData = canvas.toDataURL("image/png");
      const w = window.open();
      if (w) w.document.write(`<html><head><title>채용공고 인쇄</title></head><body style="margin:0"><img src="${imgData}" style="width:100%" onload="window.print();window.close()" /></body></html>`);
    } catch { alert("인쇄 준비 중 오류가 발생했습니다."); }
  };

  const lbl: React.CSSProperties = { fontSize: 14, fontWeight: 500, color: "#444", marginBottom: 6 };
  const inp: React.CSSProperties = { width: "100%", height: 44, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", fontSize: 14, boxSizing: "border-box", background: "#fff" };
  // 셀렉트: 네이티브 회색 배경 제거 → 인풋과 동일한 흰 배경 + 커스텀 화살표
  const sel: React.CSSProperties = { ...inp, appearance: "none", WebkitAppearance: "none", MozAppearance: "none", paddingRight: 34, backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" };
  // 빈 값 자리엔 흐린 회색 플레이스홀더 텍스트(칩·배경 없음). 채워지면 평체 텍스트로 노출.
  // 기업정보처럼 목록에서 고르는 항목은 '선택'(기본), 값을 직접 적는 항목은 '입력'.
  // 빈 값 자리엔 텍스트 없이 화이트톤 연보라 하이라이트 블록으로 통일(4글자 폭·텍스트 높이, 고정 px).
  const PH_BG = "#f8f6fd"; // 거의 화이트에 가까운 아주 연한 연보라
  const pick = (_label?: string) => (
    <span style={{ display: "inline-block", width: 56, height: 20, borderRadius: 5, background: PH_BG, verticalAlign: "middle" }} />
  );
  // 네이티브 셀렉트(경력·학력·고용형태·근무기간)도 동일 규격. 값 유무와 무관하게 높이·글자크기 고정으로 '입력 시 커짐' 방지.
  const emptySel = (filled: boolean): CSSProperties => ({
    fontSize: 15, lineHeight: "20px", height: 20,
    background: filled ? "transparent" : PH_BG,
    borderRadius: filled ? 0 : 5,
    width: filled ? "auto" : 56,
  });
  // 불러온 데이터(d)를 폼 각 필드에 반영 — URL 불러오기·OCR이 공용으로 사용
  const applyParsed = (d: any) => {
      // ── 불러오기는 '새 소스로 통째 교체' ── 다른 공고로 갈아탈 때 이전 값(이미지·지역·회사정보 등)이
      //    섞이지 않도록, 소스가 값을 주지 않는 항목도 먼저 비우고 시작한다.
      setBannerImages([]); setDetailImages([]);
      setRegionList([]);
      setBenefitTags([]); setHiringProcess([]); setCategories([]);
      setWorkPeriod(""); setWorkDays([]); setWorkDaysNego(false);
      setWorkTimeStart(""); setWorkTimeEnd(""); setWorkTimeNego(false);
      setSalaryNego(false); setSalaryMax(""); setNotes("");
      if (mode === "admin") {
        setNewCompanyName(""); setNewBrandName(""); setNmHomepage(""); setNmContactEmail("");
        setNmDescription(""); setNmAddress(""); setNmIndustry("");
        setNmSize(""); setNmFounded("");
        setNmRepresentative(""); setNmPhone("");
        setNmManagerName(""); setNmManagerPhone("");
      }
      // 회사 정보(회사명·홈페이지·이메일·주소·소개·업종·지원방식)는 관리자 비회원 입력에만 채움.
      // 기업회원은 자기 프로필을 쓰되, 불러온 값이 있으면 우선 반영(레이아웃 편집 단계에서 필드로 노출 예정).
      if (mode === "admin") {
        if (d.company_name) setNewCompanyName(d.company_name);
        if (d.homepage_url) setNmHomepage(d.homepage_url);
        // 담당자 연락처는 '관리자 확인용'으로만 저장(구직자 비노출). 파싱값이 있으면 채워둔다.
        if (d.contact_email) setNmContactEmail(d.contact_email);
        if (d.contact_phone) setNmManagerPhone(d.contact_phone);
        if (d.contact_name) setNmManagerName(d.contact_name);
        // 비회원 외부 불러오기는 '관리자 대행'만 사용 → 파싱값과 무관하게 MANAGED 고정
        setApplyMethod("MANAGED");
        if (d.company_description) setNmDescription(d.company_description);
        if (d.address) setNmAddress(d.address);
        if (d.industry) setNmIndustry(d.industry);
        // 설립연도·사원수(기업정보) — 잡코리아 회사 소개에서 파싱된 값
        if (d.founded_year && Number(d.founded_year) > 1900) setNmFounded(String(Number(d.founded_year)));
        if (typeof d.company_size === "string" && d.company_size.trim()) setNmSize(d.company_size.trim());
        if (d.representative_name) setNmRepresentative(d.representative_name);
        if (d.company_phone) setNmPhone(d.company_phone);
        // 이미지는 "외부공고에 보이는 순서 그대로" 반영.
        //  - 갤러리(d.images)가 있으면 그걸 그대로 사용(첫 장=커버, 나머지=상세).
        //  - 없으면 대표 이미지(og:image)라도 커버로.
        const imgs: string[] = Array.isArray(d.images) ? d.images.filter(Boolean) : [];
        // 포스터형 공고(뷰티잡 등): 서버가 detail_images로 내려줌 → 배너 없이 상세 본문 이미지로 배치.
        const detailImgs: string[] = Array.isArray(d.detail_images) ? d.detail_images.filter(Boolean) : [];
        if (detailImgs.length) {
          setDetailImages(detailImgs.slice(0, 12).map((u, i) => ({ url: u, name: `이미지 ${i + 1}` })));
          // 파서가 배너용 이미지(매장 사진 등)를 함께 내려주면 전부 상단 배너로.
          if (imgs.length) setBannerImages(imgs.slice(0, 10).map((u) => ({ url: u, name: "배너" })));
        } else {
          const cover = imgs[0] || d.cover_image || "";
          // 기본 배분: 첫 이미지=배너(1장), 나머지=상세 본문. (관리자가 폼에서 드래그로 조정)
          if (cover) setBannerImages([{ url: cover, name: "배너" }]);
          if (imgs.length > 1) {
            setDetailImages(imgs.slice(1, 12).map((u, i) => ({ url: u, name: `이미지 ${i + 1}` })));
          }
        }
      }
      // 채용유형: 토글이 열려 있을 때만(관리자 또는 BOTH 기업) 불러온 값으로 변경. 타입 고정 기업회원은 유지.
      if (d.job_type && showTypeToggle) setJobGroupType(d.job_type === "STORE" ? "매장" : "기업");
      if (Array.isArray(d.hiring_process) && d.hiring_process.length) setHiringProcess(d.hiring_process);
      // 직군(칩) — 서버가 공식 목록에 맞춰 골라줌
      if (Array.isArray(d.job_categories) && d.job_categories.length) setCategories(d.job_categories);
      // 근무지역 — "시도 시군구" 형식 그대로 반영
      if (d.region) setRegionList([d.region]);
      // 복리후생·근무조건 태그(칩)
      if (Array.isArray(d.benefit_tags) && d.benefit_tags.length) setBenefitTags(d.benefit_tags);
      // 마감일: 상시채용이면 토글 ON, 아니면 날짜 세팅
      const isAlways = d.always_open === true || (!d.deadline);
      setAlwaysOpen(isAlways);
      // 불러온 본문 자동 정렬: 원문 HTML에서 <p>·<br>가 줄바꿈으로 변환되며 줄 사이 빈 줄(엔터 여러 번)이 잔뜩 끼는데,
      // 이걸 그대로 두면 상세요강 행간이 과하게 벌어진다. → 줄 끝 공백 제거 + 빈 줄 모두 제거(단일 행간)로 정돈.
      const tidyText = (s: string) => s
        .replace(/\r\n?/g, "\n")
        .split("\n").map((l) => l.replace(/\s+$/g, "")).join("\n")
        .replace(/\n{2,}/g, "\n")
        .trim();
      // 텍스트 필드가 배열로 와도 안전하게 문자열로 변환 + 행간 정돈
      const asText = (v: any, fb: string) => {
        if (Array.isArray(v)) { const j = v.filter(Boolean).join("\n"); return j ? tidyText(j) : fb; }
        return (typeof v === "string" && v.trim()) ? tidyText(v) : fb;
      };
      // 불러오기는 '새 소스로 통째 교체' → 소스에 없는 항목은 이전 불러오기 잔여값을 남기지 않고 비운다.
      setForm((f) => ({
        ...f,
        title: d.title || "",
        description: asText(d.description, ""),
        deadline: isAlways ? "" : (d.deadline || ""),
        requirements: asText(d.requirements, ""),
        preferred: asText(d.preferred, ""),
        benefits: asText(d.benefits, ""),
        responsibilities: asText(d.main_duties, ""),
        career: (CAREER_OPTIONS.includes(d.career) ? d.career : ""),
        education: (EDUCATION_OPTIONS.includes(d.education) ? d.education : ""),
        type: (["정규직", "파트타임", "계약직"].includes(d.employment_type) ? d.employment_type : ""),
        headcount: (d.headcount != null && Number(d.headcount) > 0) ? String(Number(d.headcount)) : "",
      }));
      // 급여: 구조화된 값이 있으면 급여 필드에 반영, 협의/비율제면 '협의' 처리
      const salaryStructured = Number(d.salary_amount) > 0 && ["ANNUAL", "MONTHLY", "WEEKLY", "HOURLY"].includes(d.salary_type);
      if (salaryStructured) {
        importSalaryRef.current = true; // 매장 기본값(월급) useEffect가 이 값을 덮어쓰지 않게
        setSalaryType(d.salary_type);
        setSalaryNego(false);
        setForm((f) => ({ ...f, salary: String(Number(d.salary_amount)) }));
        setSalaryMax(Number(d.salary_amount_max) > Number(d.salary_amount) ? String(Number(d.salary_amount_max)) : "");
      } else if (d.salary_negotiable) {
        setSalaryNego(true);
        setSalaryMax("");
        setForm((f) => ({ ...f, salary: "" }));
      }
      // 근무기간 (매장 공고)
      if (typeof d.work_period === "string" && WORK_PERIODS.includes(d.work_period)) setWorkPeriod(d.work_period);
      // 근무요일 (매장 공고에 주로 필요)
      if (d.work_days === "협의") { setWorkDaysNego(true); setWorkDays([]); }
      else if (typeof d.work_days === "string" && d.work_days.trim()) {
        const parsed: string[] = (d.work_days as string).split(/[,\s·]+/).map((s) => s.trim()).filter((x) => WORK_DAY_OPTIONS.includes(x));
        const days: string[] = [...new Set(parsed)].sort((a, b) => WORK_DAY_OPTIONS.indexOf(a) - WORK_DAY_OPTIONS.indexOf(b));
        if (days.length) { setWorkDaysNego(false); setWorkDays(days); }
      }
      // 근무시간
      if (d.work_time === "협의") { setWorkTimeNego(true); setWorkTimeStart(""); setWorkTimeEnd(""); }
      else if (typeof d.work_time === "string") {
        const m = d.work_time.trim().match(/^(\d{1,2}):(\d{2})\s*~\s*(\d{1,2}):(\d{2})$/);
        if (m) { setWorkTimeNego(false); setWorkTimeStart(`${m[1].padStart(2, "0")}:${m[2]}`); setWorkTimeEnd(`${m[3].padStart(2, "0")}:${m[4]}`); }
      }
      const extraLines = [(!salaryStructured && d.salary) ? `급여: ${d.salary}` : "", d.extra_notes || ""].filter(Boolean).join("\n\n");
      if (extraLines) setNotes(extraLines);
      {
        const c: string[] = [];
        if (d.contact_phone) c.push(`전화 ${d.contact_phone}`);
        if (d.contact_email) c.push(`이메일 ${d.contact_email}`);
        setContactNotice(c.length
          ? `📞 본문에서 연락처를 찾아 ‘채용 담당자’에 넣었어요 (${c.join(" · ")}). 지원방식(관리자 대행·이메일 중계·외부 링크)을 이 연락처 기준으로 확인해 정하세요.`
          : "");
      }
      if (d.ai_parsed) {
        setParseMsg("✓ 불러왔어요. 직군·경력·지역·급여·근무조건·이미지까지 자동 반영했어요. 값만 확인하고 등록하세요.");
      } else {
        setParseMsg("⚠ AI 자동 정리에 실패해 제목·회사 등 기본 정보만 채웠어요. 다른 URL을 넣거나 OCR(화면 캡처)로 다시 시도해보세요.");
      }
  };

  const runParse = async (urlOverride?: string) => {
    const useUrl = (typeof urlOverride === "string" ? urlOverride : parseUrl).trim();
    if (!useUrl) { setParseMsg("공고 URL을 입력해주세요."); return; }
    if (mode === "admin") { setNonMember(true); setCompanyId(null); }
    setParsing(true); setParseMsg(""); setContactNotice("");
    try {
      // 관리자는 admin_token, 기업회원은 access_token 사용
      const token = mode === "admin" ? localStorage.getItem("admin_token") : localStorage.getItem("access_token");
      const res = await fetch("/api/admin/external-jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: useUrl }),
      });
      const j = await res.json();
      if (!j.success) { setParseMsg(j.error?.message || "불러오기에 실패했어요."); return; }
      applyParsed(j.data);
      if (useUrl) { setParseUrl(useUrl); setUrlEditing(false); } // 불러오기 성공 → URL을 링크로 표시
    } catch { setParseMsg("오류가 발생했습니다."); }
    finally { setParsing(false); }
  };

  // OCR: 공고 화면 캡처 이미지를 업로드→서버가 비전(Haiku)으로 읽어 폼에 반영
  const runOcr = async (file: File) => {
    if (!file) return;
    if (mode === "admin") { setNonMember(true); setCompanyId(null); }
    setParsing(true); setParseMsg(""); setContactNotice("");
    try {
      const up = await uploadImage(file);
      if (!up.success || !up.url) { setParseMsg(up.error || "이미지 업로드에 실패했어요."); return; }
      const token = mode === "admin" ? localStorage.getItem("admin_token") : localStorage.getItem("access_token");
      const res = await fetch("/api/admin/external-jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image_url: up.url }),
      });
      const j = await res.json();
      if (!j.success) { setParseMsg(j.error?.message || "이미지 인식에 실패했어요."); return; }
      applyParsed(j.data);
    } catch { setParseMsg("오류가 발생했습니다."); }
    finally { setParsing(false); }
  };

  // OCR 다중: 여러 장의 캡처를 업로드해 한 번에 인식(위→아래 순서 유지)
  const runOcrMulti = async (files: File[]) => {
    if (!files.length) return;
    if (mode === "admin") { setNonMember(true); setCompanyId(null); }
    setParsing(true); setParseMsg(""); setContactNotice("");
    try {
      const urls: string[] = [];
      for (const f of files) {
        const up = await uploadImage(f);
        if (up.success && up.url) urls.push(up.url);
      }
      if (!urls.length) { setParseMsg("이미지 업로드에 실패했어요."); return; }
      const token = mode === "admin" ? localStorage.getItem("admin_token") : localStorage.getItem("access_token");
      const res = await fetch("/api/admin/external-jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image_urls: urls }),
      });
      const j = await res.json();
      if (!j.success) { setParseMsg(j.error?.message || "이미지 인식에 실패했어요."); return; }
      applyParsed(j.data);
      setParseMsg(`✓ ${urls.length}장 인식 완료`);
      setOcrFiles([]);
    } catch { setParseMsg("오류가 발생했습니다."); }
    finally { setParsing(false); }
  };

  // 회사명으로 헤어인잡 공고 조회 → 결과에서 '불러오기'로 자동 파싱 연결
  const runFindByCompany = async () => {
    const q = findQuery.trim();
    if (!q) { setFindMsg("회사명을 입력해주세요."); return; }
    setFinding(true); setFindMsg(""); setFindResults([]);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/external-jobs/find-by-company?company=${encodeURIComponent(q)}&maxPages=5`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const j = await res.json();
      if (!j.success) { setFindMsg(j.error || "조회에 실패했어요."); return; }
      const jobs = (j.jobs || []) as { idx: number; title: string; url: string; source: string }[];
      setFindResults(jobs);
      setFindMsg(jobs.length ? `${jobs.length}건 찾았어요. 공고를 선택하면 자동으로 불러와요.` : "일치하는 공고가 없어요. (헤어인잡 기준)");
    } catch {
      setFindMsg("조회 중 오류가 발생했어요.");
    } finally { setFinding(false); }
  };

  // 검색 목록에서 라디오로 공고를 '선택'만 함 → 상단 검색칸에 제목 표시. 실제 불러오기는 상단 '불러오기' 버튼에서.
  const selectFoundJob = (r: { title: string; url: string; source?: string }) => {
    setPicked({ title: r.title, url: r.url, source: r.source });
    setFindQuery(r.title);
  };

  // 통합 검색: 입력값이 URL 형태면 바로 불러오기, 아니면 회사명으로 공고 검색
  const isUrlLike = (s: string) =>
    /^https?:\/\//i.test(s) || /^www\./i.test(s) || /[a-z0-9가-힣-]+\.[a-z]{2,}(\/|\?|:|$)/i.test(s);
  const runImport = () => {
    const q = findQuery.trim();
    if (!q) { setFindMsg("회사명 또는 공고 URL을 입력해주세요."); return; }
    // 목록에서 라디오로 고른 공고가 있으면(입력칸을 손대지 않았으면) 그 공고를 불러옴
    if (picked && q === picked.title.trim()) { setFindResults([]); setFindMsg(""); setParseUrl(picked.url); runParse(picked.url); return; }
    if (isUrlLike(q)) { setFindResults([]); setFindMsg(""); setParseUrl(q); setPicked({ title: q, url: q.startsWith("http") ? q : `https://${q}` }); runParse(q); }
    else { setPicked(null); runFindByCompany(); }
  };
  // ?url= 로 진입(예: 이슈 페이지의 '불러와 수정')하면 그 원문을 자동으로 한 번 불러온다.
  const autoRanRef = useRef(false);
  useEffect(() => {
    if (autoRanRef.current || editId) return;
    const q = (initialFindQuery || "").trim();
    if (q && isUrlLike(q)) { autoRanRef.current = true; runImport(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFindQuery, editId]);

  // 큐레이션(관리자 전용): 현재 채워진 내용을 뷰티워크 톤·형식으로 AI가 다듬기
  const runCurate = async () => {
    const hasAny = [form.title, nmDescription, form.description, form.responsibilities, form.requirements, form.preferred, form.benefits, notes].some((v) => (v || "").trim());
    if (!hasAny) { setParseMsg("먼저 공고 내용을 채워주세요."); return; }
    setCurating(true); setParseMsg("");
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/external-jobs/curate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title, company_description: nmDescription,
          description: form.description, responsibilities: form.responsibilities,
          requirements: form.requirements, preferred: form.preferred,
          benefits: form.benefits, notes,
          job_type: jobGroupType === "기업" ? "OFFICE" : "STORE",
        }),
      });
      const j = await res.json();
      if (!j.success) { setParseMsg(j.error?.message || "큐레이션에 실패했어요."); return; }
      const d = j.data;
      if (!d.curated) { setParseMsg("⚠ 큐레이션에 실패했어요. 잠시 후 다시 시도해주세요."); return; }
      setForm((f) => ({
        ...f,
        title: d.title || f.title,
        description: d.description || f.description,
        responsibilities: d.responsibilities || f.responsibilities,
        requirements: d.requirements || f.requirements,
        preferred: d.preferred || f.preferred,
        benefits: d.benefits || f.benefits,
      }));
      if (typeof d.company_description === "string" && d.company_description.trim()) setNmDescription(d.company_description);
      if (typeof d.notes === "string" && d.notes.trim()) setNotes(d.notes);
      setParseMsg("✓ 큐레이션 완료 — 내용을 뷰티워크 톤으로 다듬었어요. 확인 후 등록하세요.");
    } catch { setParseMsg("오류가 발생했습니다."); }
    finally { setCurating(false); }
  };

  const handleSubmit = async (status: "draft" | "publish") => {
    // 비회원(관리자 대행) 공고는 관리자가 자유롭게 대행 등록 → 필수 검증 없이 등록 허용.
    const isNmAdmin = mode === "admin" && nonMember;
    if (mode === "admin" && !nonMember && !companyId) { alert("기업을 선택해주세요."); return; }
    if (!isNmAdmin) {
      if (showTypeToggle && !jobGroupType) { alert("채용유형(매장/오피스)을 선택해주세요."); return; }
      if (!form.title.trim()) { alert("공고 제목을 입력해주세요."); return; }
      if (categories.length === 0) { alert("모집분야를 선택해주세요."); return; }
      if (!form.headcount) { alert("모집인원을 입력해주세요."); return; } // 경력은 선택
      if (regionList.length === 0) { alert("근무지역을 선택해주세요."); return; }
      // 근무조건 필수(발행 시). 급여는 값 또는 '협의' 체크로 충족.
      if (status === "publish") {
        if (!(salaryNego || form.salary.trim())) { alert("급여를 입력하거나 협의로 선택해주세요."); return; }
        if (!form.type) { alert("고용형태를 선택해주세요."); return; }
        if (jobGroupType === "매장") {
          if (!(workDaysNego || workDays.length)) { alert("근무요일을 선택해주세요."); return; }
          if (!(workTimeNego || (workTimeStart && workTimeEnd))) { alert("근무시간을 입력해주세요."); return; }
          // 매장: 상세요강 이미지 또는 (포지션 소개+자격요건)
          if (detailImages.length === 0 && (!form.description?.trim() || !form.requirements?.trim())) {
            alert("상세요강 이미지를 1장 이상 첨부하거나,\n이미지가 없으면 포지션 소개와 자격요건을 입력해주세요.");
            return;
          }
        } else {
          // 오피스: 경력·학력 필수 / 담당업무·자격요건은 상세 이미지가 없을 때만 필수(디자인 템플릿형 공고 대응)
          if (!form.career) { alert("경력을 선택해주세요."); return; }
          if (!form.education) { alert("학력을 선택해주세요."); return; }
          if (detailImages.length === 0) {
            if (!form.responsibilities?.trim()) { alert("담당업무를 입력하거나 상세요강 이미지를 첨부해주세요."); return; }
            if (!form.requirements?.trim()) { alert("자격요건을 입력하거나 상세요강 이미지를 첨부해주세요."); return; }
          }
        }
        if (benefitTags.length === 0) { alert("복리후생을 1개 이상 선택해주세요."); return; }
      }
      // 마감일: 날짜 선택 또는 상시채용 필수
      if (status === "publish" && !alwaysOpen && !form.deadline) {
        alert("마감일을 선택하거나 상시채용을 체크해주세요.");
        return;
      }
    }

    const expLevel = form.career.includes("신입") ? "NEW"
      : form.career.match(/\d+년/) ? "EXPERIENCED" : "ANY";
    const workType = form.type === "파트타임" ? "PART_TIME"
      : form.type === "계약직" ? "CONTRACT" : "FULL_TIME";
    let salaryMin: number | null = null;
    let salaryMaxVal: number | null = null;
    if (!salaryNego && form.salary) {
      const n = parseInt(String(form.salary).replace(/[^0-9]/g, ""));
      const wonUnit = (salaryType === "HOURLY" || salaryType === "DAILY");
      if (n > 0) salaryMin = wonUnit ? n : n * 10000;
      const mx = parseInt(String(salaryMax).replace(/[^0-9]/g, "")) || 0;
      if (mx > n) salaryMaxVal = wonUnit ? mx : mx * 10000;
    }

    const payload: any = {
      title: form.title,
      job_type: jobGroupType === "기업" ? "OFFICE" : "STORE",
      description: form.description || null,
      requirements: form.requirements || null,
      preferred_qualifications: form.preferred || null,
      benefits: form.benefits || null,
      responsibilities: form.responsibilities || null,
      education: form.education || null,
      salary_min: salaryMin, salary_max: salaryMaxVal,
      salary_type: salaryMin ? salaryType : null,
      location: regionList.join(", ") || null,
      work_type: workType,
      employment_type: form.type + ((fullTimeConvertible && (form.type === "계약직" || form.type === "인턴")) ? CONVERTIBLE_SUFFIX : ""),
      experience_level: expLevel,
      benefit_tags: benefitTags,
      work_period: workPeriod || null,
      work_days: workDaysNego ? "협의" : (workDays.length ? workDays.join(",") : null),
      work_time: workTimeNego ? "협의" : (workTimeStart && workTimeEnd ? `${workTimeStart}~${workTimeEnd}` : null),
      work_time_slots: null,
      deadline: form.deadline || null,
      headcount: form.headcount ? parseInt(form.headcount, 10) : null,
      categories,
      detail_images: detailImages,
      hiring_process: hiringProcess.filter((s) => s.trim()),
      notes: notes.trim() || null,
      apply_method: applyMethod,
      external_apply_url: externalApplyUrl.trim() || null,
      external_contact_email: nmContactEmail.trim() || null,
      external_contact_name: nmManagerName.trim() || null,
      external_contact_phone: nmManagerPhone.replace(/\D/g, "") || null,
      // 비회원(관리자) 공고는 뷰티워크 온라인 지원만 받는다 → 지원방법 고정
      contact_methods: (mode === "admin" && nonMember) ? ["온라인 지원"] : contactMethods,
    };

    const company: any = nonMember
      ? { companyId: null, newCompany: { company_name: newCompanyName.trim(), brand_name: newBrandName.trim(), homepage_url: nmHomepage.trim(), contact_email: nmContactEmail.trim(), description: nmDescription.trim(), address: nmAddress.trim(), industry: nmIndustry, company_size: nmSize, founded_year: nmFounded, representative_name: nmRepresentative.trim(), company_phone: nmPhone.replace(/\D/g, ""), logo_url: null, cover_images: bannerImages.map((b) => ({ url: b.url })) } }
      : { companyId, newCompany: null };
    const result = await onSubmit(payload, status, company);
    if (!result.success) {
      alert(result.error || (editId ? "공고 수정에 실패했습니다." : "공고 등록에 실패했습니다."));
      return;
    }
    // 관리자 직접등록 임시저장: 목록으로 나가지 않고 이 페이지에 머문다.
    //  · 신규 → 저장된 draft 편집 모드(?id=)로 전환해 이 페이지 유지 + 재저장 시 중복 방지(PATCH)
    //  · 기존 draft → 그대로 머물며 상단 임시저장 목록만 갱신
    if (mode === "admin" && status === "draft") {
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 1800);
      if (!editId && result.id) {
        setTimeout(() => router.push(`${pathname}?id=${result.id}`), 600);
      } else {
        reloadDrafts();
      }
      return;
    }
    setSaved(true);
    setTimeout(() => router.push(listHref), 1000);
  };

  // ── 복리후생: DB 마스터 태그 + 검색/자동완성 + 새 태그 소프트 등록 ─────────────
  const benefitJobType = jobGroupType === "기업" ? "OFFICE" : jobGroupType === "매장" ? "STORE" : "";
  const benefitAuthToken = () => (typeof window !== "undefined" ? localStorage.getItem(mode === "admin" ? "admin_token" : "access_token") : null);
  useEffect(() => {
    if (!benefitJobType) return;
    fetch(`/api/benefit-tags?job_type=${benefitJobType}`, { headers: { Authorization: `Bearer ${benefitAuthToken()}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) setBenefitTagOptions(res.data.items || []); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [benefitJobType, mode]);
  const toggleBenefit = (b: string) =>
    setBenefitTags(benefitTags.includes(b) ? benefitTags.filter((x) => x !== b) : [...benefitTags, b]);
  // 목록에 없는 복리후생 직접 추가 → 선택 + DB에 소프트 등록(관리자 검수 대상)
  const addNewBenefit = async (raw: string) => {
    const name = raw.replace(/\s+/g, " ").trim();
    if (!name || name.length > 40) return;
    if (!benefitTags.includes(name)) setBenefitTags([...benefitTags, name]);
    setBenefitSearch("");
    if (!benefitTagOptions.some((o) => o.name === name)) setBenefitTagOptions((prev) => [{ name, is_curated: false }, ...prev]);
    try {
      await fetch(`/api/benefit-tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${benefitAuthToken()}` },
        body: JSON.stringify({ name, job_type: benefitJobType || "BOTH" }),
      });
    } catch { /* 등록 실패해도 이 공고엔 선택된 채로 유지 */ }
  };

  // 전체 주소 문자열에서 필터용 근무지역(시도 시군구)을 추출
  const deriveRegion = (addr: string) => {
    const SIDO_MAP: Record<string, string> = { 서울: "서울특별시", 부산: "부산광역시", 대구: "대구광역시", 인천: "인천광역시", 광주: "광주광역시", 대전: "대전광역시", 울산: "울산광역시", 세종: "세종특별자치시", 경기: "경기도", 강원: "강원특별자치도", 충북: "충청북도", 충남: "충청남도", 전북: "전북특별자치도", 전남: "전라남도", 경북: "경상북도", 경남: "경상남도", 제주: "제주특별자치도" };
    const m = (addr || "").match(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\S*\s*([가-힣]+[시군구])/);
    return m ? [`${SIDO_MAP[m[1]] || m[1]} ${m[2]}`] : [];
  };

  // ── 텍스트 항목 메타 ───────────────────────
  const benefitsLabel = jobGroupType === "매장" ? "근무조건·복지" : "복리후생";
  const isOffice = jobGroupType === "기업";
  const textFieldMeta: Record<TextKey, { label: string; hint?: string; placeholder: string }> = {
    benefits: { label: "혜택·복지", placeholder: "복리후생·혜택을 입력하세요" },
    responsibilities: { label: "담당업무", hint: "필수 · 주요 업무를 입력", placeholder: "담당 업무를 입력하세요" },
    description: {
      label: "포지션 소개",
      hint: detailImages.length > 0 ? "선택 · 상세 이미지 아래에 표시" : "필수 (이미지 없을 시)",
      placeholder: "",
    },
    requirements: { label: "자격요건", hint: isOffice ? "필수" : (detailImages.length > 0 ? undefined : "필수 (이미지 없을 시)"), placeholder: "" },
    preferred: { label: "우대사항", placeholder: "" },
  };
  // 오피스는 담당업무(JD) 중심, 매장은 포지션 소개 중심
  const textFields: TextKey[] = isOffice
    ? ["responsibilities", "requirements", "preferred"]
    : ["description", "requirements", "preferred"];

  const processFilled = hiringProcess.length > 0;
  const notesFilled = !!notes.trim();

  // 미리보기용 job 객체 (실제 상세 페이지와 동일한 뷰로 렌더)
  const cp = companyProfile;
  const isNm = mode === "admin" && nonMember; // 비회원(외부) 공고면 nm* 값 사용
  const previewCompanyName = isNm ? newCompanyName : (cp?.company_name || (mode === "admin" ? companyName : ""));
  const previewJob = {
    id: editId || "preview",
    companyId: "",
    brand: isNm ? (newBrandName || newCompanyName) : (cp?.brand_name || cp?.company_name || (mode === "admin" ? companyName : "우리 회사")),
    brandDesc: isNm ? nmDescription : (cp?.description || ""),
    tags: [] as string[],
    title: form.title || "공고 제목",
    jobType: jobGroupType === "기업" ? "사무직" : "매장직",
    jobCategories: categories,
    career: form.career || "경력무관",
    education: form.education || "",
    region: regionList.join(", "),
    employType: (form.type ? form.type + ((fullTimeConvertible && (form.type === "계약직" || form.type === "인턴")) ? CONVERTIBLE_SUFFIX : "") : "협의"),
    headcount: form.headcount ? `${form.headcount}명` : "00명", // 인원 미언급 시 '00명'(미정)으로 표기
    deadline: (alwaysOpen || !form.deadline) ? "상시채용" : form.deadline.replace(/-/g, "."),
    salary: fmtSalary() || "면접 후 협의",
    color: "#e8f0fe",
    description: form.description || "",
    requirements: form.requirements ? form.requirements.split("\n").filter(Boolean) : [],
    preferreds: form.preferred ? form.preferred.split("\n").filter(Boolean) : [],
    benefits: form.benefits ? form.benefits.split("\n").filter(Boolean) : benefitTags,
    responsibilities: form.responsibilities ? form.responsibilities.split("\n").filter(Boolean) : [],
    process: hiringProcess.filter((s) => s.trim()),
    notes: notes,
    logo_url: isNm ? null : cp?.logo_url,
    cover_images: isNm ? bannerImages.map((b) => ({ url: b.url })) : (cp?.cover_images || []),
    detailImages: detailImages,
    companyInfo: {
      name: previewCompanyName,
      brandName: isNm ? newBrandName : (cp?.brand_name || ""),
      industry: isNm ? nmIndustry : "",
      representative: isNm ? nmRepresentative : (cp?.representative_name || ""),
      companyType: jobGroupType === "매장" ? "매장" : "오피스",
      size: isNm ? nmSize : (cp?.company_size || ""),
      founded: isNm ? (nmFounded ? `${nmFounded}년` : "") : (cp?.founded_year || ""),
      phone: isNm ? nmPhone : (cp?.company_phone || ""),
      website: isNm ? nmHomepage : (cp?.website_url || ""),
      location: isNm ? nmAddress : (cp ? [cp.region_sido, cp.region_sigungu, cp.address].filter(Boolean).join(" ") : ""),
      latitude: null,
      longitude: null,
    },
    companyAddress: isNm ? nmAddress : (cp ? [cp.region_sido, cp.region_sigungu, cp.address].filter(Boolean).join(" ") : ""),
    workDaysText: workDaysNego ? "요일 협의" : (workDays.length ? workDays.join("·") : "요일 협의"),
    workPeriodText: workPeriod || "협의",
    workTimeText: workTimeNego ? "시간 협의" : (workTimeStart && workTimeEnd ? `${workTimeStart}~${workTimeEnd}` : "시간 협의"),
    // 비회원(관리자) 공고는 담당자 연락처를 구직자에게 노출하지 않음 → 미리보기도 동일하게 숨기고 '온라인 지원'만
    isExternal: isNm,
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    contactMethods: isNm ? ["온라인 지원"] : contactMethods,
  };

  // 본문 콘텐츠(760px) 가로 정렬: 관리자 직접등록은 목록과 맞춰 왼쪽 정렬, 기업회원 폼은 기존대로 가운데 정렬.
  const mx = mode === "admin" ? "0" : "auto";

  return (
    <>
      {/* 헤더 폭·정렬을 본문(760px)과 일치 → 상단 버튼 오른쪽 끝이 본문 오른쪽 끝과 맞음 */}
      <div className="admin-form-header" style={{ maxWidth: 760, marginLeft: mx, marginRight: mx }}>
        {mode !== "admin" && (
          <button className="admin-back-btn" onClick={() => router.push(listHref)}>
            <ChevronLeft size={18} /> 목록으로
          </button>
        )}
        {!isMobile && <span style={{ marginRight: "auto" }} />}
        {!isMobile && (
          <div className="admin-form-actions">
            {/* 임시저장 버튼 + (관리자) 임시저장 목록 드롭다운 — 페이지를 밀지 않도록 버튼에서 팝오버로 노출 */}
            <div ref={draftMenuRef} style={{ position: "relative", display: "inline-flex", alignItems: "stretch" }}>
              <button className="admin-secondary-btn" onClick={() => handleSubmit("draft")}
                style={mode === "admin" && drafts.length > 0 ? { borderTopRightRadius: 0, borderBottomRightRadius: 0 } : undefined}>
                <Save size={15} /> {draftSaved ? "임시저장됨 ✓" : "임시저장"}
              </button>
              {mode === "admin" && drafts.length > 0 && (
                <button type="button" className="admin-secondary-btn" title="임시저장 목록"
                  onClick={() => setDraftMenuOpen((v) => !v)}
                  style={{ marginLeft: -1, padding: "0 8px", borderTopLeftRadius: 0, borderBottomLeftRadius: 0, display: "inline-flex", alignItems: "center", gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#5f0080" }}>{drafts.length}</span>
                  <ChevronDown size={13} style={{ color: "#999", transform: draftMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                </button>
              )}
              {draftMenuOpen && drafts.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 60, width: 340, maxWidth: "80vw", background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 8 }}>
                  <div style={{ fontSize: 12, color: "#9a92a6", padding: "2px 6px 6px" }}>임시저장 {drafts.length}건 · 클릭하면 이어서 작성돼요</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 320, overflowY: "auto" }}>
                    {drafts.map((d) => {
                      const on = editId === d.id;
                      return (
                        <button key={d.id} type="button"
                          onClick={() => { setDraftMenuOpen(false); if (!on) router.push(`${pathname}?id=${d.id}`); }}
                          style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left", width: "100%", padding: "8px 10px", borderRadius: 8, border: on ? "1.5px solid #5f0080" : "1px solid #eee", background: on ? "#f3ecfb" : "#fff", cursor: on ? "default" : "pointer", font: "inherit" }}>
                          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14, color: "#2b2533" }}>
                            {d.title || "(제목 없음)"}
                            {d.company_name && <span style={{ color: "#9a92a6", marginLeft: 6, fontSize: 13 }}>· {d.company_name}</span>}
                          </span>
                          {on ? (
                            <span style={{ flexShrink: 0, fontSize: 12, color: "#5f0080", fontWeight: 600 }}>편집 중</span>
                          ) : d.created_at ? (
                            <span style={{ flexShrink: 0, fontSize: 12, color: "#b3adbd" }}>{new Date(d.created_at).toLocaleDateString("ko-KR")}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {/* 이슈 모아보기 — 별도 관리 페이지로 이동(100건+ 대비) */}
            {mode === "admin" && issueList.length > 0 && (
              <button type="button" className="admin-secondary-btn" onClick={() => router.push("/admin/jobs/issues")} title="기록된 이슈 목록 페이지 보기"
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                🐞 이슈 <span style={{ fontSize: 12, fontWeight: 700, color: "#c0392b" }}>{issueList.length}</span>
              </button>
            )}
            <button className="admin-secondary-btn" onClick={() => setShowPreview(true)}><Eye size={15} /> 미리보기</button>
            {mode === "admin" && (
              <button type="button" className="admin-secondary-btn" onClick={runCurate} disabled={parsing || curating} title="현재 채워진 공고 내용을 뷰티워크 톤·형식으로 AI가 다듬어요">
                {curating ? "다듬는 중..." : "✨ 큐레이션"}
              </button>
            )}
            <button className="company-primary-btn" onClick={() => handleSubmit("publish")}>
              {saved ? (editId ? "✅ 수정완료" : "✅ 등록완료") : (editId ? "공고 수정" : "공고 등록")}
            </button>
          </div>
        )}
      </div>

      {isMobile && headerSlot && createPortal(
        <>
          <button className="co-m-ibtn" onClick={() => handleSubmit("draft")} aria-label="임시저장" title="임시저장">
            <Save size={20} />
          </button>
          <button className="co-m-ibtn" onClick={() => setShowPreview(true)} aria-label="미리보기" title="미리보기">
            <Eye size={20} />
          </button>
        </>,
        headerSlot
      )}

      {/* 페이지 제목 — 아래 콘텐츠(760px, mx 정렬)와 시작점을 맞춘다 */}
      {!isMobile && (
        <div style={{ width: "100%", maxWidth: 760, margin: `0 ${mx} 10px`, boxSizing: "border-box" }}>
          <h2 style={{ fontSize: 18, fontWeight: 400, color: "#1a1a1a", margin: "0 0 0 2px" }}>
            {editId ? "채용공고 수정" : "채용공고 등록"}
          </h2>
        </div>
      )}


      {/* 채용유형(매장/오피스) — 최상단, 외부 불러오기 박스 밖. 라디오 선택, 불러오기로 자동 추정 후 확정·수정 */}
      {showTypeToggle && (
        <div style={{ width: "100%", maxWidth: 760, margin: `0 ${mx} 12px`, boxSizing: "border-box", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 24px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#5f0080", fontSize: 16, fontWeight: 400 }}>
            <Settings size={16} /> 채용유형
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {([["매장", "매장"], ["기업", "오피스"]] as ["" | "기업" | "매장", string][]).map(([val, label]) => {
              const on = jobGroupType === val;
              return (
                <label key={val} style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 16, fontWeight: 400, color: on ? "#1a1a1a" : "#666" }}>
                  <span style={{ width: 16, height: 16, borderRadius: "50%", border: on ? "1.5px solid #555" : "1.5px solid #cfcfcf", boxSizing: "border-box", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {on && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#555" }} />}
                  </span>
                  <input type="radio" name="jobGroupType" checked={on} onChange={() => setJobGroupType(val)} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
                  {label}
                </label>
              );
            })}
          </div>
          {!jobGroupType && <span style={{ fontSize: 12, color: "#e9a3a3" }}>선택하면 급여·복지 등 항목이 열립니다.</span>}
        </div>
      )}

      {mode === "admin" && (
        <div style={{ width: "100%", maxWidth: 760, margin: `0 ${mx} 16px`, boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 16px", marginBottom: 8, marginLeft: 2 }}>
            <span style={{ fontWeight: 400, fontSize: 16, color: "#5f0080" }}>{mode === "admin" ? "외부 공고 불러오기" : "타 사이트 공고 불러오기"}</span>
            <div style={{ display: "flex", gap: 20 }}>
              {([["url", "회사명 / URL"], ["ocr", "화면 캡처"]] as ["url" | "ocr", string][]).map(([v, l]) => (
                <label key={v} style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 16, fontWeight: 400, color: importMode === v ? "#1a1a1a" : "#666" }}>
                  <span style={{ width: 16, height: 16, borderRadius: "50%", border: importMode === v ? "1.5px solid #555" : "1.5px solid #cfcfcf", boxSizing: "border-box", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {importMode === v && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#555" }} />}
                  </span>
                  <input type="radio" name="importMode" checked={importMode === v} onChange={() => { setImportMode(v); setParseMsg(""); }} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} /> {l}
                </label>
              ))}
            </div>
          </div>
          <div style={{ background: "#f6f3fb", border: "1px solid #e5e0eb", borderRadius: 10, padding: "12px 16px", boxSizing: "border-box" }}>

          {importMode === "url" ? (
          /* 통합 검색: 회사명 또는 공고 URL을 한 칸에서 자동 구분 */
          <div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="admin-form-input" style={{ flex: 1 }} placeholder="회사명 또는 공고 URL 입력 (예: 준오헤어 · https://…)"
                value={findQuery} onChange={(e) => { setFindQuery(e.target.value); if (picked && e.target.value !== picked.title) setPicked(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runImport(); } }} />
              {picked && (
                <a href={picked.url} target="_blank" rel="noopener noreferrer" title="선택한 공고 원문을 새 탭으로 열기"
                  style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", padding: "0 12px", borderRadius: 8, border: "1px solid #e5e0eb", background: "#fff", color: "#5f0080", fontSize: 15, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>원문 ↗</a>
              )}
              <button type="button" onClick={runImport} disabled={finding || parsing}
                style={{ flexShrink: 0, padding: "0 18px", borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: (finding || parsing) ? 0.6 : 1, whiteSpace: "nowrap" }}>
                {(finding || parsing) ? "불러오는 중..." : "불러오기"}</button>
            </div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 6 }}>회사명을 넣으면 공고 목록을 보여줘요. 목록에서 공고를 선택한 뒤 <b>불러오기</b>를 누르면 값을 가져와요. (URL을 넣으면 바로 불러와요.)</div>
            {findMsg && <div style={{ fontSize: 12.5, marginTop: 6, color: findResults.length ? "#10b981" : "#c0392b" }}>{findMsg}</div>}
            {findResults.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 220, overflowY: "auto", border: "1px solid #e5e0eb", borderRadius: 8, background: "#fff" }}>
                {findResults.map((r) => { const on = picked?.url === r.url; return (
                  <div key={r.idx}
                    onClick={() => selectFoundJob(r)}
                    title="선택하면 위 검색칸에 표시돼요. ↗로 원문을 새 탭에서 볼 수 있어요."
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1px solid #f2eef8", cursor: "pointer", background: on ? "#faf7fe" : "transparent", transition: "background 0.12s" }}>
                    {/* 라디오(선택) */}
                    <span style={{ flexShrink: 0, width: 16, height: 16, borderRadius: "50%", border: on ? "1.5px solid #5f0080" : "1.5px solid #cfcfcf", display: "inline-flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
                      {on && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5f0080" }} />}
                    </span>
                    <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: "#5f0080", background: "#f3e5f5", border: "1px solid #e4d3f2", borderRadius: 5, padding: "1px 6px" }}>{r.source}</span>
                    <span style={{ flex: 1, fontSize: 13, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.title}>{r.title}</span>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title="원문 공고 새 탭으로 열기"
                      style={{ flexShrink: 0, color: "#bbb", fontSize: 13, textDecoration: "none", padding: "0 2px" }}>↗</a>
                  </div>
                ); })}
              </div>
            )}
          </div>
          ) : (
          /* 화면 캡처(OCR): 여러 장 드래그·추가 → 한 번에 인식 */
          <div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const fs = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/")); if (fs.length) setOcrFiles((prev) => [...prev, ...fs]); }}
              style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: 12, borderRadius: 8, border: "1.5px dashed #c9b8de", background: "#fff" }}>
              {ocrFiles.map((f, idx) => (
                <div key={idx} style={{ position: "relative", width: 72 }}>
                  <img src={URL.createObjectURL(f)} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6, border: "1px solid #eee" }} />
                  <span style={{ position: "absolute", bottom: 2, left: 2, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 10, borderRadius: 4, padding: "0 4px" }}>{idx + 1}</span>
                  <button type="button" onClick={() => setOcrFiles((prev) => prev.filter((_, i) => i !== idx))}
                    style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 11, lineHeight: 1 }}>×</button>
                </div>
              ))}
              <label style={{ width: 72, height: 72, flexShrink: 0, border: "1.5px dashed #c4b5d4", borderRadius: 6, background: "#faf7fe", color: "#5f0080", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer" }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
                <span style={{ fontSize: 10 }}>추가</span>
                <input type="file" accept="image/*" multiple hidden onChange={(e) => { const fs = Array.from(e.target.files || []); if (fs.length) setOcrFiles((prev) => [...prev, ...fs]); e.currentTarget.value = ""; }} />
              </label>
              {ocrFiles.length === 0 && <span style={{ fontSize: 13, color: "#bbb" }}>공고 화면 캡처를 여기로 드래그하거나 추가하세요. 긴 공고는 위→아래로 여러 장 캡처하면 됩니다.</span>}
              <button type="button" onClick={() => runOcrMulti(ocrFiles)} disabled={parsing || ocrFiles.length === 0}
                style={{ marginLeft: "auto", alignSelf: "flex-end", padding: "8px 18px", borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 14, fontWeight: 700, cursor: (parsing || ocrFiles.length === 0) ? "default" : "pointer", opacity: parsing ? 0.6 : 1 }}>
                {parsing ? "불러오는 중..." : `불러오기${ocrFiles.length ? ` (${ocrFiles.length}장)` : ""}`}</button>
            </div>
          </div>
          )}
          {parseMsg && <div style={{ fontSize: 12.5, marginTop: 6, color: parseMsg.startsWith("✓") ? "#10b981" : "#c0392b" }}>{parseMsg}</div>}
          {mode !== "admin" && <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>타 사이트에 올린 공고의 URL을 넣으면 제목·직군·경력·근무지역·자격요건 등 <b>공고 내용</b>이 자동으로 채워져요. 회사 정보는 등록된 기업 프로필을 사용합니다. 확인·수정 후 등록하세요.</div>}

          </div>
        </div>
      )}

      {/* 이 공고 이슈 메모 — 불러온 원문(picked.url)에 매칭. 필드 선택 + 한 줄 메모, 자동저장 */}
      {mode === "admin" && picked?.url && (
        <div style={{ width: "100%", maxWidth: 760, margin: `0 ${mx} 16px`, boxSizing: "border-box", border: "1px solid #f0d9d9", background: "#fff8f6", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: issueItems.length ? 8 : 0 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#c0392b" }}>🐞 이 공고 이슈</span>
            <span style={{ fontSize: 12, color: "#b08a86" }}>불러온 원문과 다른·잘못된 항목을 적어두면 자동저장돼요</span>
            <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: issueStatus === "error" ? 600 : 400, color: issueStatus === "error" ? "#c0392b" : issueStatus === "saved" ? "#22a06b" : "#c4a29e", minWidth: 44, textAlign: "right" }}>
              {issueStatus === "saving" ? "저장 중…" : issueStatus === "saved" ? "저장됨 ✓" : issueStatus === "error" ? "⚠ 저장 안 됨" : ""}
            </span>
          </div>
          {issueItems.map((it, idx) => (
            <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <select value={it.field} onChange={(e) => updateIssues(issueItems.map((x, i) => (i === idx ? { ...x, field: e.target.value } : x)))}
                style={{ flexShrink: 0, width: 150, padding: "6px 8px", borderRadius: 6, border: "1px solid #e6cfca", background: "#fff", fontSize: 13, color: it.field ? "#2b2533" : "#aaa" }}>
                <option value="">필드 선택</option>
                {ISSUE_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <input value={it.note} placeholder="무엇이 잘못됐는지 / 올바른 값"
                onChange={(e) => updateIssues(issueItems.map((x, i) => (i === idx ? { ...x, note: e.target.value } : x)))}
                style={{ flex: 1, minWidth: 0, padding: "6px 10px", borderRadius: 6, border: "1px solid #e6cfca", background: "#fff", fontSize: 13.5, boxSizing: "border-box" }} />
              <button type="button" title="삭제" onClick={() => updateIssues(issueItems.filter((_, i) => i !== idx))}
                style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 6, border: "1px solid #eee", background: "#fff", color: "#c0392b", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
            </div>
          ))}
          <button type="button" onClick={() => updateIssues([...issueItems, { field: "", note: "" }])}
            style={{ marginTop: issueItems.length ? 2 : 8, padding: "5px 12px", borderRadius: 6, border: "1px dashed #d9b3ac", background: "#fff", color: "#c0392b", fontSize: 13, cursor: "pointer" }}>+ 이슈 추가</button>
        </div>
      )}

      {/* 비회원 기업 정보 입력은 폼 맨 하단으로 이동(프로필 양식과 동일 구성) */}

      {/* 공고 상단 이미지 */}
      {mode === "company" ? (
        <div style={{ width: "100%", maxWidth: 760, margin: `0 ${mx} 16px`, boxSizing: "border-box" }}>
          <h2 className="jobpost-section-title" style={{ marginLeft: 4 }}>공고 상단 이미지</h2>
          <div style={{ marginTop: 8, background: "#fff", border: "1px solid #ececef", borderRadius: 12, padding: 12, boxSizing: "border-box" }}>
            <CoverBanner images={coverImages} />
            <p style={{ margin: "10px 2px 0", fontSize: 12, color: "#999" }}>기업설정에 등록한 커버 이미지가 공고 상단에 표시돼요. 이미지 변경은 기업설정에서 할 수 있어요.</p>
          </div>
        </div>
      ) : (() => {
        return (
          <div style={{ width: "100%", maxWidth: 760, margin: `0 ${mx} 16px`, boxSizing: "border-box" }}>
            <h2 className="jobpost-section-title" style={{ marginLeft: 4 }}>상단 배너</h2>
            <div style={{ marginTop: 8, background: "#fff", border: "1px solid #ececef", borderRadius: 12, padding: "16px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16 }}>

              {/* ── 상단 배너 (cover, 여러 장 · 공개화면에서 3장씩 화살표로 회전) ── */}
              <div>
                <div
                  tabIndex={0}
                  onFocus={() => setPasteZone("banner")}
                  onBlur={() => setPasteZone((z) => (z === "banner" ? null : z))}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); if (imgDragRef.current) { dropToBanner(null); return; } const f = e.dataTransfer.files; if (f && f.length && !nmCoverUploading) addBannerFiles(f); }}
                  onPaste={(e) => { const fs = imagesFromClipboard(e); if (fs.length) { e.preventDefault(); if (!nmCoverUploading) addBannerFiles(fs); } }}
                  style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", minHeight: 96, padding: 10, borderRadius: 10, border: `1.5px dashed ${dragOver || pasteZone === "banner" ? "#5f0080" : "#e0d5ee"}`, background: dragOver || pasteZone === "banner" ? "#f7f1fd" : "#fbf9ff", outline: "none" }}>
                  {bannerImages.map((b, idx) => (
                    <div key={b.url + idx} draggable
                      onDragStart={() => { imgDragRef.current = { zone: "banner", idx }; }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (imgDragRef.current) dropToBanner(idx); }}
                      style={{ position: "relative", width: 120, height: 76, flexShrink: 0, cursor: "grab" }}>
                      <img src={b.url} alt={`배너 ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8, border: "1px solid #eee" }} />
                      <span style={{ position: "absolute", bottom: 3, left: 3, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "0 4px" }}>{idx + 1}</span>
                      <button type="button" onClick={() => setBannerImages((prev) => prev.filter((_, i) => i !== idx))} title="배너에서 제거"
                        style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                  <label title="배너 추가"
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 120, height: 76, flexShrink: 0, borderRadius: 8, border: "1.5px dashed #c4b5d4", background: "#fff", color: "#5f0080", cursor: nmCoverUploading ? "wait" : "pointer" }}>
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{nmCoverUploading ? "…" : "+"}</span>
                    <span style={{ fontSize: 10, marginTop: 2 }}>배너 추가</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={nmCoverUploading || bannerImages.length >= 10} onChange={(e) => { addBannerFiles(e.target.files || []); e.currentTarget.value = ""; }} style={{ display: "none" }} />
                  </label>
                  {bannerImages.length === 0 && <span style={{ fontSize: 12, color: "#999", lineHeight: 1.5 }}>상세 이미지를 여기로 <b>드래그</b>하거나, 이 영역을 클릭한 뒤 <b>Ctrl+V</b>로 붙여넣어도 배너가 돼요. 여러 장 넣으면 3장씩 화살표로 넘겨봅니다.</span>}
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      <div className="admin-form-grid jobpost-form" style={{ width: "100%", maxWidth: 760, margin: mx, gridTemplateColumns: "1fr", justifyContent: "stretch", justifyItems: "stretch", rowGap: "16px" }}>
        {/* ═══ 왼쪽 컬럼: 기본정보 ═══ */}
        <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", gap: "8px" }}>

          {/* 모집요강 */}
          <h2 className="jobpost-section-title">모집요강</h2>
          <div className="company-card" style={{ overflow: "visible" }}>
            <div className="admin-form-body">

              {/* 공고 헤더(미리보기형): 실제 상세화면 최상단에 보일 브랜드 + 제목 */}
              <div style={{ padding: "4px 0 14px", marginBottom: 4 }}>
                <div style={{ marginBottom: 6 }}>
                  <input
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="회사명 (예: 이철헤어커커 망원점)"
                    style={{ fontSize: 14, fontWeight: 700, color: "#8a7fa0", border: "none", outline: "none", background: "transparent", padding: 0, width: "100%" }}
                  />
                </div>
                <input
                  placeholder="공고 제목을 입력하세요 *"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{ width: "100%", border: "none", outline: "none", fontSize: 19, fontWeight: 400, color: "#1a1a1a", padding: 0, background: "transparent", lineHeight: 1.3 }}
                />
              </div>

              {/* ── 기본정보 그리드: 항상 2열 아이콘 그리드(지역·경력·모집·마감) ── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px 16px", margin: "12px 0", alignItems: "center" }}>
                {/* 채용분야(직군) */}
                <div className="job-detail-meta-item">
                  <Tag size={16} className="job-detail-meta-icon" />
                  <span style={{ fontSize: 15, color: "#999", flexShrink: 0, width: 68 }}>모집분야<span style={{ color: "#e9a3a3" }}> *</span></span>
                  {typeLocked ? (
                    <span style={{ fontSize: 14, color: "#cfcfcf" }}></span>
                  ) : (
                    <JobGroupField jobType={jobGroupType === "기업" ? "OFFICE" : "STORE"} value={categories} onChange={setCategories} maxSelect={5} placeholder="선택" title="모집분야 선택" />
                  )}
                </div>
                {/* 경력 */}
                <div className="job-detail-meta-item">
                  <Briefcase size={16} className="job-detail-meta-icon" />
                  <span style={{ fontSize: 15, color: "#999", flexShrink: 0, width: 68 }}>경력{isOffice && <span style={{ color: "#e9a3a3" }}> *</span>}</span>
                  <select value={form.career} onChange={(e) => setForm({ ...form, career: e.target.value })}
                    style={{ border: "none", fontSize: 15, color: "#333", cursor: "pointer", WebkitAppearance: "none", appearance: "none", padding: 0, ...emptySel(!!form.career) }}>
                    <option value=""></option>
                    {CAREER_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                {/* 학력 */}
                <div className="job-detail-meta-item">
                  <GraduationCap size={16} className="job-detail-meta-icon" />
                  <span style={{ fontSize: 15, color: "#999", flexShrink: 0, width: 68 }}>학력{isOffice && <span style={{ color: "#e9a3a3" }}> *</span>}</span>
                  <select value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })}
                    style={{ border: "none", fontSize: 15, color: "#333", cursor: "pointer", WebkitAppearance: "none", appearance: "none", padding: 0, ...emptySel(!!form.education) }}>
                    <option value=""></option>
                    {EDUCATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                {/* 모집인원 — 빈 값은 하이라이트 1칸, 입력하면 숫자 */}
                <div className="job-detail-meta-item">
                  <Users size={16} className="job-detail-meta-icon" />
                  <span style={{ fontSize: 15, color: "#999", flexShrink: 0, width: 68 }}>모집인원<span style={{ color: "#e9a3a3" }}> *</span></span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <input type="number" min={1} inputMode="numeric" value={form.headcount}
                      onChange={(e) => setForm({ ...form, headcount: e.target.value.replace(/[^0-9]/g, "") })}
                      style={{ border: "none", fontSize: 15, color: "#333", padding: 0, WebkitAppearance: "none", appearance: "none", height: 20, lineHeight: "20px", textAlign: form.headcount ? "center" : "left", background: form.headcount ? "transparent" : PH_BG, borderRadius: form.headcount ? 0 : 5, width: form.headcount ? 44 : 56 }} />
                    <span style={{ fontSize: 15, color: "#999" }}>명</span>
                  </span>
                </div>
                {/* 마감 */}
                <div className="job-detail-meta-item" ref={deadlineRef} style={{ position: "relative" }}>
                  <Clock size={16} className="job-detail-meta-icon" />
                  <span style={{ fontSize: 15, color: "#999", flexShrink: 0, width: 68 }}>마감일<span style={{ color: "#e9a3a3" }}> *</span></span>
                  <button type="button"
                    onClick={() => {
                      if (deadlineModalOpen) { setDeadlineModalOpen(false); return; }
                      setDeadlineDraft(alwaysOpen ? "" : form.deadline); setAlwaysOpenDraft(alwaysOpen); setDeadlineModalOpen(true);
                    }}
                    style={{ border: "none", background: "transparent", padding: 0, fontSize: 15, color: (alwaysOpen || form.deadline) ? "#333" : "#cfcfcf", cursor: "pointer" }}>
                    {alwaysOpen ? "상시채용" : form.deadline ? `~ ${form.deadline.replace(/-/g, ".")}` : pick()}
                  </button>
                  {deadlineModalOpen && (
                    <div style={{ position: "absolute", top: "100%", left: 0, marginTop: "8px", zIndex: 50, background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "14px", width: "240px" }}>
                      <input type="date" min={new Date().toISOString().slice(0, 10)} value={alwaysOpenDraft ? "" : deadlineDraft} disabled={alwaysOpenDraft} onChange={(e) => setDeadlineDraft(e.target.value)}
                        style={{ width: "100%", height: 40, boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "8px", padding: "0 12px", fontSize: "14px", background: alwaysOpenDraft ? "#f5f5f5" : "#fff", color: alwaysOpenDraft ? "#aaa" : "#333" }} />
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "10px", fontSize: "13px", color: "#555", cursor: "pointer" }}>
                        <input type="checkbox" checked={alwaysOpenDraft} onChange={(e) => setAlwaysOpenDraft(e.target.checked)} /> 상시채용 (마감일 없음)
                      </label>
                      <div style={{ display: "flex", gap: "6px", marginTop: "12px", justifyContent: "flex-end" }}>
                        <button type="button" className="admin-secondary-btn" style={{ padding: "6px 12px", fontSize: "13px" }} onClick={() => setDeadlineModalOpen(false)}>취소</button>
                        <button type="button" className="company-primary-btn" style={{ padding: "6px 14px", fontSize: "13px" }} onClick={applyDeadline}>적용</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── 근무 조건: 고용형태·급여·근무요일·근무시간(라벨+값, 미리보기와 동일) ── */}
              <div style={{ paddingTop: 14, borderTop: "1px solid #f0edf5", marginTop: 6 }}>
                <div className="admin-form-label" style={{ margin: "0 0 8px", fontWeight: 400, color: "#333" }}>근무 조건</div>
                <div className="job-detail-company-info">
                  {/* 급여 */}
                  <div className="job-detail-company-row" ref={salaryRef} style={{ position: "relative" }}>
                    <span className="job-detail-company-label" style={{ fontSize: 14 }}>급여<span style={{ color: "#e9a3a3" }}> *</span></span>
                    <button type="button" disabled={typeLocked}
                      onClick={() => {
                        if (typeLocked) return;
                        if (salaryModalOpen) { setSalaryModalOpen(false); return; }
                        setSalaryDraft(salaryNego ? "" : form.salary); setSalaryNegoDraft(salaryNego); setSalaryTypeDraft(salaryType); setSalaryModalOpen(true);
                      }}
                      style={{ border: "none", background: "transparent", padding: 0, fontSize: 14, textAlign: "left", color: typeLocked ? "#cfcfcf" : ((salaryNego || form.salary) ? "#333" : "#cfcfcf"), cursor: typeLocked ? "default" : "pointer" }}>
                      {typeLocked ? "선택" : ((salaryNego || form.salary) ? fmtSalary() : pick("입력"))}
                    </button>
                    {salaryModalOpen && (
                      <div style={{ position: "absolute", top: "100%", left: 0, marginTop: "8px", zIndex: 50, background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "14px", width: "260px" }}>
                        {/* 급여 단위 */}
                        <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                          {((jobGroupType === "기업"
                            ? [["ANNUAL", "연봉"]]
                            : [["MONTHLY", "월급"], ["WEEKLY", "주급"], ["DAILY", "일급"], ["HOURLY", "시급"]]) as [string, string][]).map(([val, lbl]) => (
                            <button key={val} type="button" disabled={salaryNegoDraft}
                              onClick={() => setSalaryTypeDraft(val)}
                              style={{ flex: 1, padding: "6px 0", borderRadius: "8px", fontSize: "13px", cursor: salaryNegoDraft ? "default" : "pointer",
                                border: salaryTypeDraft === val ? "1.5px solid #5f0080" : "1px solid #ddd",
                                background: salaryTypeDraft === val ? "#faf5ff" : "#fff",
                                color: salaryNegoDraft ? "#bbb" : (salaryTypeDraft === val ? "#5f0080" : "#666") }}>
                              {lbl}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <input type="number" autoFocus disabled={salaryNegoDraft}
                            placeholder={salaryTypeDraft === "HOURLY" ? "예) 12,000" : salaryTypeDraft === "DAILY" ? "예) 100,000" : salaryTypeDraft === "ANNUAL" ? "예) 4000" : "예) 250"}
                            value={salaryNegoDraft ? "" : salaryDraft}
                            onChange={(e) => setSalaryDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applySalary(); } }}
                            style={{ flex: 1, minWidth: 0, height: 40, boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "8px", padding: "0 12px", fontSize: "14px", textAlign: "left", background: salaryNegoDraft ? "#f5f5f5" : "#fff", color: "#333" }} />
                          <span style={{ fontSize: "13px", color: "#666", whiteSpace: "nowrap", flexShrink: 0 }}>{(salaryTypeDraft === "HOURLY" || salaryTypeDraft === "DAILY") ? "원" : "만원"}</span>
                        </div>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "10px", fontSize: "13px", color: "#555", cursor: "pointer" }}>
                          <input type="checkbox" checked={salaryNegoDraft} onChange={(e) => setSalaryNegoDraft(e.target.checked)} /> 협의 (금액 비공개)
                        </label>
                        <div style={{ display: "flex", gap: "6px", marginTop: "12px", justifyContent: "flex-end" }}>
                          <button type="button" className="admin-secondary-btn" style={{ padding: "6px 12px", fontSize: "13px" }} onClick={() => setSalaryModalOpen(false)}>취소</button>
                          <button type="button" className="company-primary-btn" style={{ padding: "6px 14px", fontSize: "13px" }} onClick={applySalary}>적용</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* 고용형태 — 네이티브 풀다운. 계약직·인턴이면 '정규직 전환 가능' 하위 옵션 노출 */}
                  <div className="job-detail-company-row" style={{ position: "relative", alignItems: "center" }}>
                    <span className="job-detail-company-label" style={{ fontSize: 14 }}>고용형태<span style={{ color: "#e9a3a3" }}> *</span></span>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                      style={{ border: "none", fontSize: 15, color: "#333", cursor: "pointer", WebkitAppearance: "none", appearance: "none", padding: 0, ...emptySel(!!form.type) }}>
                      <option value=""></option>
                      {EMPLOYMENT_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    {(form.type === "계약직" || form.type === "인턴") && (
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "#666", cursor: "pointer", whiteSpace: "nowrap" }}>
                        <input type="checkbox" checked={fullTimeConvertible} onChange={(e) => setFullTimeConvertible(e.target.checked)} style={{ margin: 0 }} /> 정규직 전환 가능
                      </label>
                    )}
                  </div>
                  {/* 근무기간 — 매장 전용, 네이티브 풀다운 */}
                  {jobGroupType === "매장" && (
                    <div className="job-detail-company-row" style={{ position: "relative" }}>
                      <span className="job-detail-company-label" style={{ fontSize: 14 }}>근무기간</span>
                      <select value={workPeriod} onChange={(e) => setWorkPeriod(e.target.value)}
                        style={{ border: "none", fontSize: 15, color: "#333", cursor: "pointer", WebkitAppearance: "none", appearance: "none", padding: 0, ...emptySel(!!workPeriod) }}>
                        <option value=""></option>
                        {WORK_PERIODS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  )}
                  {jobGroupType === "매장" && (<>
                    {/* 근무요일 */}
                    <div className="job-detail-company-row" ref={workDaysRef} style={{ position: "relative" }}>
                      <span className="job-detail-company-label" style={{ fontSize: 14 }}>근무요일<span style={{ color: "#e9a3a3" }}> *</span></span>
                      <button type="button" onClick={() => setWorkDaysOpen((v) => !v)}
                        style={{ border: "none", background: "transparent", padding: 0, fontSize: 14, color: (workDaysNego || workDays.length) ? "#333" : "#cfcfcf", cursor: "pointer", textAlign: "left" }}>
                        {workDaysNego ? "요일 협의" : (workDays.length ? workDays.join("·") : pick())}
                      </button>
                      {workDaysOpen && (
                        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: "8px", zIndex: 50, background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "14px", width: "260px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {WORK_DAY_OPTIONS.map((d) => {
                              const on = workDays.includes(d);
                              return (
                                <button key={d} type="button" disabled={workDaysNego}
                                  onClick={() => setWorkDays(on ? workDays.filter((x) => x !== d) : [...workDays, d].sort((a, b) => WORK_DAY_OPTIONS.indexOf(a) - WORK_DAY_OPTIONS.indexOf(b)))}
                                  style={{ width: 32, height: 32, borderRadius: "50%", fontSize: "13px", cursor: workDaysNego ? "default" : "pointer",
                                    border: on ? "1.5px solid #5f0080" : "1px solid #ddd", background: on ? "#5f0080" : "#fff",
                                    color: workDaysNego ? "#ccc" : (on ? "#fff" : "#666") }}>{d}</button>
                              );
                            })}
                          </div>
                          <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "10px", fontSize: "13px", color: "#555", cursor: "pointer" }}>
                            <input type="checkbox" checked={workDaysNego} onChange={(e) => setWorkDaysNego(e.target.checked)} /> 요일 협의
                          </label>
                        </div>
                      )}
                    </div>
                    {/* 근무시간 */}
                    <div className="job-detail-company-row" ref={workTimeRef} style={{ position: "relative" }}>
                      <span className="job-detail-company-label" style={{ fontSize: 14 }}>근무시간<span style={{ color: "#e9a3a3" }}> *</span></span>
                      <button type="button" onClick={() => setWorkTimeOpen((v) => !v)}
                        style={{ border: "none", background: "transparent", padding: 0, fontSize: 14, color: (workTimeNego || (workTimeStart && workTimeEnd)) ? "#333" : "#cfcfcf", cursor: "pointer", textAlign: "left" }}>
                        {workTimeNego ? "시간 협의" : (workTimeStart && workTimeEnd ? `${workTimeStart}~${workTimeEnd}` : pick("입력"))}
                      </button>
                      {workTimeOpen && (
                        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: "8px", zIndex: 50, background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "14px", width: "260px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input type="time" disabled={workTimeNego} value={workTimeStart} onChange={(e) => setWorkTimeStart(e.target.value)}
                              style={{ flex: 1, minWidth: 0, height: 40, boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "8px", padding: "0 10px", fontSize: "14px", background: workTimeNego ? "#f5f5f5" : "#fff", color: "#333" }} />
                            <span style={{ color: "#888", flexShrink: 0 }}>~</span>
                            <input type="time" disabled={workTimeNego} value={workTimeEnd} onChange={(e) => setWorkTimeEnd(e.target.value)}
                              style={{ flex: 1, minWidth: 0, height: 40, boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "8px", padding: "0 10px", fontSize: "14px", background: workTimeNego ? "#f5f5f5" : "#fff", color: "#333" }} />
                          </div>
                          <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "10px", fontSize: "13px", color: "#555", cursor: "pointer" }}>
                            <input type="checkbox" checked={workTimeNego} onChange={(e) => setWorkTimeNego(e.target.checked)} /> 시간 협의
                          </label>
                        </div>
                      )}
                    </div>
                  </>)}
                  {/* 복리후생 — 근무시간과 같은 행(반열). 팝오버 선택, 값은 콤마 텍스트로 줄바꿈 표시 */}
                  <div className="job-detail-company-row" ref={welfareRef} style={{ alignItems: "flex-start", position: "relative" }}>
                    <span className="job-detail-company-label" style={{ fontSize: 14 }}>복리후생<span style={{ color: "#e9a3a3" }}> *</span></span>
                    <button type="button" disabled={typeLocked} onClick={() => { if (!typeLocked) setWelfareOpen((v) => !v); }}
                      style={{ flex: 1, textAlign: "left", border: "none", background: "none", padding: 0, fontSize: 15, cursor: typeLocked ? "default" : "pointer", lineHeight: 1.6, color: typeLocked ? "#cfcfcf" : (benefitTags.length ? "#333" : "#cfcfcf") }}>
                      {typeLocked ? "채용유형을 먼저 선택하세요" : (benefitTags.length ? benefitTags.join(", ") : pick())}
                    </button>
                    {welfareOpen && !typeLocked && (() => {
                      const qq = benefitSearch.trim().toLowerCase();
                      const match = (n: string) => !qq || n.toLowerCase().includes(qq);
                      // 선택됐지만 마스터에 없는 커스텀 태그를 먼저, 그다음 마스터 옵션
                      const customSel = benefitTags.filter((t) => !benefitTagOptions.some((o) => o.name === t) && match(t)).map((t) => ({ name: t, is_curated: false }));
                      const visible = [...customSel, ...benefitTagOptions.filter((o) => match(o.name))];
                      const exact = benefitTagOptions.some((o) => o.name === benefitSearch.trim()) || benefitTags.includes(benefitSearch.trim());
                      const canAdd = benefitSearch.trim().length > 0 && !exact;
                      return (
                      <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 50, background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 12, width: 360, maxWidth: "80vw" }}>
                        <input autoFocus value={benefitSearch} onChange={(e) => setBenefitSearch(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (canAdd) addNewBenefit(benefitSearch); } }}
                          placeholder="복리후생 검색 또는 직접 추가 후 Enter"
                          style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid #e0d5ee", fontSize: 14, marginBottom: 10, outline: "none" }} />
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 200, overflowY: "auto" }}>
                          {visible.map((o) => { const on = benefitTags.includes(o.name); return (
                            <button key={o.name} type="button" onClick={() => toggleBenefit(o.name)}
                              style={{ padding: "7px 13px", borderRadius: 999, fontSize: 14, cursor: "pointer", border: on ? "1.5px solid #5f0080" : "1.5px solid #e5e2ea", background: on ? "#5f0080" : "#fff", color: on ? "#fff" : "#666" }}>
                              {o.name}{!o.is_curated && <span style={{ marginLeft: 4, fontSize: 10, color: on ? "#e6d5f0" : "#b9a9cc" }}>추가됨</span>}
                            </button>
                          ); })}
                          {canAdd && (
                            <button type="button" onClick={() => addNewBenefit(benefitSearch)}
                              style={{ padding: "7px 13px", borderRadius: 999, fontSize: 14, cursor: "pointer", border: "1.5px dashed #5f0080", background: "#faf7ff", color: "#5f0080", fontWeight: 600 }}>
                              + &quot;{benefitSearch.trim()}&quot; 추가
                            </button>
                          )}
                          {visible.length === 0 && !canAdd && <span style={{ fontSize: 13, color: "#bbb" }}>검색 결과가 없어요.</span>}
                        </div>
                      </div>
                      );
                    })()}
                  </div>
                  </div>
                </div>

              {/* 근무지역: 전체 주소 입력 → 필터용 시·군·구 자동 추출 (지도는 아래) */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0 8px", borderTop: "1px solid #f0edf5", marginTop: 6 }}>
                <span className="admin-form-label" style={{ flexShrink: 0 }}>근무지역 <span style={{ color: "#e9a3a3" }}>*</span></span>
                <input value={nmAddress}
                  onChange={(e) => { const v = e.target.value; setNmAddress(v); const r = deriveRegion(v); if (r.length) setRegionList(r); }}
                  style={{ flex: 1, border: "none", background: "transparent", fontSize: 15, outline: "none", padding: 0, textAlign: "left" }}
                  placeholder="전체 주소 입력 (예: 서울 구로구 구일로10길 27 …)" />
              </div>
              {nmAddress.trim() && (
                <iframe title="근무지역 지도" width="100%" height={220}
                  style={{ border: 0, borderRadius: 12, marginTop: 4 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(nmAddress)}&output=embed&hl=ko`} />
              )}

              {/* 지원 안내 (채용 담당자 · 접수방법 · 채용 절차) */}
              <div style={{ paddingTop: 14, borderTop: "1px solid #f0edf5", marginTop: 6 }}>
                <div className="admin-form-label" style={{ margin: "0 0 10px", fontWeight: 400, color: "#333" }}>지원 안내</div>

              {/* 지원방법(좌·고정) · 담당자 연락처(우·관리자 확인용) — 관리자 비회원 공고에서만 */}
              {mode === "admin" && nonMember && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 28px", alignItems: "start" }}>
                  {/* 지원방법 (좌) — 비회원 공고는 뷰티워크 온라인 지원만. 고정 */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ width: 68, flexShrink: 0, whiteSpace: "nowrap", color: "#999", fontSize: 15, paddingTop: 6 }}>지원방법</span>
                    <div style={{ flex: 1, minWidth: 0, padding: "6px 2px" }}>
                      <div style={{ fontSize: 15, color: "#333", lineHeight: 1.6 }}>온라인 지원</div>
                      <div style={{ fontSize: 12, color: "#aaa", marginTop: 2, lineHeight: 1.5 }}>비회원 공고는 뷰티워크에서만 지원을 받아요. 구직자가 ‘지원하기’를 누르면 관리자 인박스로 접수됩니다.</div>
                    </div>
                  </div>
                  {/* 담당자 연락처 (우) — 관리자 확인·회원가입 유도용. 구직자에게는 노출되지 않음 */}
                  {(() => {
                    const inp2: CSSProperties = { flex: 1, minWidth: 0, border: "none", borderBottom: "1px solid #f4f3f6", background: "transparent", fontSize: 15, color: "#333", outline: "none", padding: "6px 2px", boxSizing: "border-box" };
                    return (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{ width: 76, flexShrink: 0, color: "#999", fontSize: 15, paddingTop: 6, lineHeight: 1.3 }}>담당자<br /><span style={{ fontSize: 10, color: "#c9a3d6" }}>관리자용</span></span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 100%" }}>
                            <span style={{ fontSize: 15, color: "#999", flexShrink: 0, width: 30 }}>이름</span>
                            <input value={nmManagerName} onChange={(e) => setNmManagerName(e.target.value)} style={inp2} />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 100%" }}>
                            <span style={{ fontSize: 15, color: "#999", flexShrink: 0, width: 30 }}>전화</span>
                            <input value={nmManagerPhone} inputMode="numeric" onChange={(e) => setNmManagerPhone(e.target.value)} style={inp2} />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 100%" }}>
                            <span style={{ fontSize: 15, color: "#999", flexShrink: 0, width: 30 }}>메일</span>
                            <input value={nmContactEmail} onChange={(e) => setNmContactEmail(e.target.value)} style={inp2} />
                          </div>
                          <div style={{ fontSize: 11, color: "#b58fc7", flex: "1 1 100%", marginTop: 3 }}>구직자에게는 노출되지 않아요 · 회원가입 유도용 내부 연락처</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 채용 절차 — 오피스(기업) 공고에서만 노출 */}
              {jobGroupType === "기업" && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "7px 0" }}>
                  <span style={{ width: 72, flexShrink: 0, color: "#999", fontSize: 15 }}>채용 절차</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", flex: 1 }}>
                    {PRESET_PROCESS.기업.map((p) => {
                      const on = hiringProcess.includes(p);
                      return (
                        <button key={p} type="button"
                          onClick={() => setHiringProcess(on ? hiringProcess.filter((x) => x !== p) : [...hiringProcess, p])}
                          style={{ border: "none", background: "none", padding: 0, fontSize: 15, cursor: "pointer", color: on ? "#5f0080" : "#c4c4c4" }}>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>

        </div>

        {/* ═══ 오른쪽 컬럼: 상세이미지 + 상세내용 + 채용절차·비고 ═══ */}
        <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", gap: "8px" }}>

          {/* 상세요강 */}
          <h2 className="jobpost-section-title">상세요강</h2>
          <div className="company-card" style={{ overflow: "visible" }}>
            <div className="admin-form-body">

              {/* ── 상세 내용 이미지 (본문 세로 스택) — 실제 미리보기의 상세요강 위치와 동일 ── */}
              <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--color-border)", marginBottom: 4 }}>
                <div style={{ fontSize: 12, color: "#999", marginBottom: 6 }}>갖고 계신 상세요강 이미지가 있다면 첨부해 주세요.</div>
                <div
                  tabIndex={0}
                  onFocus={() => setPasteZone("body")}
                  onBlur={() => setPasteZone((z) => (z === "body" ? null : z))}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); if (imgDragRef.current) { dropToBody(null); return; } if (!uploading) processFiles(e.dataTransfer.files); }}
                  onPaste={(e) => { const fs = imagesFromClipboard(e); if (fs.length) { e.preventDefault(); if (!uploading) processFiles(fs); } }}
                  style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", minHeight: 96, padding: 10, borderRadius: 10, border: `1.5px dashed ${pasteZone === "body" ? "#5f0080" : "#e0d5ee"}`, background: pasteZone === "body" ? "#f7f1fd" : "#fbf9ff", outline: "none" }}>
                  {detailImages.map((d, idx) => (
                    <div key={d.url + idx} draggable
                      onDragStart={() => { imgDragRef.current = { zone: "body", idx }; }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (imgDragRef.current) dropToBody(idx); }}
                      style={{ position: "relative", width: 84, cursor: "grab" }}>
                      <img src={d.url} alt={`상세 ${idx + 1}`} style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: "1px solid #eee" }} />
                      <span style={{ position: "absolute", bottom: 3, left: 3, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "0 4px" }}>{idx + 1}</span>
                      <button type="button" onClick={() => removeImage(idx)} title="삭제"
                        style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                  <label title="이미지 추가"
                    style={{ width: 84, height: 84, flexShrink: 0, border: "1.5px dashed #c4b5d4", borderRadius: 8, background: "#fff", color: "#5f0080", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, cursor: uploading ? "wait" : "pointer" }}>
                    <span style={{ fontSize: 22, lineHeight: 1 }}>{uploading ? "…" : "+"}</span>
                    <span style={{ fontSize: 10 }}>추가</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading || detailImages.length >= 12} onChange={handleImageUpload} style={{ display: "none" }} />
                  </label>
                  {detailImages.length === 0 && <span style={{ fontSize: 13, color: "#bbb" }}>상세요강 이미지가 있다면 여기로 첨부하거나, 이 영역을 클릭한 뒤 <b>Ctrl+V</b>로 붙여넣어 주세요.</span>}
                </div>
                <p style={{ margin: "8px 2px 0", fontSize: 12, color: "#999" }}>썸네일을 <b>드래그</b>해 순서를 바꿀 수 있어요. 이미지를 넣으면 아래 텍스트는 비워도 되고, 이미지가 없으면 포지션 소개·자격요건은 필수예요.</p>
              </div>

              {/* 상세 항목 → 그 자리에서 바로 쓰는 인라인 textarea(모달·팝오버 없음, 자동 높이) */}
              {textFields.map((k) => {
                const meta = textFieldMeta[k];
                const content = ((form as any)[k] || "") as string;
                // 상세 이미지가 없으면 포지션 소개·자격요건을 필수로 표시(이미지 대신 텍스트로 안내)
                // 오피스: 담당업무·자격요건 필수 / 매장: 이미지 없을 때 포지션 소개·자격요건 필수
                const isReq = isOffice
                  ? (detailImages.length === 0 && (k === "responsibilities" || k === "requirements"))
                  : (detailImages.length === 0 && (k === "description" || k === "requirements"));
                return (
                  <div key={k} style={{ padding: "8px 0", borderBottom: k === textFields[textFields.length - 1] ? "none" : "1px solid var(--color-border)" }}>
                    <label className="admin-form-label" style={{ margin: "0 0 4px", display: "block" }}>
                      {meta.label}
                      {isReq && <span style={{ color: "#dc2626", marginLeft: "3px" }}>*</span>}
                      {meta.hint && <span style={{ fontSize: 11, fontWeight: 400, color: "#bbb", marginLeft: 6 }}>{meta.hint}</span>}
                    </label>
                    <textarea
                      placeholder=""
                      value={content}
                      rows={1}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }}
                      style={{ width: "100%", boxSizing: "border-box", border: "none", background: "transparent", resize: "none", fontSize: 14, color: "#333", lineHeight: 1.5, fontFamily: "inherit", outline: "none", padding: 0, overflow: "hidden", display: "block", ...({ fieldSizing: "content" } as any) }} />
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ═══ 기업 정보 (맨 하단) · 상세 다른 섹션과 동일한 인라인 스타일 ═══ */}
      {mode === "admin" && nonMember && (
        <div className="jobpost-form" style={{ width: "100%", maxWidth: 760, margin: `16px ${mx} 0`, boxSizing: "border-box" }}>
          <h2 className="jobpost-section-title">기업정보</h2>
          <div style={{ fontSize: 12, color: "#999", margin: "8px 0 8px 2px" }}>기업회원 페이지의 “기업 정보”를 불러와 자동 작성돼요 · 공고 상세 맨 아래에 표시됩니다</div>
          <div className="company-card" style={{ overflow: "visible" }}>
            <div className="admin-form-body">
              {(() => {
                const row: CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "7px 0" };
                const lbl2: CSSProperties = { width: 92, flexShrink: 0, color: "#999", fontSize: 15 };
                const req: CSSProperties = { color: "#e9a3a3" };
                // 모집요강과 동일: 빈 값이면 텍스트 없는 연보라 하이라이트 블록, 입력하면 확장(플레이스홀더 없음)
                const inpHl = (filled: boolean): CSSProperties => filled
                  ? { flex: 1, minWidth: 0, border: "none", background: "transparent", fontSize: 15, color: "#333", outline: "none", padding: "6px 2px", height: 32, lineHeight: "20px", boxSizing: "border-box" }
                  : { flexShrink: 0, border: "none", background: PH_BG, borderRadius: 5, width: 56, height: 20, padding: 0, fontSize: 15, color: "#333", outline: "none", boxSizing: "border-box" };
                const sel3 = (filled: boolean): CSSProperties => ({ ...inpHl(filled), appearance: "none", WebkitAppearance: "none", MozAppearance: "none", cursor: "pointer" });
                const full: CSSProperties = { gridColumn: "1 / -1" };
                return (
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "2px 28px" }}>
                    <div style={{ ...row, ...full, alignItems: "flex-start" }}>
                      <span style={{ ...lbl2, paddingTop: 6 }}>기업 소개</span>
                      <textarea ref={nmDescRef} rows={1} style={nmDescription ? { flex: 1, minWidth: 0, border: "none", background: "transparent", fontSize: 15, color: "#333", outline: "none", padding: "6px 2px", minHeight: 40, resize: "none", fontFamily: "inherit", lineHeight: 1.6, overflow: "hidden", boxSizing: "border-box" } : { ...inpHl(false), resize: "none", marginTop: 6 }} value={nmDescription} onChange={(e) => setNmDescription(e.target.value)} />
                    </div>
                    <div style={row}><span style={lbl2}>회사명<span style={req}> *</span></span><input style={inpHl(!!newCompanyName)} value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} /></div>
                    <div style={row}><span style={lbl2}>업종</span><select style={sel3(!!nmIndustry)} value={nmIndustry} onChange={(e) => setNmIndustry(e.target.value)}><option value=""></option>{industryGroupsFor(jobGroupType === "매장" ? "STORE" : "OFFICE").flatMap((g) => g.items).map((it) => (<option key={it} value={it}>{it}</option>))}</select></div>
                    <div style={row}><span style={lbl2}>브랜드명</span><input style={inpHl(!!newBrandName)} value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} /></div>
                    <div style={row}><span style={lbl2}>웹사이트</span><input style={inpHl(!!nmHomepage)} value={nmHomepage} onChange={(e) => setNmHomepage(e.target.value)} /></div>
                    <div style={{ ...row, ...full }}><span style={lbl2}>주소<span style={req}> *</span></span><input style={inpHl(!!nmAddress)} value={nmAddress} onChange={(e) => setNmAddress(e.target.value)} /></div>
                    <div style={row}><span style={lbl2}>사원수</span><select style={sel3(!!nmSize)} value={nmSize} onChange={(e) => setNmSize(e.target.value)}><option value=""></option>{["1~10명", "10~50명", "50~100명", "100~300명", "300~1000명", "1000명 이상"].map((s) => (<option key={s} value={s}>{s}</option>))}</select></div>
                    <div style={row}><span style={lbl2}>설립연도</span><input type="number" min="1900" max={new Date().getFullYear()} style={inpHl(!!nmFounded)} value={nmFounded} onChange={(e) => setNmFounded(e.target.value)} /></div>
                    <div style={row}><span style={lbl2}>대표자</span><input style={inpHl(!!nmRepresentative)} value={nmRepresentative} onChange={(e) => setNmRepresentative(e.target.value)} /></div>
                    <div style={row}><span style={lbl2}>회사 대표번호</span><input style={inpHl(!!nmPhone)} value={nmPhone} onChange={(e) => setNmPhone(e.target.value)} /></div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {isMobile && mode === "admin" && (
        <button type="button" onClick={runCurate} disabled={parsing || curating}
          style={{ width: "100%", maxWidth: 760, margin: `0 ${mx} 12px`, display: "block", padding: "10px", borderRadius: 8, border: "1px solid #5f0080", background: "#fff", color: "#5f0080", fontSize: 14, fontWeight: 700, boxSizing: "border-box", opacity: curating ? 0.6 : 1 }}>
          {curating ? "다듬는 중..." : "✨ 큐레이션"}
        </button>
      )}
      {isMobile && (
        <button type="button" className="jobpost-mobile-submit" onClick={() => handleSubmit("publish")}>
          {saved ? (editId ? "✅ 수정완료" : "✅ 등록완료") : (editId ? "공고 수정 완료" : "공고 등록")}
        </button>
      )}

      <RegionSelectModal
        open={regionModalOpen}
        initial={regionList}
        onClose={() => setRegionModalOpen(false)}
        onApply={(regions) => { setRegionList(regions); setRegionModalOpen(false); }}
      />



      {showPreview && (
        <div onClick={() => setShowPreview(false)} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 20px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "1120px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #eee" }}>
              <span style={{ fontSize: "16px", fontWeight: 400 }}>공고 미리보기 (구직자에게 보이는 실제 화면)</span>
              <button onClick={() => setShowPreview(false)} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#888", lineHeight: 1 }}>×</button>
            </div>
            <div className="jobpost-preview-scope" style={{ padding: 0, maxHeight: "72vh", overflowY: "auto", overflowX: "hidden", background: "#faf7fc" }}>
              <JobDetailView ref={previewRef} job={previewJob}
                asideAction={
                  <button className="job-detail-apply-btn" disabled style={{ opacity: 0.7, cursor: "default" }}>
                    지원서 작성하기
                  </button>
                }
              />
            </div>
            <div style={{ display: "flex", gap: "8px", padding: "16px 20px", borderTop: "1px solid #eee", justifyContent: "flex-end" }}>
              <button className="admin-secondary-btn" onClick={handlePrint}>인쇄</button>
              <button className="admin-secondary-btn" onClick={handleDownloadPdf}>{isDownloading ? "저장 중..." : "PDF 다운로드"}</button>
              <button className="company-primary-btn" onClick={() => { setShowPreview(false); handleSubmit("publish"); }}>이대로 등록</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}