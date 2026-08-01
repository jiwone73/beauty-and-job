"use client";
import { industryGroupsFor } from "@/lib/data/industries";
import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown, Pencil, Trash2, Upload, Eye, Save } from "lucide-react";
import { shortRegion } from "@/lib/regionShort";
import JobDetailView, { ImageCarousel } from "@/components/jobs/JobDetailView";
import { formatSalaryWon } from "@/lib/salary";
import JobGroupField from "@/components/JobGroupField";
import RegionSelectModal from "@/components/RegionSelectModal";

const WORK_DAY_OPTIONS = ["월", "화", "수", "목", "금", "토", "일"];
const CAREER_OPTIONS = ["신입", "1년 이상", "2년 이상", "3년 이상", "5년 이상", "경력 무관"];
const EMPLOYMENT_TYPES = ["정규직", "계약직", "인턴", "아르바이트", "프리랜서"];
const WELFARE_OPTIONS: Record<string, string[]> = {
  매장: ["기숙사 제공", "교육비 지원", "인센티브", "식대 지원", "주차 가능"],
  기업: ["인센티브", "자기계발비", "식대 지원", "주차 가능"],
};
const WORKCOND_OPTIONS: Record<string, string[]> = {
  매장: ["4대보험", "주말·공휴일 휴무", "정규직 전환"],
  기업: ["4대보험", "정규직 전환", "재택근무", "유연근무"],
};
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
  onSubmit: (payload: any, status: "draft" | "publish", company: { companyId: string | null; newCompany: { company_name: string; brand_name: string } | null }) => Promise<{ success: boolean; error?: string }>;
  loadEditData?: (editId: string) => Promise<any | null>;
}

