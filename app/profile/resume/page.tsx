"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import { shortenRegion } from "@/lib/memberFormat";
import { 이력서흠찾기, type 흠 } from "@/lib/resumeCheck";
import CoverLetterTools from "@/components/profile/CoverLetterTools";
import { 이력서진행 } from "@/lib/resumeProgress";
import { AlertCircle } from "lucide-react";
import { Target, Briefcase, ChevronDown, Download, Eye, FileText, IdCard, Pencil, Plus, Printer, Quote, Trash2, Upload, X, ChevronRight } from "lucide-react";
import { useSignupStore } from "@/lib/store/signupStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { useAuthStore } from "@/lib/store/authStore";
import ApplicationDocument from "@/components/resume/ApplicationDocument";
import { downloadApplicationPdf, printApplication } from "@/lib/applicationPdf";
import ResumeEditor from "@/components/profile/ResumeEditor";
import { formatPhone } from "@/lib/phone";
import { compressPhoto, MAX_PHOTOS } from "@/lib/compressImage";

// 사진은 브라우저에서 156만 픽셀로 줄여 올린다(lib/compressImage).

function ResumePageContent() {
  const router = useRouter();
  const { name: signupName, birth, gender, job, jobCustom, phone, officeJobAreas, skillAreas, workTypePrefer, regionPrefer } = useSignupStore();
  const { userName } = useAuthStore();
  const name = signupName || userName || "";
  const {
    intro, coreCompetencies, coverLetter, educations, careers,
    skills, languages, experiences, links, email,
    isEntryLevel,
    setIntro, setCoreCompetencies, setCoverLetter, setEmail,
    addLink, updateLink, removeLink,
    addSkill, removeSkill,
    addLanguage, updateLanguage, removeLanguage,
    addExperience, updateExperience, removeExperience,
    addEducation, updateEducation, removeEducation,
    addCareer, updateCareer, removeCareer, certificates, removeCertificate, updateCertificate,
  } = useProfileStore();

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sectionsOpen, setSectionsOpen] = useState(true);
  useEffect(() => { setSectionsOpen(window.innerWidth >= 768); }, []);
  const [resumeType, setResumeType] = useState<"office" | "salon">("office");
  // 프로필에서 아직 안 채운 필수 항목. 하나라도 있으면 이력서를 쓸 수 없다.
  const [못채운것, set못채운것] = useState<string[]>([]);
  // 작성 완료를 누른 뒤 아직 못 채운 곳. 각 칸 위에 붙는다.
  const [흠, set흠] = useState<흠[]>([]);
  const 칸흠 = (어디: string) => 흠.filter((h) => h.어디 === 어디 && !h.누구).map((h) => h.말);
  const [introLocal, setIntroLocal] = useState(intro);
  const [coreLocal, setCoreLocal] = useState(coreCompetencies);
  const [coverLocal, setCoverLocal] = useState(coverLetter);
  // 희망급여는 프로필에서 정하는 값이라 여기서는 보여만 준다.
  const [pay, setPay] = useState<{ type: string | null; min: number | null }>({ type: null, min: null });
  // 희망 근무지역은 users.preferred_regions(배열)에 있다. 미리보기가 보던
  // user_profiles.region_prefer 는 비어 있어 그 줄이 통째로 빠졌다.
  const [희망지역, set희망지역] = useState("");
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/users/me/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        const pf = res?.data?.profile;
        if (pf) setPay({ type: pf.salary_type || null, min: pf.salary_min ? Number(pf.salary_min) : null });
      })
      .catch(() => {});
  }, []);
  // 서버/스토어에서 한줄소개가 뒤늦게 로드되면 입력값이 비어있을 때만 채움(작성 중이면 덮지 않음)
  useEffect(() => { setIntroLocal((prev) => prev || intro); }, [intro]);
  useEffect(() => { setCoverLocal((prev) => prev || coverLetter); }, [coverLetter]);
  const [emailLocal, setEmailLocal] = useState(email);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const [portfolioImages, setPortfolioImages] = useState<{ url: string; w?: number; h?: number }[]>([]);
  const [addressDisplay, setAddressDisplay] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [officeAreas, setOfficeAreas] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [resumeFileSize, setResumeFileSize] = useState<number | null>(null);
  const [isResumeFileUploading, setIsResumeFileUploading] = useState(false);
  const [careerModalOpen, setCareerModalOpen] = useState(false);
  const [editCareer, setEditCareer] = useState<any>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editLink, setEditLink] = useState<any>(null);
  const [eduModalOpen, setEduModalOpen] = useState(false);
  const [editEdu, setEditEdu] = useState<any>(null);
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [editLang, setEditLang] = useState<any>(null);
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [editExp, setEditExp] = useState<any>(null);
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [editCert, setEditCert] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 항목 접기/펴기 (경력·학력·자격증·활동) — 기본 접힘
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleExpand = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          // 프로필 필수항목 미완성 시 이력서 작성 불가 → 프로필로 안내 (모든 진입 경로 보호)
          const d = res.data;
          const missing: string[] = [];
          if (!d.avatar_url) missing.push("프로필 사진");
          if (!d.phone) missing.push("휴대전화");
          if (!d.birth_date) missing.push("생년월일");
          if (!d.gender) missing.push("성별");
          if (!d.email) missing.push("이메일");
          if (!d.address_road) missing.push("거주지");
          if (!Array.isArray(d.preferred_regions) || d.preferred_regions.length === 0) missing.push("희망 근무지역");
          if (Array.isArray(d.preferred_regions) && d.preferred_regions.length > 0) {
            set희망지역(d.preferred_regions
              .map((r: any) => shortenRegion([r.sido, r.sigungu].filter(Boolean).join(" ")))
              .filter(Boolean).join(", "));
          }
          if (d.job_type === "OFFICE" && (!Array.isArray(d.office_job_areas) || d.office_job_areas.length === 0)) missing.push("희망직군");
          // 예전에는 알림창을 띄우고 곧장 프로필로 튕겨 냈다. 이력서를 쓰러 온
          // 사람을 밀어내는 셈이라, 무엇이 비었는지 이 자리에서 보여주고
          // 채우러 갈지는 본인이 고르게 한다.
          if (missing.length > 0) {
            set못채운것(missing);
            return;
          }
          set못채운것([]);
          if (res.data.email) setEmailLocal(res.data.email);
          if (res.data.phone) setPhoneLocal(res.data.phone);
          if (res.data.job_type === "STORE") setResumeType("salon");
          else setResumeType("office");
          if (Array.isArray(res.data.portfolio_images)) setPortfolioImages(res.data.portfolio_images);
          if (res.data.avatar_url) setAvatarUrl(res.data.avatar_url);
          if (Array.isArray(res.data.office_job_areas)) setOfficeAreas(res.data.office_job_areas);
          if (res.data.resume_file_name) setResumeFileName(res.data.resume_file_name);
          if (res.data.resume_file_size) setResumeFileSize(res.data.resume_file_size);
          if (res.data.address_road) {
            setAddressDisplay(res.data.address_road + (res.data.address_detail ? ` ${res.data.address_detail}` : ""));
          }
        }
      })
      .catch(console.error);
  }, []);

  // 프로필에서 설정한 직군은 서버(officeAreas)에 저장됨 → 우선 사용
  const effectiveOfficeAreas = officeAreas.length ? officeAreas : officeJobAreas;
  // 희망 급여 — 미리보기와 같은 꼴(「월 400만원~」·「협의」).
  const 희망급여글 = (() => {
    if (!pay.min) return "협의";
    const 앞말 = pay.type === "ANNUAL" ? "연" : pay.type === "WEEKLY" ? "주" : pay.type === "DAILY" ? "일급" : pay.type === "HOURLY" ? "시급" : "월";
    const 숫자 = (pay.type === "HOURLY" || pay.type === "DAILY")
      ? `${Number(pay.min).toLocaleString()}원`
      : `${Math.round(Number(pay.min) / 10000).toLocaleString()}만원`;
    return `${앞말} ${숫자}~`;
  })();
  // 이력서엔 주 트랙(잡타입) 직군만 노출 — 겸업으로 담은 다른 트랙 직군은 표시 안 함
  const primaryArea = resumeType === "salon" ? skillAreas[0] : effectiveOfficeAreas[0];
  const jobDisplay =
    (job === "직접입력" ? jobCustom : job) ||
    primaryArea ||
    "직군 미설정";
  const birthDisplay = birth
    ? `${birth.slice(0, 4)}년 (${new Date().getFullYear() - Number(birth.slice(0, 4))}세, ${gender === "남성" ? "남" : "여"})`
    : "";

  // 경력 항목 기간 합산 → 총 경력 (겹치는 기간 중복 제거)
  const calcTotalCareer = () => {
    if (!careers || careers.length === 0) return "";
    const periods: [number, number][] = [];
    for (const c of careers) {
      const s = String(c.startDate || "").match(/(\d{4})[.\-/]?(\d{1,2})?/);
      if (!s) continue;
      const startM = Number(s[1]) * 12 + (Number(s[2] || "1") - 1);
      let endM: number;
      if (!c.endDate || c.endDate === "재직 중") {
        const now = new Date();
        endM = now.getFullYear() * 12 + now.getMonth();
      } else {
        const e = String(c.endDate).match(/(\d{4})[.\-/]?(\d{1,2})?/);
        if (!e) continue;
        endM = Number(e[1]) * 12 + (Number(e[2] || "1") - 1);
      }
      if (endM >= startM) periods.push([startM, endM]);
    }
    if (periods.length === 0) return "";
    periods.sort((a, b) => a[0] - b[0]);
    let totalMonths = 0;
    let [curS, curE] = periods[0];
    for (let i = 1; i < periods.length; i++) {
      const [s, e] = periods[i];
      if (s <= curE) { curE = Math.max(curE, e); }
      else { totalMonths += curE - curS; curS = s; curE = e; }
    }
    totalMonths += curE - curS;
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    if (years === 0 && months === 0) return "";
    if (years === 0) return `총 ${months}개월`;
    if (months === 0) return `총 ${years}년`;
    return `총 ${years}년 ${months}개월`;
  };
  const totalCareer = calcTotalCareer();

  // 프로필 페이지를 거치지 않고 이 주소로 바로 들어오면(새 기기·캐시 지운 뒤,
  // 북마크·알림 링크) 스토어가 비어 이력서가 통째로 빈 것처럼 보였다.
  // 한 번도 받아온 적이 없을 때만 받아온다 — 이미 있는 것을 다시 받으면
  // 저장하지 않은 편집분을 덮는다.
  useEffect(() => {
    if (!useProfileStore.getState().loaded) {
      useProfileStore.getState().loadFromServer();
    }
  }, []);

  // 손을 멈추면 1.5초 뒤 알아서 저장된다(profileStore 의 autoSync). 이 단추가
  // 하는 일은 저장이 아니라 필수 칸을 다 채웠는지 확인하는 것이다.
  //
  // 결과는 알림창이 아니라 그 칸 위에 붙인다. 창은 무엇이 비었는지 말하고
  // 사라지는데, 칸이 아홉이면 닫는 순간 어디였는지 잊는다.
  const handleSave = async () => {
    const 흠들 = 이력서흠찾기({
      본사냐: resumeType === "office",
      intro: introLocal, isEntryLevel, careers, educations, languages, skills,
    });
    set흠(흠들);
    if (흠들.length > 0) {
      const 첫 = document.getElementById(`section-${흠들[0].어디}`);
      첫?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setIntro(introLocal);
    setCoreCompetencies(coreLocal);
    setCoverLetter(coverLocal);
    setEmail(emailLocal);
    try {
      await useProfileStore.getState().syncToDb();
      alert("이력서 작성을 마쳤습니다.");
    } catch (e: any) {
      // 아직 못 받아온 상태면 그 이유를 그대로 알린다 — "다시 시도"만 권하면
      // 같은 자리에서 계속 실패한다.
      alert(e?.message?.includes("불러오지")
        ? "이력서를 아직 불러오지 못했어요. 새로고침한 뒤 다시 저장해 주세요."
        : "저장에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 사진 여러 장을 한 번에 올린다. 보내기 전에 브라우저에서 줄인다 —
  // 폰 사진은 장당 3~5MB라 그대로 보내면 올리다 지치고 저장소도 금세 찬다.
  const processPhotos = async (files: File[]) => {
    const token = localStorage.getItem("access_token");
    if (!token) { alert("로그인이 필요합니다."); return; }
    const 남은자리 = MAX_PHOTOS - portfolioImages.length;
    if (남은자리 <= 0) { alert(`사진은 최대 ${MAX_PHOTOS}장까지예요.`); return; }
    const 고른것 = files.filter((f) => /^image\//.test(f.type)).slice(0, 남은자리);
    if (!고른것.length) { alert("사진 파일만 올릴 수 있어요."); return; }
    if (files.length > 고른것.length) alert(`${MAX_PHOTOS}장까지만 올라가요. 앞의 ${고른것.length}장만 올립니다.`);

    setIsUploading(true);
    try {
      const formData = new FormData();
      for (const [i, f] of 고른것.entries()) {
        const { file: 줄인것, width, height } = await compressPhoto(f);
        formData.append("files", 줄인것);
        formData.append(`w${i}`, String(width));
        formData.append(`h${i}`, String(height));
      }
      const res = await fetch("/api/users/me/portfolio", {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      const data = await res.json();
      if (!data.success) { alert(data.error?.message || "업로드에 실패했어요."); return; }
      setPortfolioImages(data.data.portfolio_images || []);
    } catch (e) {
      console.error(e);
      alert("업로드 중 오류가 발생했어요.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 고른 것을 한 번에 지운다. 확인은 부른 쪽에서 이미 받았으므로 여기서 다시 묻지
  // 않는다 — 아홉 장을 지우려는데 확인창이 아홉 번 뜨면 지우다 만다.
  const handleDeletePhotos = async (urls: string[]) => {
    const token = localStorage.getItem("access_token");
    if (!token || !urls.length) return;
    let 마지막: { url: string }[] | null = null;
    for (const url of urls) {
      try {
        const res = await fetch(`/api/users/me/portfolio?url=${encodeURIComponent(url)}`, {
          method: "DELETE", headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) 마지막 = data.data.portfolio_images || [];
      } catch (e) {
        console.error(e);
      }
    }
    if (마지막) setPortfolioImages(마지막);
  };

  // 첨부 이력서 파일 업로드
  const processResumeFile = async (file: File) => {
    const token = localStorage.getItem("access_token");
    if (!token) { alert("로그인이 필요합니다."); return; }
    setIsResumeFileUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/users/me/resume-file", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!data.success) { alert(data.error?.message || "업로드에 실패했습니다."); return; }
      setResumeFileName(data.data.resume_file_name);
      setResumeFileSize(data.data.resume_file_size);
      alert("이력서 파일이 업로드되었습니다.");
    } catch (e) {
      console.error(e);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setIsResumeFileUploading(false);
    }
  };

  // 첨부 이력서 파일 삭제
  const handleDeleteResumeFile = async () => {
    if (!confirm("첨부한 이력서 파일을 삭제하시겠어요?")) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const res = await fetch("/api/users/me/resume-file", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) { alert("삭제에 실패했습니다."); return; }
      setResumeFileName(null);
      setResumeFileSize(null);
      alert("첨부 이력서가 삭제되었습니다.");
    } catch (e) {
      console.error(e);
    }
  };

  // 첨부 이력서 파일 열기 (비공개 버킷 -> signed URL)
  const handleOpenResumeFile = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const res = await fetch("/api/users/me/resume-file", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success || !data.data.preview_url) { alert("파일을 불러올 수 없습니다."); return; }
      window.open(data.data.preview_url, "_blank");
    } catch (e) {
      console.error(e);
      alert("파일을 여는 중 오류가 발생했습니다.");
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      setShowPreview(true);
      await new Promise((r) => setTimeout(r, 600));
      if (!previewRef.current) return;
      await downloadApplicationPdf(previewRef.current, name ? `${name}_이력서.pdf` : "이력서.pdf");
      setShowPreview(false);
    } catch (e) {
      alert("다운로드 중 오류가 발생했습니다.");
      setShowPreview(false);
    } finally {
      setIsDownloading(false);
    }
  };
  const handlePrint = async () => {
    if (!previewRef.current) return;
    try {
      await printApplication(previewRef.current);
    } catch (e) {
      alert("인쇄 준비 중 오류가 발생했습니다.");
    }
  };
  // URL ?action=preview 또는 ?action=download 자동 트리거
  const searchParams = useSearchParams();
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "preview") {
      setShowPreview(true);
    } else if (action === "download") {
      setTimeout(() => handleDownload(), 500);
    }
    if (action) {
      window.history.replaceState({}, "", "/profile/resume");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 완성도 계산은 lib/resumeProgress 한 곳에 있다 — 공고 상세의 지원 카드가
  // 같은 숫자를 보여야 해서다.
  const { 칸: 완성항목, 비율: progressRate } = 이력서진행({
    살롱: resumeType === "salon",
    isEntryLevel,
    careers, educations, certificates, experiences, languages,
    skills, portfolioImages, links,
  });

  return (
    <div className="resume-page">
      {/* 이력서만 다른 머리줄을 쓸 이유가 없다. 헤더 메뉴로 들어오는 화면이니
          들어온 자리의 머리줄이 그대로 있어야 길을 잃지 않는다.
          여기 있던 미리보기·다운로드는 왼쪽 사이드 아래로 내렸다. */}
      <Header />
      {/* 프로필이 덜 채워졌으면 이력서를 열지 않는다. 이름·연락처·주소가
          이력서에 그대로 실려 가는데, 비어 있으면 빈 이력서가 완성된 척
          만들어진다. 무엇이 비었는지 여기서 보여주고 채우러 갈지는 본인이
          고른다 — 예전에는 알림창을 띄우고 곧장 프로필로 밀어냈다. */}
      {못채운것.length > 0 ? (
        <div className="resume-gate">
          <h2>프로필을 먼저 채워 주세요</h2>
          <p>이력서의 이름·연락처·희망 근무지역은 프로필에서 그대로 가져옵니다.</p>
          <ul>
            {못채운것.map((m) => <li key={m}>{m}</li>)}
          </ul>
          <button type="button" onClick={() => router.push("/profile")}>
            프로필 채우러 가기 <ChevronRight size={16} />
          </button>
        </div>
      ) : (

      <>
      <div className="resume-layout">
        <aside className="resume-sidebar">
          <button
            type="button"
            className="resume-sidebar-toggle"
            onClick={() => setSectionsOpen((o) => !o)}
            aria-expanded={sectionsOpen}
          >
            <span className="resume-sidebar-title">섹션 구성</span>
            <ChevronDown size={18} style={{ color: "#888", transform: sectionsOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {(() => {
            // 살롱 채용에서 실제로 보는 순서. 학력·활동수상은 뒤로 접어 두므로
            // 매장 이력서에서는 값이 있을 때만 목록에 세운다 — 안 쓸 칸이
            // 완성도를 깎으면 아무리 채워도 100%가 안 된다.
            // 매장·본사가 같은 순서를 쓴다. 편집 화면·미리보기·이 목록이
            // 서로 다른 차례로 서 있으면 같은 이력서를 세 번 새로 읽게 된다.
            const sections = 완성항목;
            const doneCount = sections.filter((s) => s.done).length;
            const rate = progressRate;
            return (
              <>
                <div className="resume-completion">
                  <div className="resume-completion-head">
                    <span>완성도</span>
                    <strong>{rate}%</strong>
                  </div>
                  <div className="resume-completion-bar">
                    <div className="resume-completion-fill" style={{ width: `${rate}%` }} />
                  </div>
                  <p className="resume-completion-text">{doneCount}/{sections.length} 항목 완료</p>
                </div>
                {sectionsOpen && sections.map((sec) => (
                  <button
                    key={sec.id}
                    className={`resume-sidebar-item ${sec.done ? "done" : ""} ${activeSection === sec.id ? "active" : ""}`}
                    onClick={() => {
                      setActiveSection(sec.id);
                      const el = document.getElementById(`section-${sec.id}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    <span className="resume-sidebar-check">{sec.done ? "✓" : "○"}</span>
                    {sec.label}
                  </button>
                ))}
              </>
            );
          })()}
          {/* 머리줄에서 내려온 두 버튼. 다 채운 뒤에 누르는 것이라 목록 아래가 맞다. */}
        </aside>

        <main className="resume-editor">
          <div className="resume-mobile-progress">
            <div className="rmp-head">
              <span>완성도</span>
              <strong>{progressRate}%</strong>
            </div>
            <div className="rmp-bar">
              <div className="rmp-fill" style={{ width: `${progressRate}%` }} />
            </div>
          </div>

          {/* 다 채운 뒤에 누르는 것이라 본문 오른쪽 위에 둔다. 사이드는 어디까지
              채웠는지 보는 자리라 성격이 다르다. */}
          <div className="resume-top-actions">
            {/* 채용공고의 '매장 채용공고 95건' 자리다 — 단추만 오른쪽에 떠
                있으면 그 줄이 무엇에 관한 줄인지 왼쪽이 비어 있다.
                '기본' 이 무슨 뜻인지 여기서 한 줄로 밝힌다. 이 화면만 보면
                이력서가 하나뿐인 줄 알고, 공고마다 고쳐 낼 수 있다는 것을
                지원하기를 눌러 보기 전에는 모른다. */}
            <div className="resume-top-head">
              <h1 className="resume-top-title">기본 이력서</h1>
              <p className="resume-top-desc">공고에 지원할 때 이 이력서를 불러와, 그 자리에 맞게 고쳐서 냅니다.</p>
            </div>
            <div className="resume-top-btns">
              <button className="resume-side-preview" onClick={() => setShowPreview(true)}>
                <Eye size={15} /><span>미리보기</span>
              </button>
              <button className="resume-side-download" onClick={handleDownload} disabled={isDownloading}>
                <Download size={15} />
                <span>{isDownloading ? "저장 중..." : "다운로드"}</span>
              </button>
            </div>
          </div>
          <section id="section-headline" className="resume-section">
            <h2 className="resume-section-title"><Quote size={16} className="resume-section-icon" />한줄소개<span style={{ color: "#e74c3c", marginLeft: "3px" }}>*</span></h2>
            <흠줄 말들={칸흠("headline")} />
            {/* 안내는 칸 안에 둔다. 밖에 한 줄을 더 세우면 적기도 전에 읽을
                것이 둘이 되고, 다 적고 나면 그 줄만 남아 자리를 먹는다.
                채용 담당자가 가장 먼저 읽는 줄이라 예시는 매장·본사로 가른다. */}
            <input
              value={introLocal}
              onChange={(e) => setIntroLocal(e.target.value)}
              placeholder={resumeType === "office"
                ? "몇 년차에 무엇을 잘하는지 (예: 7년차 뷰티 MD · 신제품 기획)"
                : "몇 년차에 어떤 시술을 하는지 (예: 5년차 네일 아티스트 · 젤·아트)"}
              maxLength={60}
              style={{ width: "100%", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", color: "#333" }}
            />
          </section>

          <section id="section-basic" className="resume-section">
            <h2 className="resume-section-title"><IdCard size={16} className="resume-section-icon" />기본 정보</h2>
            <div className="resume-basic-info" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
              <div className="resume-name-block" style={{ flex: 1, minWidth: 0 }}>
                {/* 위쪽 여백을 따로 주지 않는다. 제목 아래 간격은 다른 구역과 같이
                    .resume-section-title 이 맡고, 여기서 또 띄우면 이 칸만 벌어진다. */}
                <h3 className="resume-name" style={{ fontSize: "15px", fontWeight: 400 }}>{name || "이름"}</h3>
                {/* 직군은 여기 없다 — 미리보기의 '희망 근무 조건'으로 옮겼다.
                    이미 그렇게 따로 갈라서 보여 주고 있었는데(office_job_areas
                    전부를 칩으로), 여기는 값 하나만 이 줄에 욱여넣고 있었다. */}
                <p className="resume-job-line">{birthDisplay}</p>
                <p className="resume-contact">{formatPhone(phone || phoneLocal)}</p>
                {emailLocal && <p className="resume-contact">{emailLocal}</p>}
                {addressDisplay && <p className="resume-contact">{addressDisplay}</p>}
              </div>
              {/* 사진 위 테두리를 이름 첫 줄과 나란히 둔다. 예전엔 -22px 로 끌어올려
                  제목 옆까지 올라가 있어, 이름과 높이가 맞지 않았다. */}
              {avatarUrl && (
                <div style={{ flexShrink: 0, width: "100px", height: "128px", borderRadius: "4px", overflow: "hidden", border: "1px solid #e0e0e0", background: "#f5f5f5" }}>
                  <img src={avatarUrl} alt="프로필" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
            </div>
          </section>

          {/* 희망 근무 조건 — 미리보기와 지원서에는 실려 나가는데 이 화면에만
              없었다. 프로필에서 오는 값이라 여기서 고치지 않고 보여만 준다. */}
          <section id="section-cond" className="resume-section">
            <h2 className="resume-section-title"><Target size={16} className="resume-section-icon" />희망 근무 조건</h2>
            <div className="rp-cond">
              <span className="rp-cond-k">희망 근무지</span>
              <span className="rp-cond-v">{희망지역 || regionPrefer || "—"}</span>
              {workTypePrefer && (<><span className="rp-cond-k">근무형태</span><span className="rp-cond-v">{workTypePrefer}</span></>)}
              <span className="rp-cond-k">희망직군</span>
              <span className="rp-cond-v">{[...(resumeType === "salon" ? skillAreas : effectiveOfficeAreas)].join(", ") || "—"}</span>
              <span className="rp-cond-k">희망 급여</span>
              <span className="rp-cond-v">{희망급여글}</span>
            </div>
            <a className="resume-cond-edit" href="/profile" target="_blank" rel="noopener">프로필에서 수정</a>
          </section>

          <ResumeEditor
            resumeType={resumeType}
            흠={흠}
            emailLocal={emailLocal}
            setEmailLocal={setEmailLocal}
            portfolioImages={portfolioImages}
            isUploading={isUploading}
            onPortfolioFiles={processPhotos}
            onPortfolioDelete={handleDeletePhotos}
            resumeFileName={resumeFileName}
            resumeFileSize={resumeFileSize}
            isResumeFileUploading={isResumeFileUploading}
            onResumeFile={processResumeFile}
            onResumeFileDelete={handleDeleteResumeFile}
            onResumeFileOpen={handleOpenResumeFile}
          />

          {/* 자기소개서 — 선택. 미용은 자소서를 길게 쓰는 문화가 아니라 필수로 두면
              여기서 이탈한다. 한줄소개가 이미 첫인상을 맡고 있고, 이 칸은 지원할 때
              불러다 고쳐 쓰는 밑글이다. */}
          <section id="section-cover" className="resume-section">
            <h2 className="resume-section-title"><Quote size={16} className="resume-section-icon" />자기소개서</h2>
            {/* 공고 없이 쓰는 밑글이라 공고 정보는 넘기지 않는다 — 지원할 때
                그 공고에 맞춰 다시 쓸 수 있다. */}
            <CoverLetterTools value={coverLocal} onChange={setCoverLocal} />
            <textarea
              value={coverLocal}
              onChange={(e) => setCoverLocal(e.target.value)}
              rows={7}
              placeholder="지원할 때 이 글을 불러와 공고에 맞게 고쳐 쓸 수 있어요"
              style={{ width: "100%", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "10px 12px",
                fontSize: "14px", color: "#333", lineHeight: 1.7, resize: "vertical",
                fontFamily: "inherit" }}
            />
          </section>

          <div className="resume-bottom-save">
            <button className="resume-save-btn-full" onClick={handleSave}>작성 완료</button>
          </div>
        </main>
      </div>
      </>
      )}

      {showPreview && (
        <div className="rp-modal-overlay">
          <div className="rp-modal myapp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rp-modal-header">
              <h2 className="rp-modal-title">이력서 미리보기</h2>
              <div className="rp-modal-actions">
                <button
                  className="resume-action-btn"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  <Download size={16} />
                  <span>{isDownloading ? "저장 중..." : "PDF 다운로드"}</span>
                </button>
                <button className="resume-action-btn" onClick={handlePrint}>
                  <Printer size={16} />
                  <span>인쇄</span>
                </button>
                
                <button className="rp-modal-close" onClick={() => setShowPreview(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="rp-modal-body">
              <ApplicationDocument
                ref={previewRef}
                resume={{
                  name,
                  birthDisplay,
                  addressDisplay,
                  jobDisplay,
                  phone: formatPhone(phone || phoneLocal),
                  email: emailLocal || email,
                  intro: introLocal || intro,
                  coreCompetencies: "",
                  coverLetter: coverLocal || coverLetter,
                  careers,
                  educations,
                  skills,
                  languages,
                  experiences,
                  links,
                  portfolioImages,
                  avatarUrl,
                  resumeType,
                  officeJobAreas: effectiveOfficeAreas,
                  skillAreas,
                  certificates,
                  workTypePrefer,
                  salaryType: pay.type,
                  salaryMin: pay.min,
                  regionPrefer: 희망지역 || regionPrefer,
                }}
              />
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
}
function 흠줄({ 말들 }: { 말들: string[] }) {
  if (!말들.length) return null;
  return (<>{말들.map((m) => (<p key={m} className="if-alert"><AlertCircle size={14} />{m}</p>))}</>);
}

export default function ResumePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>로딩 중...</div>}>
      <ResumePageContent />
    </Suspense>
  );
}
