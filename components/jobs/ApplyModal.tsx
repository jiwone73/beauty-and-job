"use client";
import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { useProfileStore, type 이력서한벌 } from "@/lib/store/profileStore";
import { shortenRegion } from "@/lib/memberFormat";
import { addressRegion } from "@/lib/regionShort";
import { 전화꼴 } from "@/lib/phoneFormat";
import { IdCard, Target, Quote } from "lucide-react";
import CoverLetterTools from "@/components/profile/CoverLetterTools";
import { useSignupStore } from "@/lib/store/signupStore";
import { useAuthStore } from "@/lib/store/authStore";
import ResumeEditor from "@/components/profile/ResumeEditor";
import { SALARY_TYPE_LABEL } from "@/lib/salary";
import ApplicationDocument from "@/components/resume/ApplicationDocument";
import { compressPhoto, MAX_PHOTOS } from "@/lib/compressImage";

type Step = "write" | "preview" | "edit";

export default function ApplyModal({
  jobId,
  jobBrand,
  jobTitle,
  isExternal,
  positionTitle,
  workLocation,
  onClose,
  onApplied,
}: {
  jobId: string;
  jobBrand?: string;
  jobTitle?: string;
  isExternal?: boolean;
  /** 카드에서 고른 자리. 지원 건에 그대로 박힌다. */
  positionTitle?: string;
  workLocation?: string;
  onClose: () => void;
  onApplied: () => void;
}) {
  const { userName } = useAuthStore();
  const { name: signupName, birth, gender, job, jobCustom, officeJobAreas, skillAreas, workTypePrefer, regionPrefer, phone } = useSignupStore();
  const {
    intro, coreCompetencies, coverLetter: 기본자소서, careers, educations, skills, languages, experiences, links, certificates, email,
    isEntryLevel, entryExperience,
  } = useProfileStore();

  /* 임시저장. 창을 닫으면 사본은 사라지므로(기본 이력서로 되돌리니까) 고치던
     것을 어딘가 붙들어 둬야 한다. 서버(사람 + 공고 키)에 둔다 — 브라우저에
     두면 폰에서 쓰다 만 것을 PC에서 이어 쓸 수 없다. 계정은 같은데 그릇이
     다르면 못 찾는다. */
  const [희망지역, set희망지역] = useState("");
  // 생년월일·성별은 가입 store 에만 있어 예전에 가입한 사람은 비어 있었다.
  // 미리보기에 빈 줄이 생기고 수정 화면에는 아예 안 보였다.
  const [생년, set생년] = useState("");
  const [성별, set성별] = useState("");
  // 희망직군의 원본이 둘로 갈려 있다 — 매장은 user_profiles.skill_areas,
  // 본사는 users.office_job_areas. 가입 때 담아 둔 store 값만 보면 예전에
  // 가입한 사람은 「희망 근무 조건」에서 직군 줄이 통째로 빠졌다.
  const [직군매장, set직군매장] = useState<string[] | null>(null);
  const [직군본사, set직군본사] = useState<string[] | null>(null);
  // 희망 급여만은 이 창에서 그 자리에서 고친다. 이력서에 박힌 사실이 아니라
  // 이 매장에 내는 조건이라, 공고를 보고 올리고 내리는 값이다. 고친 값은 이
  // 지원서에만 실리고 프로필의 희망급여는 그대로 둔다.
  const [급여유형, set급여유형] = useState("MONTHLY");
  const [급여만, set급여만] = useState("");
  const [급여협의, set급여협의] = useState(false);
  const 급여배수 = 급여유형 === "HOURLY" || 급여유형 === "DAILY" ? 1 : 10000;
  // 「협의」는 0원으로 적는다(프로필과 같은 규칙). 비워 둔 것(아직 안 정함)과
  // 협의로 정한 것이 갈라져야 다시 열 때도 그대로 선다.
  const 희망급여 = {
    type: 급여유형,
    min: 급여협의 ? 0 : (급여만 ? Number(급여만) * 급여배수 : null),
  };
  const [초안됨, set초안됨] = useState(false);   // 이번에 불러온 초안이 있나
  const [방금저장, set방금저장] = useState(false);
  const 초안준비 = useRef(false);               // 원본을 뜨기 전에는 쓰지 않는다

  const [step, setStep] = useState<Step>("write");
  const [coverLetter, setCoverLetter] = useState("");
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [applying, setApplying] = useState(false);
  const [consent, setConsent] = useState(false);

  // 기본 정보 (이력서 페이지와 동일하게 /api/users/me 에서)
  const [emailLocal, setEmailLocal] = useState(email);
  const [resumeType, setResumeType] = useState<"office" | "salon">("office");
  const [portfolioImages, setPortfolioImages] = useState<{ url: string; w?: number; h?: number }[]>([]);
  // 이 지원서에만 안 싣는 사진. 파일은 그대로 둔다 — 지우면 지난 지원서의
  // 스냅샷까지 깨지므로, 진짜 삭제는 기본 이력서에서만 한다.
  const [뺀사진, set뺀사진] = useState<string[]>([]);
  // 이 지원서에만 안 싣는 줄(경력·학력·자격증·활동·어학·SNS). 「경력:id」 꼴로
  // 담는다. 여기서는 더하지 못하게 했으니 지우기도 두지 않는다 — 빼고,
  // 되돌리는 것까지가 이 창이 할 수 있는 전부다.
  const [뺀줄, set뺀줄] = useState<string[]>([]);
  const 안뺀것 = <T extends { id: string }>(종류: string, arr: T[]) =>
    arr.filter((x) => !뺀줄.includes(`${종류}:${x.id}`));
  const 실을사진 = portfolioImages.filter((i) => !뺀사진.includes(i.url));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [addressDisplay, setAddressDisplay] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [resumeFileSize, setResumeFileSize] = useState<number | null>(null);
  const [isResumeFileUploading, setIsResumeFileUploading] = useState(false);

  const name = signupName || userName || "";

  // 모달 열린 동안 배경 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* 여기서 고치는 것은 이 공고에 낼 사본이다. 기본 이력서는 이력서 페이지에서만
     바뀐다. 그런데 수정 화면은 이력서 페이지와 같은 store·같은 편집기를 쓰고,
     store 는 손을 멈추면 1.5초 뒤 알아서 서버로 보낸다 — 그대로 두면 글자
     하나만 고쳐도 기본 이력서가 덮인다.

     그래서 창이 열려 있는 동안 저장을 잠그고, 열 때 한 벌 떠 두었다가 닫을 때
     되돌린다. 회사에 가는 것은 지원할 때 보내는 사본으로 서버가 뜬 스냅샷이다. */
  const 뜬이력서 = useRef<이력서한벌 | null>(null);
  // 프로필에서 온 처음 급여. 이것과 같으면 붙들어 둘 것이 없다.
  const 첫급여 = useRef<string | null>(null);
  // 초안이 되살렸거나 사람이 손댄 급여는 프로필 값으로 덮지 않는다. 둘은 따로
  // 오므로(초안은 초안대로, 프로필은 프로필대로) 늦게 온 쪽이 이기면 이 공고에
  // 맞춰 적어 둔 값이 소리 없이 사라진다.
  const 급여잠금 = useRef(false);
  useEffect(() => {
    useProfileStore.getState().자동저장잠금(true);
    return () => {
      const 사본 = 뜬이력서.current;
      if (사본) useProfileStore.getState().이력서되돌리기(사본);
      useProfileStore.getState().자동저장잠금(false);
    };
  }, []);

  /** 프로필에서 오는 값(희망 급여·희망직군)을 다시 읽는다. 프로필 창에서
   *  고치고 돌아왔을 때도 부른다. */
  const 프로필읽기 = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/users/me/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        const pf = res?.data?.profile;
        if (!pf) return;
        if (!급여잠금.current) {
          if (pf.salary_type) set급여유형(pf.salary_type);
          if (pf.salary_min !== null && pf.salary_min !== undefined && Number(pf.salary_min) === 0) {
            set급여협의(true);
          } else if (pf.salary_min) {
            const 배수 = pf.salary_type === "HOURLY" || pf.salary_type === "DAILY" ? 1 : 10000;
            set급여만(String(Math.round(Number(pf.salary_min) / 배수)));
            set급여협의(false);
          }
        }
        첫급여.current = JSON.stringify({
          type: pf.salary_type || "MONTHLY",
          min: pf.salary_min === null || pf.salary_min === undefined ? null : Number(pf.salary_min),
        });
        if (Array.isArray(pf.skill_areas)) set직군매장(pf.skill_areas);
        if (Array.isArray(pf.office_job_areas) && pf.office_job_areas.length > 0) set직군본사(pf.office_job_areas);
      })
      .catch(() => {});
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (!res?.success) return;
        const d = res.data;
        if (d.phone) setPhoneLocal(d.phone);
        if (d.email) setEmailLocal(d.email);
        if (d.birth_date) set생년(String(d.birth_date).slice(0, 10));
        if (d.gender) set성별(d.gender);
        setAddressDisplay(
          [d.address_road, d.address_detail].filter(Boolean).join(" ") ||
          [d.region_sido, d.region_sigungu].filter(Boolean).join(" ")
        );
        if (Array.isArray(d.preferred_regions) && d.preferred_regions.length > 0) {
          set희망지역(d.preferred_regions
            .map((r: any) => shortenRegion([r?.sido, r?.sigungu].filter(Boolean).join(" ")))
            .filter(Boolean).join(", "));
        }
      })
      .catch(() => {});
  }, []);
  const 돌아올때 = useRef<null | (() => void)>(null);
  useEffect(() => () => { 돌아올때.current?.(); }, []);

  // 모달 열릴 때: store 로드 + 기본정보 + 최근 자소서
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    // 서버에서 받아온 뒤에 떠야 한다 — 그 전 store 는 다른 화면이 남긴 것일 수 있다.
    useProfileStore.getState().loadFromServer().then(async () => {
      // 되돌릴 원본은 언제나 방금 받아온 기본 이력서다. 초안을 뜨면
      // 창을 닫을 때 초안이 기본 이력서 자리에 눌러앉는다.
      뜬이력서.current = useProfileStore.getState().이력서뽑기();
      try {
        const dr = await fetch(`/api/jobs/${jobId}/apply-draft`, { headers: { Authorization: `Bearer ${token}` } });
        const dd = await dr.json();
        const 초안 = dd?.data?.draft;
        if (초안?.resume) {
          useProfileStore.getState().이력서되돌리기(사본풀기(초안.resume));
          // 「이 지원서에서 뺀 사진」도 붙들어 둔 것에 함께 담긴다 — 창을 닫았다
          // 다시 열었을 때 뺐던 사진이 도로 나오면 매번 다시 빼야 한다.
          if (Array.isArray(초안.resume.뺀사진)) set뺀사진(초안.resume.뺀사진);
          if (Array.isArray(초안.resume.뺀줄)) set뺀줄(초안.resume.뺀줄);
          const 초안급여 = 초안.resume?.profile || {};
          if (초안급여.salary_type) set급여유형(초안급여.salary_type);
          if (초안급여.salary_type || 초안급여.salary_min !== null && 초안급여.salary_min !== undefined) 급여잠금.current = true;
          if (초안급여.salary_min !== null && 초안급여.salary_min !== undefined) {
            const 값 = Number(초안급여.salary_min);
            set급여협의(값 === 0);
            const 배수 = 초안급여.salary_type === "HOURLY" || 초안급여.salary_type === "DAILY" ? 1 : 10000;
            set급여만(값 > 0 ? String(Math.round(값 / 배수)) : "");
          }
          set초안됨(true);
        }
        if (초안?.cover_letter) { setCoverLetter(초안.cover_letter); setCoverLoaded(true); }
      } catch {}
      초안준비.current = true;
    });

    프로필읽기();

    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          if (res.data.email) setEmailLocal(res.data.email);
          setResumeType(res.data.job_type === "STORE" ? "salon" : "office");
          if (Array.isArray(res.data.portfolio_images)) setPortfolioImages(res.data.portfolio_images);
          if (Array.isArray(res.data.office_job_areas) && res.data.office_job_areas.length > 0) {
            set직군본사((prev) => (prev && prev.length ? prev : res.data.office_job_areas));
          }
          if (res.data.avatar_url) setAvatarUrl(res.data.avatar_url);
          if (res.data.phone) setPhoneLocal(res.data.phone);
          setAddressDisplay(
            [res.data.address_road, res.data.address_detail].filter(Boolean).join(" ") ||
            [res.data.region_sido, res.data.region_sigungu].filter(Boolean).join(" ")
          );
          // 희망 근무지는 users.preferred_regions 가 원본이다. store 의
          // regionPrefer(user_profiles.region_prefer)는 비어 있어, 미리보기에서
          // 「희망 근무 조건」이 통째로 빠져 보였다.
          if (Array.isArray(res.data.preferred_regions) && res.data.preferred_regions.length > 0) {
            set희망지역(res.data.preferred_regions
              .map((r: any) => shortenRegion([r?.sido, r?.sigungu].filter(Boolean).join(" ")))
              .filter(Boolean).join(", "));
          }
          if (res.data.resume_file_name) setResumeFileName(res.data.resume_file_name);
          if (res.data.resume_file_size) setResumeFileSize(res.data.resume_file_size);
        }
      })
      .catch(console.error);

    // 프로필을 새 창에서 고치고 돌아오면 새로 읽는다 — 여기서는 못 고치게 해
    // 두었으니, 고치고 온 값이 그대로 남아 있으면 고쳐지지 않은 줄 안다.
    const 돌아옴 = () => { if (!document.hidden) 프로필읽기(); };
    window.addEventListener("focus", 돌아옴);
    document.addEventListener("visibilitychange", 돌아옴);
    돌아올때.current = () => {
      window.removeEventListener("focus", 돌아옴);
      document.removeEventListener("visibilitychange", 돌아옴);
    };

    if (!coverLoaded) setCoverLoaded(true);
  }, []);

  const jobDisplay = (job === "직접입력" ? jobCustom : job) || officeJobAreas[0] || skillAreas[0] || "직군 미설정";
  // 희망 급여 — 이력서 미리보기와 같은 꼴로 적는다(「월 400만원~」·「협의」).
  const 희망급여표시 = (() => {
    const { type, min } = 희망급여;
    if (!min) return "협의";
    const 앞말 = type === "ANNUAL" ? "연" : type === "WEEKLY" ? "주" : type === "DAILY" ? "일급" : type === "HOURLY" ? "시급" : "월";
    const 숫자 = (type === "HOURLY" || type === "DAILY")
      ? `${Number(min).toLocaleString()}원`
      : `${Math.round(Number(min) / 10000).toLocaleString()}만원`;
    return `${앞말} ${숫자}~`;
  })();
  const 생년월일 = 생년 || birth;
  const 성별값 = 성별 || gender;
  const birthDisplay = 생년월일
    ? `${생년월일.slice(0, 4)}년 (${new Date().getFullYear() - Number(생년월일.slice(0, 4))}세, ${성별값 === "남성" || 성별값 === "MALE" ? "남" : "여"})`
    : "";

  // 포트폴리오 사진 업로드/삭제 (수정 화면용) — 이력서 화면과 같은 규칙을 쓴다.
  const processPhotos = async (files: File[]) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const 남은자리 = MAX_PHOTOS - portfolioImages.length;
    if (남은자리 <= 0) { alert(`사진은 최대 ${MAX_PHOTOS}장까지예요.`); return; }
    const 고른것 = files.filter((f) => /^image\//.test(f.type)).slice(0, 남은자리);
    if (!고른것.length) { alert("사진 파일만 올릴 수 있어요."); return; }
    setIsUploading(true);
    try {
      const fd = new FormData();
      for (const [i, f] of 고른것.entries()) {
        const { file: 줄인것, width, height } = await compressPhoto(f);
        fd.append("files", 줄인것);
        fd.append(`w${i}`, String(width));
        fd.append(`h${i}`, String(height));
      }
      const res = await fetch("/api/users/me/portfolio", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (data.success) setPortfolioImages(data.data.portfolio_images || []);
      else alert(data.error?.message || "업로드 실패");
    } finally {
      setIsUploading(false);
    }
  };
  // 고른 것을 한 번에 지운다. 확인은 부른 쪽에서 이미 받았다.
  const handleDeletePhotos = async (urls: string[]) => {
    const token = localStorage.getItem("access_token");
    if (!token || !urls.length) return;
    let 마지막: { url: string }[] | null = null;
    for (const url of urls) {
      const res = await fetch(`/api/users/me/portfolio?url=${encodeURIComponent(url)}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) 마지막 = data.data.portfolio_images || [];
    }
    if (마지막) setPortfolioImages(마지막);
  };

  // 첨부 이력서 파일 업로드
  const processResumeFile = async (file: File) => {
    const token = localStorage.getItem("access_token");
    if (!token) { alert("로그인이 필요합니다."); return; }
    setIsResumeFileUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/users/me/resume-file", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (!data.success) { alert(data.error?.message || "업로드에 실패했습니다."); return; }
      setResumeFileName(data.data.resume_file_name);
      setResumeFileSize(data.data.resume_file_size);
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
    const res = await fetch("/api/users/me/resume-file", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) { setResumeFileName(null); setResumeFileSize(null); }
  };

  // 첨부 이력서 파일 열기
  const handleOpenResumeFile = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const res = await fetch("/api/users/me/resume-file", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success || !data.data.preview_url) { alert("파일을 불러올 수 없습니다."); return; }
      window.open(data.data.preview_url, "_blank");
    } catch (e) {
      console.error(e);
      alert("파일을 여는 중 오류가 발생했습니다.");
    }
  };

  /** 지금 화면에 든 이력서를 서버가 알아듣는 꼴로 싼다.
   *  기본 이력서를 저장할 때(profileStore.syncToDb)와 같은 모양이라야
   *  서버가 같은 코드로 스냅샷을 뜰 수 있다. 더하기만 누르고 비워 둔 줄은
   *  빼고 보낸다 — 남의 화면에 빈 줄로 나가면 안 된다. 임시저장도 같은
   *  모양을 그대로 쓴다 — 저장 API 를 두 벌 두지 않으려는 것이다. */
  const 사본싸기 = (뺀것도빼고 = true) => {
    const 빼기 = <T extends { id: string }>(종류: string, arr: T[]) => (뺀것도빼고 ? 안뺀것(종류, arr) : arr);
    const s = useProfileStore.getState();
    const sg = useSignupStore.getState();
    const 알맹이 = (v: unknown) => String(v ?? "").trim().length > 0;
    return {
      profile: {
        intro: s.intro,
        core_competencies: s.coreCompetencies,
        entry_experience: s.entryExperience,
        is_career_verified: s.isCareerVerified,
        verified_date: s.verifiedDate,
        is_entry_level: s.isEntryLevel,
        skills: 뺀것도빼고 ? s.skills.filter((k) => !뺀줄.includes(`skill:${k}`)) : s.skills,
        skill_areas: sg.skillAreas || [],
        work_type_prefer: sg.workTypePrefer || "",
        region_prefer: sg.regionPrefer || "",
        office_job_areas: sg.officeJobAreas || [],
        salary_type: 급여유형,
        salary_min: 희망급여.min,
      },
      careers: 빼기("career", s.careers).filter((c) => 알맹이(c.company)),
      educations: 빼기("education", s.educations).filter((e) => 알맹이(e.school)),
      experiences: 빼기("experience", s.experiences).filter((x) => 알맹이(x.title)),
      languages: 빼기("language", s.languages).filter((l) => 알맹이(l.language)),
      links: 빼기("link", s.links).filter((l) => 알맹이(l.url)),
      certificates: 빼기("certificate", s.certificates).filter((c) => 알맹이(c.name)),
    };
  };
  /** 사본싸기() 의 반대 방향. 서버에 둔 초안을 store 가 쓰는 모양으로 되돌린다.
   *  email 은 이 모양에 없다 — 초안을 되살릴 때는 지금 store 의 email 을 그대로
   *  둔다(임시저장이 email 을 다루지 않으므로). */
  const 사본풀기 = (서버꼴: any): 이력서한벌 => {
    const p = 서버꼴?.profile || {};
    return {
      isCareerVerified: !!p.is_career_verified,
      verifiedDate: p.verified_date || "",
      careers: 서버꼴?.careers || [],
      educations: 서버꼴?.educations || [],
      experiences: 서버꼴?.experiences || [],
      skills: p.skills || [],
      languages: 서버꼴?.languages || [],
      links: 서버꼴?.links || [],
      certificates: 서버꼴?.certificates || [],
      intro: p.intro || "",
      coreCompetencies: p.core_competencies || "",
      coverLetter: p.cover_letter || "",
      email: useProfileStore.getState().email,
      isEntryLevel: !!p.is_entry_level,
      entryExperience: p.entry_experience || "",
    };
  };

  const 첫자소서 = useRef<string | null>(null);
  const 초안쓰기 = async () => {
    if (!초안준비.current) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const 지금 = useProfileStore.getState().이력서뽑기();
    // 기본 이력서와 한 글자도 다르지 않고 자소서도 그대로면 붙들어 둘 것이
    // 없다. 남겨 두면 다음에 열 때 '임시저장한 사본' 이라며 기본 이력서와
    // 똑같은 것을 되살려 놓고, 무엇이 사본인지 알 수 없게 된다.
    const 같은이력서 = JSON.stringify(지금) === JSON.stringify(뜬이력서.current) && 뺀사진.length === 0 && 뺀줄.length === 0
      && (첫급여.current === null || 첫급여.current === JSON.stringify(희망급여));
    const 같은자소서 = 첫자소서.current === null || 첫자소서.current === coverLetter;
    try {
      if (같은이력서 && 같은자소서) {
        await fetch(`/api/jobs/${jobId}/apply-draft`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        return;
      }
      await fetch(`/api/jobs/${jobId}/apply-draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resume: { ...사본싸기(false), 뺀사진, 뺀줄 }, cover_letter: coverLetter }),
      });
    } catch (e) {
      console.error("[apply-draft]", e);
    }
  };
  // 손을 멈추면 알아서 붙들어 둔다. 단추를 누르지 않고 창을 닫아도
  // 고치던 것이 사라지지 않게 — 단추는 그것을 눈으로 확인하는 자리다.
  useEffect(() => {
    if (!초안준비.current) return;
    const t = setTimeout(초안쓰기, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [뺀사진, 뺀줄, 급여유형, 급여만, 급여협의, intro, coreCompetencies, careers, educations, skills, languages, experiences,
      links, certificates, email, isEntryLevel, entryExperience, coverLetter]);

  // 이력서에 담아 둔 기본 자소서를 밑글로 깐다. 빈 칸에서 다시 쓰게 하면 대부분
  // 빈칸으로 낸다 — 두세 줄 고쳐 내는 것이 실제로 쓰이는 방식이다. 초안이나 손대던
  // 글이 있으면 건드리지 않는다.
  useEffect(() => {
    if (!coverLoaded || coverLetter) return;
    if (!기본자소서?.trim()) return;
    setCoverLetter(기본자소서);
    // 밑글을 깐 것은 사람이 쓴 것이 아니다 — 이 값을 처음 값으로 삼아야, 손대지
    // 않고 창을 닫았을 때 「고치던 자소서가 있어요」라는 초안이 생기지 않는다.
    첫자소서.current = 기본자소서;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverLoaded, 기본자소서]);

  // 자소서가 다 차려진 뒤의 값을 처음 값으로 삼는다(템플릿·이전 자소서·초안).
  useEffect(() => {
    if (초안준비.current && 첫자소서.current === null) 첫자소서.current = coverLetter;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverLoaded, 초안됨]);

  const 손으로임시저장 = () => {
    초안쓰기();
    set방금저장(true);
    setTimeout(() => set방금저장(false), 2000);
  };

  // 지원하기 = 이력서 저장(syncToDb) → 지원 API(스냅샷 박제)
  const handleApply = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) { alert("로그인이 필요합니다."); return; }
    setApplying(true);
    try {
      // 예전에는 스냅샷을 화면과 맞추려고 먼저 저장했다. 그 한 줄 때문에
      // 이 공고에 맞춘 손질이 기본 이력서에까지 남았다. 이제는 사본을 그대로
      // 실어 보내고, 서버가 그것으로 스냅샷을 뜬다.
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cover_letter: coverLetter.trim() || null, resume: 사본싸기(),
          portfolio_images: 실을사진,
          position_title: positionTitle || null, work_location: workLocation || null }),
      });
      const data = await res.json();
      if (!data.success) {
        if (data.error?.code === "APP_002") {
          alert(data.error.message);
          return;
        }
        alert(data.error?.message || "지원에 실패했습니다.");
        return;
      }
      // 임시저장 사본은 서버가 지원 API 안에서 지운다(같은 자리, 같은 트랜잭션
      // 옆에서 — 이 창이 닫히기 전에 실패해도 서버 쪽은 이미 끝나 있다).
      alert("지원이 완료되었습니다!");
      onApplied();
      onClose();
    } catch (e) {
      console.error(e);
      alert("지원 중 오류가 발생했습니다.");
    } finally {
      setApplying(false);
    }
  };

  // 큰 모달 (미리보기·수정 시 넓게)
  const wide = true;

  return (
    <div className="cv-overlay">
      <div
        className="cv-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: wide ? 860 : 480,
          width: "100%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="cv-header">
          <div style={{ width: 36 }} />
          <h2 className="cv-title">
            {step === "write" ? "지원하기" : step === "preview" ? "지원서 미리보기" : "지원서 수정하기"}
          </h2>
          <button className="cv-close" onClick={onClose}>✕</button>
        </div>

        <div className="cv-body" style={{ overflowY: "auto", flex: 1 }}>
          {/* 진행 단계 — 이름은 그 자리에서 실제로 하는 일과 같아야 한다.
              지원정보 확인은 자기소개서와 한 화면에 있다(위쪽 묶음). 화면을
              나누면 확인만 하고 한 번 더 누르게 되어, 같은 화면에 두고 1번을
              지나온 것으로 둔다. */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "2px 0 16px", flexWrap: "wrap" }}>
            {["지원정보 확인", "자기소개서 작성", "미리보기/수정", "제출"].map((label, i) => {
              const current = step === "write" ? 1 : 2;
              const active = i <= current;
              return (
                <Fragment key={label}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 400,
                      background: active ? "#582681" : "#eee",
                      color: active ? "#fff" : "#aaa",
                    }}>{i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 400, color: active ? "#582681" : "#aaa" }}>{label}</span>
                  </div>
                  {i < 3 && <span style={{ width: 20, height: 1, background: "#ddd", flexShrink: 0 }} />}
                </Fragment>
              );
            })}
          </div>
          <div className="apply-modal-job">
            <strong>{jobBrand}</strong>
            <p>{jobTitle}</p>
          </div>

          {/* ===== 화면 1: 작성 ===== */}
          {step === "write" && (
            <>
              {/* 되살린 것이 무엇인지 첫 화면에서 밝힌다. 예전에는 이 알림이
                  「지원서 수정하기」 화면에만 있어, 임시저장한 사람이 다시 열었을
                  때 그것이 올라온 줄 모르고 처음부터 다시 썼다. */}
              {초안됨 && (
                <div style={{ margin: "0 0 14px", padding: "10px 12px", borderRadius: 8,
                  background: "#f7f4fa", fontSize: 13, color: "#6b6570" }}>
                  임시저장해 둔 사본을 불러왔어요.
                </div>
              )}
              {/* 지원 정보 — 매장이 실제로 연락하는 값이다. 옛 번호가 그대로면
                  지원 자체가 헛일이 되는데, 지금까지는 미리보기 이력서 본문에
                  섞여 있어 따로 확인하는 자리가 없었다.
                  번호와 메일은 여기서 못 고친다 — 둘 다 본인 확인을 거쳐야
                  바뀌는 값이라, 고치는 자리로 보내는 것이 맞다. */}
              <div className="apply-info">
                <div className="apply-info-head"><span><IdCard size={16} className="resume-section-icon" />지원 정보</span></div>
                {/* 포지션은 매장이 공고에 적어 둔 값이라 내가 고치는 것이 아니다.
                    아래 세 줄(내 프로필에서 오는 값)과 선으로 갈라, 고치러 가는
                    길이 포지션에까지 걸리지 않게 한다. */}
                {(positionTitle || workLocation) && (
                  <div className="apply-info-row is-post"><span>지원분야</span><b>{[positionTitle, workLocation ? addressRegion(workLocation) : ""].filter(Boolean).join(" · ")}</b></div>
                )}
                <div className="apply-info-row">
                  <span>이름</span><b>{name}</b>
                  <a className="apply-info-edit" href="/profile" target="_blank" rel="noopener">프로필에서 수정</a>
                </div>
                <div className="apply-info-row"><span>연락처</span><b>{전화꼴(phoneLocal || phone) || "—"}</b></div>
                <div className="apply-info-row"><span>이메일</span><b>{emailLocal || email || "—"}</b></div>
              </div>

              <div style={{ padding: 0 }}>
              {/* 위 지원 정보·희망 근무 조건과 같은 옷 — 이 칸만 제 스타일을
                  들고 있어 아이콘도 크기도 어긋나 있었다. */}
              <h2 className="resume-section-title" style={{ marginBottom: 12 }}>
                <Quote size={16} className="resume-section-icon" />자기소개서
              </h2>
              {/* 추천 문구 칩 넉 장을 지웠다 — 같은 자리에 글 만드는 방법이 둘이면
                  어느 것을 눌러야 하는지부터 고르게 된다. AI 초안 하나로 모은다. */}
              <CoverLetterTools value={coverLetter} onChange={setCoverLetter}
                jobId={jobId} positionTitle={positionTitle} workLocation={workLocation} />
              <textarea className="apply-textarea"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder={`이 회사·포지션에 지원하는 이유와 본인의 강점을 작성해주세요.`}
                maxLength={2000}
                style={{ width: "100%", minHeight: 320, padding: 12, borderRadius: 8, border: "1px solid #ddd", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
              />
              <div style={{ textAlign: "right", fontSize: 12, color: "#aaa", marginTop: 4 }}>
                {coverLetter.length}/2000자
              </div>
              </div>
              <div style={{ padding: 0 }}>
                <button className="cv-btn-primary" style={{ width: "100%" }} onClick={() => setStep("preview")}>
                  미리보기 후 지원하기
                </button>
              </div>
            </>
          )}

          {/* ===== 화면 2: 미리보기 (자소서 + 전체 이력서) ===== */}
          {step === "preview" && (
            <>
              <div className="apply-preview-doc" style={{ marginBottom: 4 }}>
                <ApplicationDocument
                제출본
                  coverLetter={coverLetter}
                  지원분야={[positionTitle, workLocation ? addressRegion(workLocation) : ""].filter(Boolean).join(" · ")}
                  resume={{
                    name,
                    birthDisplay,
                    addressDisplay,
                    jobDisplay,
                    phone: phoneLocal || phone,
                    email: emailLocal || email,
                    intro,
                    coreCompetencies: "",
                    careers: 안뺀것("career", careers),
                    educations: 안뺀것("education", educations),
                    skills: skills.filter((k) => !뺀줄.includes(`skill:${k}`)),
                    languages: 안뺀것("language", languages),
                    experiences: 안뺀것("experience", experiences),
                    links: 안뺀것("link", links),
                    portfolioImages: 실을사진,
                    resumeFileName: null, // 첨부 이력서 숨김 처리(미리보기/전송 문서에서 제외)
                    avatarUrl,
                    resumeType,
                    officeJobAreas: 직군본사 ?? officeJobAreas,
                    skillAreas: 직군매장 ?? skillAreas,
                    certificates: 안뺀것("certificate", certificates),
                    workTypePrefer,
                    regionPrefer: 희망지역 || regionPrefer,
                    salaryType: 희망급여.type,
                    salaryMin: 희망급여.min,
                  }}
                />
              </div>

              {/* 문서가 끝나는 자리 — 선과 여백이 없으면 이 알림이 자기소개서의
                  마지막 문단처럼 붙어 읽힌다. */}
              <p style={{ fontSize: 12, color: "#888", margin: "24px 0 14px", paddingTop: 18,
                borderTop: "1px solid #ececee", lineHeight: 1.6 }}>
                지원하면 위 이력서와 자기소개서가 그대로 전송·저장됩니다. 제출 후에는 수정할 수 없어요.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {/* 둘이 같은 폭으로 선다 — 되돌아가는 길과 내는 길은 무게가 같다. */}
                <button
                  onClick={() => setStep("edit")}
                  style={{ flex: "1 1 0", minWidth: 0, padding: "13px 0", borderRadius: 8, border: "1px solid #582681", background: "#fff", color: "#582681", fontSize: 15, fontWeight: 400, cursor: "pointer" }}
                >
                  수정하기
                </button>
                <button
                  className="cv-btn-primary"
                  style={{ flex: "1 1 0", minWidth: 0, width: "auto", marginTop: 0 }}
                  disabled={applying}
                  onClick={handleApply}
                >
                  {applying ? "제출 중..." : "제출"}
                </button>
              </div>
            </>
          )}

          {/* ===== 화면 3: 이력서 수정 ===== */}
          {step === "edit" && (
            <>
              {/* 기본 정보와 희망 근무 조건은 프로필에서 오는 값이라 여기서
                  고치지 않는다 — 이 창에서 고치면 이 공고에 낼 사본에만 남고
                  프로필은 그대로라, 다음 공고에 또 같은 것을 고쳐야 한다.
                  고치는 자리로 보내고, 돌아오면 새로 읽어 온다. */}
              <div className="apply-info" style={{ marginTop: 8 }}>
                <div className="apply-info-head"><span><IdCard size={16} className="resume-section-icon" />지원 정보</span></div>
                {/* 어느 자리에 내는 것인지가 이 화면에도 있어야 한다 — 공고에
                    분야가 여럿이면 고치는 내내 무엇에 맞추는지 잊는다.
                    공고 화면에서는 「모집분야」다 — 거기는 매장이 쓴 글이고
                    여기는 내가 내는 서류라, 화자가 달라 이름도 갈린다. */}
                {(positionTitle || workLocation) && (
                  <div className="apply-info-row is-post"><span>지원분야</span><b>{[positionTitle, workLocation ? addressRegion(workLocation) : ""].filter(Boolean).join(" · ")}</b></div>
                )}
                {/* 한 줄 소개는 미리보기 맨 위에 나가는 글이다 — 경력처럼 이
                    공고에 맞춰 고칠 수 있어야 한다. */}
                <div className="apply-info-row">
                  <span>한 줄 소개</span>
                  <input className="apply-info-in" value={intro} maxLength={60}
                    placeholder="나를 한 줄로 소개해 주세요"
                    onChange={(e) => useProfileStore.getState().setIntro(e.target.value)} />
                </div>
                <div className="apply-info-row">
                  <span>이름</span><b>{name}</b>
                  <a className="apply-info-edit" href="/profile" target="_blank" rel="noopener">프로필에서 수정</a>
                </div>
                {birthDisplay && <div className="apply-info-row"><span>생년월일</span><b>{birthDisplay}</b></div>}
                <div className="apply-info-row"><span>연락처</span><b>{전화꼴(phoneLocal || phone) || "—"}</b></div>
                <div className="apply-info-row"><span>이메일</span><b>{emailLocal || email || "—"}</b></div>
                {addressDisplay && <div className="apply-info-row"><span>거주지</span><b>{addressDisplay}</b></div>}
              </div>

              <div className="apply-info">
                <div className="apply-info-head"><span><Target size={16} className="resume-section-icon" />희망 근무 조건</span></div>
                <div className="apply-info-row">
                  <span>희망 근무지</span><b>{희망지역 || regionPrefer || "—"}</b>
                  <a className="apply-info-edit" href="/profile" target="_blank" rel="noopener">프로필에서 수정</a>
                </div>
                <div className="apply-info-row"><span>희망직군</span><b>{[...(직군매장 ?? skillAreas), ...(직군본사 ?? officeJobAreas)].join(", ") || "—"}</b></div>
                {workTypePrefer && <div className="apply-info-row"><span>근무형태</span><b>{workTypePrefer}</b></div>}
                {/* 프로필 화면과 같은 인라인 — 고르고, 적고, 협의를 켠다.
                    여기서 고친 값은 이 지원서에만 실린다. */}
                <div className="apply-info-row">
                  <span>희망 급여</span>
                  <b className="pf-pay" style={{ paddingLeft: 0, overflow: "visible" }}>
                    <select className="pf-pay-sel" value={급여유형}
                      onChange={(e) => { 급여잠금.current = true; set급여유형(e.target.value); }}>
                      {Object.entries(SALARY_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <input className="pf-pay-in" inputMode="numeric" value={급여만}
                      placeholder="숫자만 입력" disabled={급여협의}
                      onChange={(e) => { 급여잠금.current = true; set급여만(e.target.value.replace(/[^0-9]/g, "")); }} />
                    <span className="pf-pay-unit">{급여유형 === "HOURLY" || 급여유형 === "DAILY" ? "원" : "만원"}</span>
                    <label className="pf-pay-nego">
                      <input type="checkbox" checked={급여협의}
                        onChange={(e) => { 급여잠금.current = true; set급여협의(e.target.checked); set급여만(""); }} />
                      협의
                    </label>
                  </b>
                </div>
              </div>

              {/* 되살린 것이 무엇인지 밝힌다. 말없이 채워 두면 기본 이력서가
                  이런 줄 알고, 여기서 고친 것이 저쪽에도 남은 줄 안다. */}
              {초안됨 && (
                <div style={{ margin: "0 0 14px", padding: "10px 12px", borderRadius: 8,
                  background: "#f7f4fa", fontSize: 13, color: "#6b6570" }}>
                  임시저장해 둔 사본을 불러왔어요.
                </div>
              )}
              <div className="apply-resume-wrap" style={{ borderTop: "1px solid #eee", paddingTop: 16 }}>
                <ResumeEditor
                  resumeType={resumeType}
                  emailLocal={emailLocal}
                  setEmailLocal={setEmailLocal}
                  portfolioImages={실을사진}
                  isUploading={isUploading}
                  onPortfolioFiles={processPhotos}
                  onPortfolioDelete={async (urls) => set뺀사진((p) => Array.from(new Set([...p, ...urls])))}
                  resumeFileName={resumeFileName}
                  resumeFileSize={resumeFileSize}
                  isResumeFileUploading={isResumeFileUploading}
                  onResumeFile={processResumeFile}
                  onResumeFileDelete={handleDeleteResumeFile}
                  onResumeFileOpen={handleOpenResumeFile}
                  resumeFileReadOnly
                  빼기전용
                  뺀줄={뺀줄}
                  on빼기={(열쇠) => set뺀줄((p) => Array.from(new Set([...p, 열쇠])))}
                  on되돌리기={(열쇠) => set뺀줄((p) => p.filter((k) => k !== 열쇠))}
                  portfolioReadOnly
                  portfolioExcludeOnly
                />
              </div>

              {/* 자기소개서는 맨 끝 — 이력서·미리보기와 같은 차례다. */}
              <div style={{ marginTop: 20, borderTop: "1px solid #eee", paddingTop: 16 }}>
                <h2 className="resume-section-title" style={{ marginBottom: 12 }}>
                  <Quote size={16} className="resume-section-icon" />자기소개서
                </h2>
                <CoverLetterTools value={coverLetter} onChange={setCoverLetter}
                  jobId={jobId} positionTitle={positionTitle} workLocation={workLocation} />
                <textarea className="apply-textarea"
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  maxLength={2000}
                  style={{ width: "100%", minHeight: 160, padding: 12, borderRadius: 8, border: "1px solid #ddd", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>

              {/* 예전 '저장하기' 자리다. 다만 저장되는 곳이 다르다 — 기본
                  이력서가 아니라 이 공고에 낼 사본이고, 이 브라우저에 둔다.
                  손을 멈추면 알아서 붙들어 두므로 이 단추는 그것을 눈으로
                  확인하는 자리다. */}
              <div style={{ display: "flex", gap: 8, marginTop: 16, paddingBottom: 16 }}>
                <button
                  onClick={손으로임시저장}
                  style={{ flex: 1, padding: "13px 0", borderRadius: 8, border: "1px solid #582681", background: "#fff", color: "#582681", fontSize: 15, fontWeight: 400, cursor: "pointer" }}
                >
                  {방금저장 ? "임시저장했어요" : "임시저장"}
                </button>
                <button
                  className="cv-btn-primary"
                  style={{ flex: 1, marginTop: 0 }}
                  onClick={() => setStep("preview")}
                >
                  미리보기 후 지원하기
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}