export default function JobPostForm({
  mode, editId = null, listHref, companyType = null, companies = [],
  uploadImage, onSubmit, loadEditData,
}: JobPostFormProps) {
  const router = useRouter();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [showCompanyList, setShowCompanyList] = useState(false);
  const [nonMember, setNonMember] = useState(false);
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
  const [nmCover, setNmCover] = useState("");
  const [nmCoverUploading, setNmCoverUploading] = useState(false);
  const [nmManagerName, setNmManagerName] = useState("");
  const [nmManagerPhone, setNmManagerPhone] = useState("");
  const [parseUrl, setParseUrl] = useState("");
  const [parseText, setParseText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseMsg, setParseMsg] = useState("");
  const [contactNotice, setContactNotice] = useState("");
  const [curating, setCurating] = useState(false);
  const [jobGroupType, setJobGroupType] = useState<"기업" | "매장">("기업");
  const [categories, setCategories] = useState<string[]>([]);
  const [regionList, setRegionList] = useState<string[]>([]);
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", career: "",
    type: "정규직", deadline: "", salary: "", description: "",
    requirements: "", preferred: "", benefits: "", responsibilities: "",
  });
  const [saved, setSaved] = useState(false);
  const [alwaysOpen, setAlwaysOpen] = useState(false);
  const [detailImages, setDetailImages] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hiringProcess, setHiringProcess] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [benefitTags, setBenefitTags] = useState<string[]>([]);
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
    const unit = salaryType === "HOURLY" ? 1 : 10000;
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
    if (importSalaryRef.current) { importSalaryRef.current = false; return; }
    setSalaryType(jobGroupType === "매장" ? "MONTHLY" : "ANNUAL");
  }, [jobGroupType, editId]);
  useEffect(() => {
    if (!salaryModalOpen) return;
    const onDown = (e: MouseEvent) => {
      if (salaryRef.current && !salaryRef.current.contains(e.target as Node)) setSalaryModalOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [salaryModalOpen]);
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
  // 근무 조건(매장직): 요일 / 시간 / 시간대
  const [workDays, setWorkDays] = useState<string[]>([]);
  const [workDaysNego, setWorkDaysNego] = useState(false);
  const [workDaysOpen, setWorkDaysOpen] = useState(false);
  const workDaysRef = useRef<HTMLDivElement>(null);
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
    if (companyType === "BOTH") setJobGroupType("기업");
    else if (companyType === "STORE") setJobGroupType("매장");
    else if (companyType === "OFFICE") setJobGroupType("기업");
  }, [companyType]);

  useEffect(() => {
    if (!editId || !loadEditData) return;
    loadEditData(editId).then((j) => {
      if (!j) return;
      const career = j.experience_level === "NEW" ? "신입"
        : j.experience_level === "EXPERIENCED" ? "2년 이상" : "경력 무관";
      const type = j.employment_type
        || (j.work_type === "PART_TIME" ? "파트타임"
          : j.work_type === "CONTRACT" ? "계약직" : "정규직");
      const loadedSalaryType = j.salary_type || (j.job_type === "STORE" ? "MONTHLY" : "ANNUAL");
      const salary = j.salary_min ? String(loadedSalaryType === "HOURLY" ? j.salary_min : j.salary_min / 10000) : "";
      setSalaryMax(j.salary_max && j.salary_max > j.salary_min ? String(loadedSalaryType === "HOURLY" ? j.salary_max : j.salary_max / 10000) : "");
      setSalaryType(loadedSalaryType);
      setForm({
        title: j.title || "", career, type,
        deadline: j.deadline ? String(j.deadline).slice(0, 10) : "",
        salary, description: j.description || "", requirements: j.requirements || "",
        preferred: j.preferred_qualifications || "", benefits: j.benefits || "",
        responsibilities: j.responsibilities || "",
      });
      setAlwaysOpen(!j.deadline);
      setCategories(j.categories || []);
      setRegionList(j.location ? String(j.location).split(",").map((s: string) => s.trim()).filter(Boolean) : []);
      setDetailImages(j.detail_images || []);
      setHiringProcess(j.hiring_process || []);
      setNotes(j.notes || "");
      setBenefitTags(j.benefit_tags || []);
      // 근무 조건 복원
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
    }).catch(console.error);
  }, [editId, loadEditData]);

  const showTypeToggle = mode === "admin" || companyType === "BOTH";

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
    if (detailImages.length + files.length > 5) {
      alert("이미지는 최대 5장까지 첨부할 수 있습니다."); return;
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
  const runParse = async () => {
    if (!parseUrl.trim() && !parseText.trim()) { setParseMsg("URL 또는 공고 본문을 입력해주세요."); return; }
    if (mode === "admin") { setNonMember(true); setCompanyId(null); }
    setParsing(true); setParseMsg(""); setContactNotice("");
    try {
      // 관리자는 admin_token, 기업회원은 access_token 사용
      const token = mode === "admin" ? localStorage.getItem("admin_token") : localStorage.getItem("access_token");
      const res = await fetch("/api/admin/external-jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: parseUrl.trim(), text: parseText.trim() }),
      });
      const j = await res.json();
      if (!j.success) { setParseMsg(j.error?.message || "불러오기에 실패했어요."); return; }
      const d = j.data;
      // 회사 정보(회사명·홈페이지·이메일·주소·소개·업종·지원방식)는 관리자 비회원 입력에만 채움.
      // 기업회원은 자기 프로필을 쓰되, 불러온 값이 있으면 우선 반영(레이아웃 편집 단계에서 필드로 노출 예정).
      if (mode === "admin") {
        if (d.company_name) setNewCompanyName(d.company_name);
        if (d.homepage_url) setNmHomepage(d.homepage_url);
        if (d.contact_email) setNmContactEmail(d.contact_email);
        if (d.contact_phone) setNmManagerPhone(d.contact_phone);
        if (d.contact_name) setNmManagerName(d.contact_name);
        if (["MANAGED", "EMAIL", "REDIRECT"].includes(d.apply_method)) setApplyMethod(d.apply_method);
        if (d.external_apply_url) setExternalApplyUrl(d.external_apply_url);
        if (d.company_description) setNmDescription(d.company_description);
        if (d.address) setNmAddress(d.address);
        if (d.industry) setNmIndustry(d.industry);
        // 이미지는 "외부공고에 보이는 순서 그대로" 반영.
        //  - 갤러리(d.images)가 있으면 그걸 그대로 사용(첫 장=커버, 나머지=상세).
        //  - 없으면 대표 이미지(og:image)라도 커버로.
        const imgs: string[] = Array.isArray(d.images) ? d.images.filter(Boolean) : [];
        const cover = imgs[0] || d.cover_image || "";
        if (cover) setNmCover(cover);
        if (imgs.length > 1) {
          setDetailImages(imgs.slice(1, 12).map((u, i) => ({ url: u, name: `이미지 ${i + 1}` })));
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
      // 텍스트 필드가 배열로 와도 안전하게 문자열로 변환
      const asText = (v: any, fb: string) => Array.isArray(v) ? v.filter(Boolean).join("\n") : (typeof v === "string" && v ? v : fb);
      setForm((f) => ({
        ...f,
        title: d.title || f.title,
        description: asText(d.description, f.description),
        deadline: isAlways ? "" : (d.deadline || f.deadline),
        requirements: asText(d.requirements, f.requirements),
        preferred: asText(d.preferred, f.preferred),
        benefits: asText(d.benefits, f.benefits),
        responsibilities: asText(d.main_duties, f.responsibilities),
        career: (CAREER_OPTIONS.includes(d.career) ? d.career : f.career),
        type: (["정규직", "파트타임", "계약직"].includes(d.employment_type) ? d.employment_type : f.type),
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
        setParseMsg("⚠ AI 자동 정리에 실패해 제목·회사 등 기본 정보만 채웠어요. 공고 본문 전체를 아래 칸에 붙여넣고 다시 '불러오기'를 눌러주세요.");
      }
    } catch { setParseMsg("오류가 발생했습니다."); }
    finally { setParsing(false); }
  };

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
    if (mode === "admin") {
      if (nonMember) {
        if (!newCompanyName.trim()) { alert("비회원 회사명을 입력해주세요."); return; }
        if (applyMethod === "REDIRECT" && !externalApplyUrl.trim()) { alert("외부 링크형은 외부 지원 URL이 필요해요."); return; }
        if (applyMethod === "EMAIL" && !nmContactEmail.trim()) { alert("이메일 중계형은 채용 이메일이 필요해요."); return; }
      } else if (!companyId) {
        alert("기업을 선택해주세요."); return;
      }
    }
    if (!form.title.trim()) { alert("공고 제목을 입력해주세요."); return; }
    if (categories.length === 0) { alert("직군을 선택해주세요."); return; }
    if (!form.career.trim()) { alert("경력 조건을 입력해주세요."); return; }
    if (regionList.length === 0) { alert("근무지역을 선택해주세요."); return; }
    // 마감일: 날짜 선택 또는 상시채용 필수
    if (status === "publish" && !alwaysOpen && !form.deadline) {
      alert("마감일을 선택하거나 상시채용을 체크해주세요.");
      return;
    }
    // 상세 이미지가 없으면 포지션 소개·자격요건 필수, 있으면 선택
    const hasDetailImages = detailImages.length > 0;
    if (!hasDetailImages && status === "publish" && (!form.description.trim() || !form.requirements.trim())) {
      alert("상세 이미지를 첨부하지 않으면 포지션 소개와 자격요건을 모두 입력해야 해요.\n\n(상세 이미지를 1장 이상 첨부하면 선택 항목으로 바뀌어요.)");
      return;
    }

    const expLevel = form.career.includes("신입") ? "NEW"
      : form.career.match(/\d+년/) ? "EXPERIENCED" : "ANY";
    const workType = form.type === "파트타임" ? "PART_TIME"
      : form.type === "계약직" ? "CONTRACT" : "FULL_TIME";
    let salaryMin: number | null = null;
    let salaryMaxVal: number | null = null;
    if (!salaryNego && form.salary) {
      const n = parseInt(String(form.salary).replace(/[^0-9]/g, ""));
      if (n > 0) salaryMin = salaryType === "HOURLY" ? n : n * 10000;
      const mx = parseInt(String(salaryMax).replace(/[^0-9]/g, "")) || 0;
      if (mx > n) salaryMaxVal = salaryType === "HOURLY" ? mx : mx * 10000;
    }

    const payload: any = {
      title: form.title,
      job_type: jobGroupType === "기업" ? "OFFICE" : "STORE",
      description: form.description || null,
      requirements: form.requirements || null,
      preferred_qualifications: form.preferred || null,
      benefits: form.benefits || null,
      responsibilities: form.responsibilities || null,
      salary_min: salaryMin, salary_max: salaryMaxVal,
      salary_type: salaryMin ? salaryType : null,
      location: regionList.join(", ") || null,
      work_type: workType,
      employment_type: form.type,
      experience_level: expLevel,
      benefit_tags: benefitTags,
      work_days: workDaysNego ? "협의" : (workDays.length ? workDays.join(",") : null),
      work_time: workTimeNego ? "협의" : (workTimeStart && workTimeEnd ? `${workTimeStart}~${workTimeEnd}` : null),
      work_time_slots: null,
      deadline: form.deadline || null,
      categories,
      detail_images: detailImages,
      hiring_process: hiringProcess.filter((s) => s.trim()),
      notes: notes.trim() || null,
      apply_method: applyMethod,
      external_apply_url: externalApplyUrl.trim() || null,
      external_contact_email: nmContactEmail.trim() || null,
      external_contact_name: nmManagerName.trim() || null,
      external_contact_phone: nmManagerPhone.replace(/\D/g, "") || null,
    };

    const company: any = nonMember
      ? { companyId: null, newCompany: { company_name: newCompanyName.trim(), brand_name: newBrandName.trim(), homepage_url: nmHomepage.trim(), contact_email: nmContactEmail.trim(), description: nmDescription.trim(), address: nmAddress.trim(), industry: nmIndustry, company_size: nmSize, founded_year: nmFounded, representative_name: nmRepresentative.trim(), company_phone: nmPhone.replace(/\D/g, ""), logo_url: null, cover_images: nmCover ? [{ url: nmCover }] : [] } }
      : { companyId, newCompany: null };
    const result = await onSubmit(payload, status, company);
    if (!result.success) {
      alert(result.error || (editId ? "공고 수정에 실패했습니다." : "공고 등록에 실패했습니다."));
      return;
    }
    setSaved(true);
    setTimeout(() => router.push(listHref), 1000);
  };

  // ── 복리후생 / 근무조건 (분리) ─────────────
  const welfareOptions = jobGroupType === "매장" ? WELFARE_OPTIONS.매장 : WELFARE_OPTIONS.기업;
  const workcondOptions = jobGroupType === "매장" ? WORKCOND_OPTIONS.매장 : WORKCOND_OPTIONS.기업;
  const welfareSel = benefitTags.filter((t) => welfareOptions.includes(t));
  const workcondSel = benefitTags.filter((t) => workcondOptions.includes(t));
  const toggleBenefit = (b: string) =>
    setBenefitTags(benefitTags.includes(b) ? benefitTags.filter((x) => x !== b) : [...benefitTags, b]);

  // ── 텍스트 항목 메타 ───────────────────────
  const benefitsLabel = jobGroupType === "매장" ? "근무조건·복지" : "복리후생";
  const textFieldMeta: Record<TextKey, { label: string; hint?: string; placeholder: string }> = {
    benefits: { label: "혜택·복지", placeholder: "복리후생·혜택을 입력하세요" },
    responsibilities: { label: "주요업무", placeholder: "주요 업무를 입력하세요" },
    description: {
      label: "포지션 소개",
      hint: detailImages.length > 0 ? "선택 (이미지로 대체됨)" : "필수 (이미지 없을 시)",
      placeholder: "이 포지션에 대한 소개를 입력하세요. 비워두고 상세 이미지로 대체할 수도 있어요.",
    },
    requirements: { label: "자격요건", placeholder: "필수 자격요건을 입력하세요" },
    preferred: { label: "우대사항", placeholder: "우대사항을 입력하세요" },
  };
  const textFields: TextKey[] = ["description", "responsibilities", "requirements", "preferred", "benefits"];

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
    career: form.career || "-",
    region: regionList.join(", "),
    employType: form.type || "정규직",
    deadline: (alwaysOpen || !form.deadline) ? "상시채용" : form.deadline.replace(/-/g, "."),
    salary: fmtSalary(),
    color: "#e8f0fe",
    description: form.description || "",
    requirements: form.requirements ? form.requirements.split("\n").filter(Boolean) : [],
    preferreds: form.preferred ? form.preferred.split("\n").filter(Boolean) : [],
    benefits: form.benefits ? form.benefits.split("\n").filter(Boolean) : benefitTags,
    responsibilities: form.responsibilities ? form.responsibilities.split("\n").filter(Boolean) : [],
    process: hiringProcess.filter((s) => s.trim()),
    notes: notes,
    logo_url: isNm ? null : cp?.logo_url,
    cover_images: isNm ? (nmCover ? [{ url: nmCover }] : []) : (cp?.cover_images || []),
    detailImages: detailImages,
    companyInfo: {
      name: previewCompanyName,
      brandName: isNm ? newBrandName : (cp?.brand_name || ""),
      industry: isNm ? nmIndustry : "",
      representative: isNm ? nmRepresentative : (cp?.representative_name || ""),
      companyType: jobGroupType === "매장" ? "매장·살롱" : "기업·브랜드",
      size: isNm ? nmSize : (cp?.company_size || ""),
      founded: isNm ? (nmFounded ? `${nmFounded}년` : "") : (cp?.founded_year || ""),
      phone: isNm ? nmPhone : (cp?.company_phone || ""),
      website: isNm ? nmHomepage : (cp?.website_url || ""),
      location: isNm ? nmAddress : (cp ? [cp.region_sido, cp.region_sigungu, cp.address].filter(Boolean).join(" ") : ""),
      latitude: null,
      longitude: null,
    },
    companyAddress: isNm ? nmAddress : (cp ? [cp.region_sido, cp.region_sigungu, cp.address].filter(Boolean).join(" ") : ""),
    workDaysText: workDaysNego ? "요일 협의" : (workDays.length ? workDays.join("·") : ""),
    workTimeText: workTimeNego ? "시간 협의" : (workTimeStart && workTimeEnd ? `${workTimeStart}~${workTimeEnd}` : ""),
  };

  return (
    <>
      <div className="admin-form-header">
        <button className="admin-back-btn" onClick={() => router.push(listHref)}>
          <ChevronLeft size={18} /> 목록으로
        </button>
        {!isMobile && (
          <h2 style={{ fontSize: "18px", fontWeight: 400, color: "#1a1a1a", margin: 0 }}>
            {editId ? "채용공고 수정" : "채용공고 등록"}
          </h2>
        )}
        <div className="admin-form-actions">
          <button className="admin-secondary-btn" onClick={() => handleSubmit("draft")}><Save size={15} /> 임시저장</button>
          <button className="admin-secondary-btn" onClick={() => setShowPreview(true)}><Eye size={15} /> 미리보기</button>
          {!isMobile && (
            <button className="company-primary-btn" onClick={() => handleSubmit("publish")}>
              {saved ? (editId ? "✅ 수정완료" : "✅ 등록완료") : (editId ? "공고 수정" : "공고 등록")}
            </button>
          )}
        </div>
      </div>

      {(
        <div style={{ width: "100%", maxWidth: 760, margin: "0 auto 16px", background: "#f6f3fb", border: "1px solid #e5e0eb", borderRadius: 10, padding: "12px 16px", boxSizing: "border-box" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#5f0080", marginBottom: 6 }}>{mode === "admin" ? "외부 공고 불러오기 (자동 작성)" : "타 사이트 공고 불러오기 (자동 작성)"}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="admin-form-input" style={{ flex: 1 }} placeholder="공고 URL 붙여넣기 (https://...)" value={parseUrl} onChange={(e) => setParseUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runParse(); } }} />
            <button type="button" onClick={runParse} disabled={parsing || curating} style={{ flexShrink: 0, padding: "0 20px", borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: parsing ? 0.6 : 1 }}>{parsing ? "불러오는 중..." : "불러오기"}</button>
            {mode === "admin" && (
              <button type="button" onClick={runCurate} disabled={parsing || curating} title="현재 채워진 내용을 뷰티워크 톤·형식으로 AI가 다듬어요"
                style={{ flexShrink: 0, padding: "0 16px", borderRadius: 8, border: "1px solid #5f0080", background: "#fff", color: "#5f0080", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: curating ? 0.6 : 1, whiteSpace: "nowrap" }}>{curating ? "다듬는 중..." : "✨ 큐레이션"}</button>
            )}
          </div>
          {parseMsg && <div style={{ fontSize: 12.5, marginTop: 6, color: parseMsg.startsWith("✓") ? "#10b981" : "#c0392b" }}>{parseMsg}</div>}
          {contactNotice && <div style={{ fontSize: 12.5, marginTop: 6, padding: "8px 10px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, color: "#9a3412", lineHeight: 1.5 }}>{contactNotice}</div>}
          {/* URL로 안 되는 사이트(AJAX·차단 등) 폴백: 본문 붙여넣기 */}
          <button type="button" onClick={() => setShowPaste((v) => !v)}
            style={{ marginTop: 6, background: "none", border: "none", color: "#5f0080", fontSize: 12, cursor: "pointer", padding: 0 }}>
            {showPaste ? "▲ 본문 붙여넣기 접기" : "▾ URL로 안 되거나 내용이 부실하면 · 공고 본문 붙여넣기"}
          </button>
          {showPaste && (
            <textarea
              style={{ width: "100%", marginTop: 8, minHeight: 110, padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e0eb", fontSize: 13, lineHeight: 1.5, resize: "vertical", boxSizing: "border-box" }}
              placeholder="공고 화면에 보이는 내용을 통째로 복사해 붙여넣고 '불러오기'를 누르세요. (급여·경력·근무조건 등 표 값까지 전체 복사). URL과 함께 넣으면 가장 정확해요."
              value={parseText}
              onChange={(e) => setParseText(e.target.value)}
            />
          )}
          {mode !== "admin" && <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>타 사이트에 올린 공고의 URL을 넣으면 제목·직군·경력·근무지역·자격요건 등 <b>공고 내용</b>이 자동으로 채워져요. 회사 정보는 등록된 기업 프로필을 사용합니다. 확인·수정 후 등록하세요.</div>}
          {mode === "admin" && nonMember && (
            <div style={{ display: "grid", gridTemplateColumns: applyMethod === "REDIRECT" ? "240px 1fr" : "240px", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1px solid #e5e0eb", alignItems: "end" }}>
              <div><div style={lbl}>지원방식</div><select style={sel} value={applyMethod} onChange={(e) => setApplyMethod(e.target.value as "MANAGED" | "EMAIL" | "REDIRECT")}><option value="MANAGED">관리자 대행</option><option value="EMAIL">이메일 중계</option><option value="REDIRECT">외부 링크형</option></select></div>
              {applyMethod === "REDIRECT" && (
                <div><div style={lbl}>외부 지원 URL <span style={{ color: "#e74c3c" }}>*</span></div><input style={inp} value={externalApplyUrl} onChange={(e) => setExternalApplyUrl(e.target.value)} placeholder="https://기업지원페이지" /></div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 비회원 기업 정보 입력은 폼 맨 하단으로 이동(프로필 양식과 동일 구성) */}

      {/* 공고 상단 이미지 — 미리보기(캐러셀) + 첨부·삭제 관리 한 곳에서 */}
      {(() => {
        const gimgs = [nmCover, ...detailImages.map((d) => d.url)].filter(Boolean);
        const guniq = [...new Set(gimgs)];
        // 썸네일 ×삭제: 커버면 다음 이미지를 커버로 승격, 아니면 상세이미지에서 제거
        const removeGImg = (u: string) => {
          if (u === nmCover) {
            if (detailImages.length) { setNmCover(detailImages[0].url); setDetailImages(detailImages.slice(1)); }
            else setNmCover("");
          } else {
            setDetailImages(detailImages.filter((d) => d.url !== u));
          }
        };
        return (
          <div style={{ width: "100%", maxWidth: 760, margin: "0 auto 16px", boxSizing: "border-box" }}>
            <h2 className="jobpost-section-title" style={{ marginLeft: 4 }}>공고 상단 이미지</h2>
            <div style={{ marginTop: 8, background: "#fff", border: "1px solid #ececef", borderRadius: 12, padding: "16px", boxSizing: "border-box" }}>
              {guniq.length > 0 && <ImageCarousel images={guniq} alt="공고 이미지" />}
              {/* 썸네일 + 작은 추가(+) 타일 — 직접 업로드는 드물어 최소 공간만 차지 */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: guniq.length > 0 ? 12 : 0, alignItems: "center" }}>
                {guniq.map((u, idx) => (
                  <div key={idx} style={{ position: "relative", width: 84 }}>
                    <img src={u} alt={`이미지 ${idx + 1}`} style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: "1px solid #eee" }} />
                    <button type="button" onClick={() => removeGImg(u)} title="삭제"
                      style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  </div>
                ))}
                <label title="이미지 추가"
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!uploading && detailImages.length < 5) processFiles(e.dataTransfer.files); }}
                  style={{ width: 84, height: 84, flexShrink: 0, border: `1.5px dashed ${dragOver ? "#5f0080" : "#c4b5d4"}`, borderRadius: 8, background: dragOver ? "#f4ebfb" : "#fdfbff", color: "#5f0080", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, cursor: uploading ? "wait" : "pointer" }}>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{uploading ? "…" : "+"}</span>
                  <span style={{ fontSize: 10 }}>추가</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading || detailImages.length >= 5} onChange={handleImageUpload} style={{ display: "none" }} />
                </label>
                {guniq.length === 0 && <span style={{ fontSize: 13, color: "#bbb" }}>불러온 이미지가 없어요. 필요하면 직접 추가하세요.</span>}
              </div>
              <p style={{ margin: "10px 2px 0", fontSize: 12, color: "#999" }}>맨 앞 이미지가 공개 화면 상단에 노출됩니다. 필요 없는 이미지는 ×로 삭제하세요.</p>
            </div>
          </div>
        );
      })()}

      <div className="admin-form-grid jobpost-form" style={{ width: "100%", maxWidth: 760, margin: "0 auto", gridTemplateColumns: "1fr", justifyContent: "stretch", justifyItems: "stretch" }}>
        {/* ═══ 왼쪽 컬럼: 기본정보 ═══ */}
        <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* 기본 정보 */}
          <h2 className="jobpost-section-title">기본 정보</h2>
          <div className="company-card" style={{ overflow: "visible" }}>
            <div className="admin-form-body">

              {mode === "admin" && (
                <div className="admin-form-row">
                  <label className="admin-form-label">기업 선택<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>

                  {/* 기업 선택 = 검색 가능 드롭다운 (기본값 비회원 + DB 회원사 목록) */}
                  <div style={{ position: "relative", justifySelf: "end", width: "100%", maxWidth: 320 }}>
                    <button type="button" onClick={() => setShowCompanyList((v) => !v)}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6,
                        padding: "4px 0", fontSize: 14, fontWeight: 400,
                        border: "none", background: "transparent", cursor: "pointer", textAlign: "right", boxSizing: "border-box" }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        color: (companyId || nonMember) ? "#333" : "#999" }}>
                        {companyId ? companyName : (nonMember ? (newCompanyName || "비회원 기업") : "기업명 검색")}
                      </span>
                      <ChevronDown size={16} color="#888" style={{ flexShrink: 0 }} />
                    </button>

                    {showCompanyList && (
                      <>
                        <div onClick={() => setShowCompanyList(false)} style={{ position: "fixed", inset: 0, zIndex: 19 }} />
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, marginTop: 4,
                          background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden" }}>
                          <div style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                            <input autoFocus className="admin-form-input" placeholder="기업명 검색"
                              value={companyQuery} onChange={(e) => setCompanyQuery(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} />
                          </div>
                          <div style={{ maxHeight: 240, overflowY: "auto" }}>
                            {/* 비회원 기업 (항상 맨 위, 기본값) */}
                            <div onClick={() => { setNonMember(true); setCompanyId(null); setCompanyName(""); setShowCompanyList(false); setCompanyQuery(""); }}
                              style={{ padding: "10px 14px", fontSize: 14, cursor: "pointer", borderBottom: "1px solid #f3f3f3", background: "#fff", color: "#333" }}>
                              비회원 기업{newCompanyName ? <span style={{ color: "#888" }}> · {newCompanyName}</span> : null}
                            </div>
                            {/* DB 회원사 목록 */}
                            {(() => {
                              const q = companyQuery.trim().toLowerCase();
                              const matched = companies.filter((c) =>
                                !q || c.company_name.toLowerCase().includes(q) || (c.brand_name || "").toLowerCase().includes(q)
                              ).slice(0, 50);
                              if (matched.length === 0) {
                                return <div style={{ padding: "10px 14px", fontSize: 13, color: "#999" }}>회원 기업이 없어요</div>;
                              }
                              return matched.map((c) => (
                                <div key={c.id}
                                  onClick={() => {
                                    setNonMember(false); setCompanyId(c.id);
                                    setCompanyName(c.company_name + (c.brand_name ? ` (${c.brand_name})` : ""));
                                    setShowCompanyList(false); setCompanyQuery("");
                                  }}
                                  style={{ padding: "10px 14px", fontSize: 14, cursor: "pointer", borderBottom: "1px solid #f3f3f3",
                                    background: companyId === c.id ? "#faf7fd" : "#fff", fontWeight: companyId === c.id ? 600 : 400 }}>
                                  {c.company_name}{c.brand_name ? <span style={{ color: "#888" }}> ({c.brand_name})</span> : null}
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="admin-form-row">
                <label className="admin-form-label">채용 유형{showTypeToggle && <span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span>}</label>
                {showTypeToggle ? (
                  <select className="admin-form-select" value={jobGroupType}
                    onChange={(e) => { setJobGroupType(e.target.value as "기업" | "매장"); setCategories([]); }}>
                    <option value="기업">기업·브랜드 채용</option>
                    <option value="매장">매장·살롱 채용</option>
                  </select>
                ) : (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px",
                  }}>
                    <span style={{ fontSize: "14px", fontWeight: 400, color: "#555" }}>
                      {jobGroupType === "기업" ? "🏢 기업·브랜드 채용" : "🏪 매장·살롱 채용"}
                    </span>
                  </div>
                )}
              </div>

              <div className="admin-form-row">
                <label className="admin-form-label">공고 제목<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>
                <input className="admin-form-input"
                  placeholder={jobGroupType === "매장" ? "예) 네일 아티스트 모집" : "예) 마케팅 매니저 (색조)"}
                  value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>

              <div className="admin-form-row">
                <label className="admin-form-label">
                  직군<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span>
                </label>
                <JobGroupField
                  jobType={jobGroupType === "기업" ? "OFFICE" : "STORE"}
                  value={categories} onChange={setCategories} maxSelect={5}
                  placeholder="직군을 선택해주세요" />
              </div>

              <div className="admin-form-row-2col">
                <div className="admin-form-row">
                  <label className="admin-form-label">경력<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>
                  <select className="admin-form-select" value={form.career}
                    onChange={(e) => setForm({ ...form, career: e.target.value })}>
                    <option value="">선택</option>
                    {CAREER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="admin-form-row">
                  <label className="admin-form-label">고용형태</label>
                  <select className="admin-form-select" value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {EMPLOYMENT_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="admin-form-row">
                <label className="admin-form-label">근무지역<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span><span style={{ fontSize: 11, fontWeight: 400, color: "#aaa", marginLeft: 4 }}>(필터용 시·군·구)</span></label>
                <button type="button" onClick={() => setRegionModalOpen(true)}
                  style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "6px", padding: 0, border: "none", background: "transparent", fontSize: "14px", color: regionList.length ? "#555" : "#bbb", cursor: "pointer" }}>
                  <span style={{ textAlign: "right" }}>
                    {regionList.length ? regionList.map(shortRegion).join(", ") : "지역을 선택해주세요"}
                  </span>
                  <span style={{ color: "#ccc", fontSize: "16px", flexShrink: 0 }}>›</span>
                </button>
              </div>

              {/* 근무지 상세 주소: 위 근무지역(시·군·구)과 겹치는 앞부분은 빼고 그 뒤만 표시. 지도·저장엔 전체 주소 사용 */}
              {nonMember && (() => {
                const sigungu = (regionList[0] || "").trim().split(/\s+/).pop() || "";
                const idx = sigungu && nmAddress.includes(sigungu) ? nmAddress.indexOf(sigungu) + sigungu.length : -1;
                const addrPrefix = idx >= 0 ? nmAddress.slice(0, idx).trim() : "";
                const addrDetail = idx >= 0 ? nmAddress.slice(idx).trim() : nmAddress;
                return (
                  <>
                    <div className="admin-form-row">
                      <label className="admin-form-label">근무지 상세 주소</label>
                      <input className="admin-form-input" value={addrDetail}
                        onChange={(e) => setNmAddress((addrPrefix ? addrPrefix + " " : "") + e.target.value)}
                        placeholder="도로명·번지 (동·층 등)" />
                    </div>
                    {nmAddress.trim() && (
                      <iframe title="근무지역 지도" width="100%" height={220}
                        style={{ border: 0, borderRadius: 12, marginTop: 4 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(nmAddress)}&output=embed&hl=ko`} />
                    )}
                  </>
                );
              })()}

              <div className="admin-form-row-2col">
                <div className="admin-form-row">
                  <label className="admin-form-label">{jobGroupType === "매장" ? "급여" : "연봉"}</label>
                  <div ref={salaryRef} style={{ position: "relative", width: "100%" }}>
                    <button type="button"
                      onClick={() => {
                        if (salaryModalOpen) { setSalaryModalOpen(false); return; }
                        setSalaryDraft(salaryNego ? "" : form.salary); setSalaryNegoDraft(salaryNego); setSalaryTypeDraft(salaryType); setSalaryModalOpen(true);
                      }}
                      style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "6px", padding: 0, border: "none", background: "transparent", fontSize: "14px", color: (salaryNego || form.salary) ? "#555" : "#bbb", cursor: "pointer" }}>
                      <span style={{ textAlign: "right" }}>
                        {(salaryNego || form.salary) ? fmtSalary() : "급여를 입력해주세요"}
                      </span>
                      <span style={{ color: "#ccc", fontSize: "16px", flexShrink: 0, transform: salaryModalOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>›</span>
                    </button>
                    {salaryModalOpen && (
                      <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", zIndex: 50, background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "14px", width: "260px" }}>
                        {/* 급여 단위 */}
                        <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                          {([["ANNUAL", "연봉"], ["MONTHLY", "월급"], ["WEEKLY", "주급"], ["HOURLY", "시급"]] as [string, string][]).map(([val, lbl]) => (
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
                            placeholder={salaryTypeDraft === "HOURLY" ? "예) 12,000" : salaryTypeDraft === "ANNUAL" ? "예) 4000" : "예) 250"}
                            value={salaryNegoDraft ? "" : salaryDraft}
                            onChange={(e) => setSalaryDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applySalary(); } }}
                            style={{ flex: 1, minWidth: 0, height: 40, boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "8px", padding: "0 12px", fontSize: "14px", textAlign: "left", background: salaryNegoDraft ? "#f5f5f5" : "#fff", color: "#333" }} />
                          <span style={{ fontSize: "13px", color: "#666", whiteSpace: "nowrap", flexShrink: 0 }}>{salaryTypeDraft === "HOURLY" ? "원" : "만원"}</span>
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
                </div>
                <div className="admin-form-row">
                  <label className="admin-form-label">마감일<span style={{ color: "#dc2626", marginLeft: "3px" }}>*</span></label>
                  <div ref={deadlineRef} style={{ position: "relative", width: "100%" }}>
                    <button type="button"
                      onClick={() => {
                        if (deadlineModalOpen) { setDeadlineModalOpen(false); return; }
                        setDeadlineDraft(alwaysOpen ? "" : form.deadline); setAlwaysOpenDraft(alwaysOpen); setDeadlineModalOpen(true);
                      }}
                      style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "6px", padding: 0, border: "none", background: "transparent", fontSize: "14px", color: (alwaysOpen || form.deadline) ? "#555" : "#bbb", cursor: "pointer" }}>
                      <span style={{ textAlign: "right" }}>
                        {alwaysOpen ? "상시채용" : form.deadline ? form.deadline.replace(/-/g, ".") : "마감일 선택"}
                      </span>
                      <span style={{ color: "#ccc", fontSize: "16px", flexShrink: 0, transform: deadlineModalOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>›</span>
                    </button>
                    {deadlineModalOpen && (
                      <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", zIndex: 50, background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "14px", width: "240px" }}>
                        <input type="date"
                          min={new Date().toISOString().slice(0, 10)}
                          value={alwaysOpenDraft ? "" : deadlineDraft}
                          disabled={alwaysOpenDraft}
                          onChange={(e) => setDeadlineDraft(e.target.value)}
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
              </div>

              {jobGroupType === "매장" && (
              <>
                {/* 근무 요일 (매장 전용) */}
                <div className="admin-form-row">
                  <label className="admin-form-label">근무 요일</label>
                  <div ref={workDaysRef} style={{ position: "relative", width: "100%" }}>
                    <button type="button" onClick={() => setWorkDaysOpen((v) => !v)}
                      style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "6px", padding: 0, border: "none", background: "transparent", fontSize: "14px", color: (workDaysNego || workDays.length) ? "#555" : "#bbb", cursor: "pointer" }}>
                      <span style={{ textAlign: "right" }}>{workDaysNego ? "요일 협의" : (workDays.length ? workDays.join("·") : "선택")}</span>
                      <span style={{ color: "#ccc", fontSize: "16px", flexShrink: 0, transform: workDaysOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>›</span>
                    </button>
                    {workDaysOpen && (
                      <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", zIndex: 50, background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "14px", width: "260px" }}>
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
                </div>

                {/* 근무 시간 */}
                <div className="admin-form-row">
                  <label className="admin-form-label">근무 시간</label>
                  <div ref={workTimeRef} style={{ position: "relative", width: "100%" }}>
                    <button type="button" onClick={() => setWorkTimeOpen((v) => !v)}
                      style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "6px", padding: 0, border: "none", background: "transparent", fontSize: "14px", color: (workTimeNego || (workTimeStart && workTimeEnd)) ? "#555" : "#bbb", cursor: "pointer" }}>
                      <span style={{ textAlign: "right" }}>{workTimeNego ? "시간 협의" : (workTimeStart && workTimeEnd ? `${workTimeStart}~${workTimeEnd}` : "선택")}</span>
                      <span style={{ color: "#ccc", fontSize: "16px", flexShrink: 0, transform: workTimeOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>›</span>
                    </button>
                    {workTimeOpen && (
                      <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", zIndex: 50, background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "14px", width: "260px" }}>
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
                </div>

              </>
              )}
            </div>
          </div>

        </div>

        {/* ═══ 오른쪽 컬럼: 상세이미지 + 상세내용 + 채용절차·비고 ═══ */}
        <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* 상세 내용 */}
          <h2 className="jobpost-section-title">상세 내용</h2>
          <div className="company-card" style={{ overflow: "visible" }}>
            <div className="admin-form-body">
              {/* 복리후생 (필터용) */}
              <div className="admin-form-row">
                <label className="admin-form-label">복리후생</label>
                <div ref={welfareRef} style={{ position: "relative", width: "100%" }}>
                  <button type="button" onClick={() => setWelfareOpen((v) => !v)}
                    style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "6px", padding: 0, border: "none", background: "transparent", fontSize: "14px", color: welfareSel.length ? "#555" : "#bbb", cursor: "pointer" }}>
                    <span style={{ textAlign: "right" }}>{welfareSel.length ? welfareSel.join(", ") : "선택해주세요"}</span>
                    <span style={{ color: "#ccc", fontSize: "16px", flexShrink: 0, transform: welfareOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>›</span>
                  </button>
                  {welfareOpen && (
                    <div style={{ position: "absolute", top: "100%", left: "-166px", right: 0, marginTop: "8px", zIndex: 50, background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "14px" }}>
                      <div className="benefit-chip-grid">
                        {welfareOptions.map((b) => (
                          <button key={b} type="button"
                            className={`benefit-chip ${benefitTags.includes(b) ? "on" : ""}`}
                            onClick={() => toggleBenefit(b)}>
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 근무조건 (필터용) */}
              <div className="admin-form-row">
                <label className="admin-form-label">근무조건</label>
                <div ref={workcondRef} style={{ position: "relative", width: "100%" }}>
                  <button type="button" onClick={() => setWorkcondOpen((v) => !v)}
                    style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "6px", padding: 0, border: "none", background: "transparent", fontSize: "14px", color: workcondSel.length ? "#555" : "#bbb", cursor: "pointer" }}>
                    <span style={{ textAlign: "right" }}>{workcondSel.length ? workcondSel.join(", ") : "선택해주세요"}</span>
                    <span style={{ color: "#ccc", fontSize: "16px", flexShrink: 0, transform: workcondOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>›</span>
                  </button>
                  {workcondOpen && (
                    <div style={{ position: "absolute", top: "100%", left: "-166px", right: 0, marginTop: "8px", zIndex: 50, background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "14px" }}>
                      <div className="benefit-chip-grid">
                        {workcondOptions.map((b) => (
                          <button key={b} type="button"
                            className={`benefit-chip ${benefitTags.includes(b) ? "on" : ""}`}
                            onClick={() => toggleBenefit(b)}>
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 상세 항목 (포지션 소개 / 자격요건 / 우대사항) → 라벨 + 아래 전체 내용, 팝오버 작성 */}
              {textFields.map((k) => {
                const meta = textFieldMeta[k];
                const content = ((form as any)[k] || "") as string;
                const filled = !!content.trim();
                const isReq = (k === "description" || k === "requirements") && detailImages.length === 0;
                const open = textModalKey === k;
                return (
                  <div key={k} style={{ padding: "18px 0", borderBottom: k === textFields[textFields.length - 1] ? "none" : "1px solid var(--color-border)" }}>
                    <div ref={open ? textPopRef : undefined} style={{ position: "relative" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <label className="admin-form-label" style={{ margin: 0 }}>
                          {meta.label}
                          {isReq && <span style={{ color: "#dc2626", marginLeft: "3px" }}>*</span>}
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                          {!filled && <span style={{ fontSize: "14px", color: "#bbb" }}>작성해주세요</span>}
                          <button type="button" className="resume-icon-btn" aria-label={filled ? "수정" : "작성"} title={filled ? "수정" : "작성"}
                            onClick={() => { if (open) setTextModalKey(null); else openTextModal(k); }}>
                            <Pencil size={15} />
                          </button>
                          {filled && (
                            <button type="button" className="resume-icon-btn danger" aria-label="삭제" title="삭제"
                              onClick={() => { if (confirm("작성한 내용을 삭제할까요?")) setForm({ ...form, [k]: "" }); }}>
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                      {open && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "8px", zIndex: 50, background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "14px" }}>
                          <textarea autoFocus
                            placeholder={meta.placeholder}
                            value={textModalValue}
                            onChange={(e) => setTextModalValue(e.target.value)}
                            style={{ width: "100%", minHeight: "160px", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", resize: "vertical", fontFamily: "inherit" }} />
                          <div style={{ display: "flex", gap: "6px", marginTop: "10px", justifyContent: "flex-end" }}>
                            <button type="button" className="admin-secondary-btn" style={{ padding: "6px 12px", fontSize: "13px" }} onClick={() => setTextModalKey(null)}>취소</button>
                            <button type="button" className="company-primary-btn" style={{ padding: "6px 14px", fontSize: "13px" }} onClick={saveTextModal}>저장</button>
                          </div>
                        </div>
                      )}
                    </div>
                    {filled && (
                      <p style={{ margin: "10px 0 0", fontSize: "14px", color: "#555", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                        {content}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 채용 담당자 — 외부공고에 채용 이메일이 있으면(또는 이메일 중계 선택 시) 노출 */}
          {mode === "admin" && nonMember && (nmContactEmail.trim() || nmManagerPhone.trim() || applyMethod === "EMAIL") && (
            <>
              <h2 className="jobpost-section-title">채용 담당자</h2>
              <div className="company-card" style={{ overflow: "visible" }}>
                <div className="admin-form-body">
                  <div className="admin-form-row">
                    <label className="admin-form-label">이름</label>
                    <input className="admin-form-input" value={nmManagerName} onChange={(e) => setNmManagerName(e.target.value)} placeholder="담당자명" />
                  </div>
                  <div className="admin-form-row">
                    <label className="admin-form-label">전화번호</label>
                    <input className="admin-form-input" value={nmManagerPhone} onChange={(e) => setNmManagerPhone(e.target.value)} placeholder="010-0000-0000" inputMode="numeric" />
                  </div>
                  <div className="admin-form-row">
                    <label className="admin-form-label">이메일</label>
                    <input className="admin-form-input" value={nmContactEmail} onChange={(e) => setNmContactEmail(e.target.value)} placeholder="hr@company.com" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 채용 절차 · 비고 (하단 높이 맞춤용 flex:1) */}
          <h2 className="jobpost-section-title">채용 절차</h2>
          <div className="company-card" style={{ overflow: "visible", flex: 1 }}>
            <div className="admin-form-body">

              {/* 채용 절차 */}
              <div className="admin-form-row">
                <div ref={processModalOpen ? processPopRef : undefined} style={{ position: "relative", width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <span style={{ fontSize: "14px", color: "#555" }}>채용 절차</span>
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <button type="button" className="resume-icon-btn" aria-label={processFilled ? "수정" : "설정"} title={processFilled ? "수정" : "설정"}
                        onClick={() => { if (processModalOpen) setProcessModalOpen(false); else openProcessModal(); }}>
                        <Pencil size={15} />
                      </button>
                      {processFilled && (
                        <button type="button" className="resume-icon-btn danger" aria-label="삭제" title="삭제"
                          onClick={() => { if (confirm("채용 절차를 삭제할까요?")) setHiringProcess([]); }}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "14px", color: processFilled ? "#555" : "#bbb", lineHeight: 1.6, whiteSpace: "normal", wordBreak: "break-word", textAlign: "left" }}>
                    {processFilled ? hiringProcess.join(" → ") : "채용절차를 선택해주세요"}
                  </div>
                  {processModalOpen && (
                    <div style={{ position: "absolute", top: "100%", left: "-166px", right: 0, marginTop: "8px", zIndex: 50, background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "14px", display: "flex", flexDirection: "column", gap: "16px" }}>
                      {/* 선택된 단계 */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 400, color: "#444" }}>선택된 단계</span>
                        {processDraft.length === 0 ? (
                          <div style={{ padding: "12px", border: "1.5px dashed #e0d4ee", borderRadius: "8px", fontSize: "13px", color: "#aaa", textAlign: "center" }}>아직 추가된 단계가 없어요.</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {processDraft.map((s, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", background: "#faf5ff", border: "1px solid #ede0f8", borderRadius: "8px" }}>
                                <span style={{ flexShrink: 0, width: "24px", height: "24px", borderRadius: "50%", background: "#5f0080", color: "#fff", fontSize: "12px", fontWeight: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                                <span style={{ flex: 1, fontSize: "14px", fontWeight: 400, color: "#5f0080" }}>{s}</span>
                                <button type="button" onClick={() => removeDraftStep(i)} style={{ flexShrink: 0, background: "none", border: "none", color: "#a78bba", cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: "0 4px" }}>×</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* 프리셋 칩 */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 400, color: "#444" }}>자주 쓰는 단계</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {(jobGroupType === "매장" ? PRESET_PROCESS.매장 : PRESET_PROCESS.기업).map((p) => {
                            const on = processDraft.includes(p);
                            return (
                              <button key={p} type="button" onClick={() => togglePreset(p)}
                                style={{ padding: "8px 14px", borderRadius: "999px", fontSize: "13px", fontWeight: 400, cursor: "pointer", border: on ? "1.5px solid #5f0080" : "1.5px solid #e0e0e0", background: on ? "#5f0080" : "#fff", color: on ? "#fff" : "#666" }}>
                                {on ? "✓ " : "+ "}{p}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {/* 직접 입력 */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 400, color: "#444" }}>직접 입력</span>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input style={{ flex: 1, height: 40, boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "8px", padding: "0 12px", fontSize: "14px" }}
                            placeholder="예) 포트폴리오 제출" value={processCustom}
                            onChange={(e) => setProcessCustom(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomStep(); } }} />
                          <button type="button" onClick={addCustomStep}
                            style={{ padding: "0 18px", borderRadius: "8px", border: "1.5px solid #5f0080", background: "#fff", color: "#5f0080", fontWeight: 400, fontSize: "14px", cursor: "pointer", whiteSpace: "nowrap" }}>추가</button>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button type="button" className="admin-secondary-btn" style={{ padding: "6px 12px", fontSize: "13px" }} onClick={() => setProcessModalOpen(false)}>취소</button>
                        <button type="button" className="company-primary-btn" style={{ padding: "6px 14px", fontSize: "13px" }} onClick={saveProcessModal}>저장</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 비고 · 유의사항 */}
              <div className="admin-form-row">
                <div ref={notesModalOpen ? notesPopRef : undefined} style={{ position: "relative", width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <span style={{ fontSize: "14px", color: "#555" }}>비고 · 유의사항</span>
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <button type="button" className="resume-icon-btn" aria-label={notesFilled ? "수정" : "작성"} title={notesFilled ? "수정" : "작성"}
                        onClick={() => { if (notesModalOpen) setNotesModalOpen(false); else openNotesModal(); }}>
                        <Pencil size={15} />
                      </button>
                      {notesFilled && (
                        <button type="button" className="resume-icon-btn danger" aria-label="삭제" title="삭제"
                          onClick={() => { if (confirm("비고를 삭제할까요?")) setNotes(""); }}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                  {notesModalOpen && (
                    <div style={{ position: "absolute", top: "100%", left: "-166px", right: 0, marginTop: "8px", zIndex: 50, background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "14px" }}>
                      <textarea autoFocus
                        placeholder={"지원 시 유의사항이나 안내문을 자유롭게 입력하세요.\n예) ※ 서류 합격자에 한하여 개별 연락드립니다."}
                        value={notesModalValue} onChange={(e) => setNotesModalValue(e.target.value)}
                        style={{ width: "100%", minHeight: "160px", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", resize: "vertical", fontFamily: "inherit" }} />
                      <div style={{ display: "flex", gap: "6px", marginTop: "10px", justifyContent: "flex-end" }}>
                        <button type="button" className="admin-secondary-btn" style={{ padding: "6px 12px", fontSize: "13px" }} onClick={() => setNotesModalOpen(false)}>취소</button>
                        <button type="button" className="company-primary-btn" style={{ padding: "6px 14px", fontSize: "13px" }} onClick={saveNotesModal}>저장</button>
                      </div>
                    </div>
                  )}
                </div>
                {notesFilled
                  ? <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#555", whiteSpace: "pre-wrap", lineHeight: 1.6, textAlign: "left" }}>{notes}</p>
                  : <div style={{ marginTop: "8px", fontSize: "14px", color: "#bbb", textAlign: "left" }}>작성해주세요</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 기업 정보 (맨 하단) · 기업회원 프로필 양식과 동일 구성 ═══ */}
      {mode === "admin" && nonMember && (
        <div style={{ width: "100%", maxWidth: 760, margin: "16px auto 0", boxSizing: "border-box" }}>
          <h2 className="jobpost-section-title">기업 정보</h2>
          <div style={{ fontSize: 12, color: "#999", margin: "0 0 8px 2px" }}>공고 상세 맨 아래 “기업 정보”에 표시돼요 · URL 불러오기로 자동 작성됩니다</div>
          <div className="jp-company-box" style={{ background: "#fff", border: "1px solid #ececef", borderRadius: 12, padding: "20px 24px", boxSizing: "border-box" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
            <div style={{ gridColumn: "1 / -1" }}><div style={lbl}>기업 소개</div><textarea ref={nmDescRef} style={{ ...inp, height: "auto", minHeight: 88, padding: "10px 12px", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, overflow: "hidden" }} value={nmDescription} onChange={(e) => setNmDescription(e.target.value)} placeholder="회사를 소개하는 글을 입력해주세요. 공고 상세의 '기업 정보'에 표시돼요." /></div>
            <div><div style={lbl}>회사명 <span style={{ color: "#e74c3c" }}>*</span></div><input style={inp} value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="회사명" /></div>
            <div><div style={lbl}>업종</div><select style={{ ...sel, color: nmIndustry ? "#333" : "#cfcfcf" }} value={nmIndustry} onChange={(e) => setNmIndustry(e.target.value)}><option value="">선택</option>{industryGroupsFor(jobGroupType === "매장" ? "STORE" : "OFFICE").flatMap((g) => g.items).map((it) => (<option key={it} value={it}>{it}</option>))}</select></div>
            <div><div style={lbl}>브랜드명</div><input style={inp} value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} placeholder="브랜드명 (선택)" /></div>
            <div><div style={lbl}>웹사이트</div><input style={inp} value={nmHomepage} onChange={(e) => setNmHomepage(e.target.value)} placeholder="https:// (선택)" /></div>
            <div style={{ gridColumn: "1 / -1" }}><div style={lbl}>주소</div><input style={inp} value={nmAddress} onChange={(e) => setNmAddress(e.target.value)} placeholder="회사 주소/지역 (선택)" /></div>
            <div><div style={lbl}>사원수</div><select style={{ ...sel, color: nmSize ? "#333" : "#cfcfcf" }} value={nmSize} onChange={(e) => setNmSize(e.target.value)}><option value="">선택</option>{["1~10명", "10~50명", "50~100명", "100~300명", "300~1000명", "1000명 이상"].map((s) => (<option key={s} value={s}>{s}</option>))}</select></div>
            <div><div style={lbl}>설립연도</div><input type="number" min="1900" max={new Date().getFullYear()} style={inp} value={nmFounded} onChange={(e) => setNmFounded(e.target.value)} placeholder="예) 2020" /></div>
            <div><div style={lbl}>대표자</div><input style={inp} value={nmRepresentative} onChange={(e) => setNmRepresentative(e.target.value)} placeholder="대표자명 (선택)" /></div>
            <div><div style={lbl}>회사 대표번호</div><input style={inp} value={nmPhone} onChange={(e) => setNmPhone(e.target.value)} placeholder="02-000-0000 (선택)" /></div>
            </div>
          </div>
        </div>
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
            <div style={{ padding: 0, maxHeight: "72vh", overflowY: "auto", background: "#faf7fc" }}>
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