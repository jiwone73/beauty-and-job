"use client";
import { useState, useEffect, useRef, Fragment } from "react";
import { useProfileStore, type 이력서한벌 } from "@/lib/store/profileStore";
import { shortenRegion } from "@/lib/memberFormat";
import { 전화꼴 } from "@/lib/phoneFormat";
import { useSignupStore } from "@/lib/store/signupStore";
import { useAuthStore } from "@/lib/store/authStore";
import ResumeEditor from "@/components/profile/ResumeEditor";
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
  // 희망직군의 원본이 둘로 갈려 있다 — 매장은 user_profiles.skill_areas,
  // 본사는 users.office_job_areas. 가입 때 담아 둔 store 값만 보면 예전에
  // 가입한 사람은 「희망 근무 조건」에서 직군 줄이 통째로 빠졌다.
  const [직군매장, set직군매장] = useState<string[] | null>(null);
  const [직군본사, set직군본사] = useState<string[] | null>(null);
  const [희망급여, set희망급여] = useState<{ type: string | null; min: number | null }>({ type: null, min: null });
  const [초안됨, set초안됨] = useState(false);   // 이번에 불러온 초안이 있나
  const [방금저장, set방금저장] = useState(false);
  const 초안준비 = useRef(false);               // 원본을 뜨기 전에는 쓰지 않는다

  const [step, setStep] = useState<Step>("write");
  const [coverLetter, setCoverLetter] = useState("");
  const [lastCoverLetter, setLastCoverLetter] = useState("");
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [applying, setApplying] = useState(false);
  const [consent, setConsent] = useState(false);

  // 기본 정보 (이력서 페이지와 동일하게 /api/users/me 에서)
  const [emailLocal, setEmailLocal] = useState(email);
  const [resumeType, setResumeType] = useState<"office" | "salon">("office");
  const [portfolioImages, setPortfolioImages] = useState<{ url: string; w?: number; h?: number }[]>([]);
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
  useEffect(() => {
    useProfileStore.getState().자동저장잠금(true);
    return () => {
      const 사본 = 뜬이력서.current;
      if (사본) useProfileStore.getState().이력서되돌리기(사본);
      useProfileStore.getState().자동저장잠금(false);
    };
  }, []);

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
        if (초안?.resume) { useProfileStore.getState().이력서되돌리기(사본풀기(초안.resume)); set초안됨(true); }
        if (초안?.cover_letter) { setCoverLetter(초안.cover_letter); setCoverLoaded(true); }
      } catch {}
      초안준비.current = true;
    });

    fetch("/api/users/me/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        const pf = res?.data?.profile;
        if (pf) {
          set희망급여({ type: pf.salary_type || null, min: pf.salary_min ? Number(pf.salary_min) : null });
          if (Array.isArray(pf.skill_areas) && pf.skill_areas.length > 0) set직군매장(pf.skill_areas);
          if (Array.isArray(pf.office_job_areas) && pf.office_job_areas.length > 0) set직군본사(pf.office_job_areas);
        }
      })
      .catch(() => {});

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

    if (!coverLoaded) {
      fetch("/api/users/me/last-cover-letter", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => { if (d.success && d.data?.cover_letter) setLastCoverLetter(d.data.cover_letter); })
        .catch(() => {})
        .finally(() => setCoverLoaded(true));
    }
  }, []);

  const jobDisplay = (job === "직접입력" ? jobCustom : job) || officeJobAreas[0] || skillAreas[0] || "직군 미설정";
  const birthDisplay = birth
    ? `${birth.slice(0, 4)}년 (${new Date().getFullYear() - Number(birth.slice(0, 4))}세, ${gender === "남성" ? "남" : "여"})`
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
  const 사본싸기 = () => {
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
        skills: s.skills,
        skill_areas: sg.skillAreas || [],
        work_type_prefer: sg.workTypePrefer || "",
        region_prefer: sg.regionPrefer || "",
        office_job_areas: sg.officeJobAreas || [],
      },
      careers: s.careers.filter((c) => 알맹이(c.company)),
      educations: s.educations.filter((e) => 알맹이(e.school)),
      experiences: s.experiences.filter((x) => 알맹이(x.title)),
      languages: s.languages.filter((l) => 알맹이(l.language)),
      links: s.links.filter((l) => 알맹이(l.url)),
      certificates: s.certificates.filter((c) => 알맹이(c.name)),
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
    const 같은이력서 = JSON.stringify(지금) === JSON.stringify(뜬이력서.current);
    const 같은자소서 = 첫자소서.current === null || 첫자소서.current === coverLetter;
    try {
      if (같은이력서 && 같은자소서) {
        await fetch(`/api/jobs/${jobId}/apply-draft`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        return;
      }
      await fetch(`/api/jobs/${jobId}/apply-draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resume: 사본싸기(), cover_letter: coverLetter }),
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
  }, [intro, coreCompetencies, careers, educations, skills, languages, experiences,
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
  const 초안버리기 = async () => {
    if (!confirm("임시저장한 내용을 버리고 기본 이력서로 되돌릴까요?")) return;
    const token = localStorage.getItem("access_token");
    try {
      if (token) await fetch(`/api/jobs/${jobId}/apply-draft`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    } catch {}
    const 원본 = 뜬이력서.current;
    if (원본) useProfileStore.getState().이력서되돌리기(원본);
    첫자소서.current = coverLetter;
    set초안됨(false);
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
          {/* 진행 단계 안내 (작성 → 미리보기 → 지원) */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "2px 0 16px", flexWrap: "wrap" }}>
            {["자기소개서 작성", "미리보기", "지원 완료"].map((label, i) => {
              const current = step === "preview" ? 1 : 0;
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
                  {i < 2 && <span style={{ width: 20, height: 1, background: "#ddd", flexShrink: 0 }} />}
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
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                  margin: "0 0 14px", padding: "10px 12px", borderRadius: 8, background: "#f7f4fa" }}>
                  <span style={{ fontSize: 13, color: "#6b6570" }}>임시저장해 둔 사본을 불러왔어요.</span>
                  <button type="button" onClick={초안버리기}
                    style={{ marginLeft: "auto", border: "none", background: "none", padding: 0,
                      fontSize: 13, color: "#582681", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
                    기본 이력서로 되돌리기
                  </button>
                </div>
              )}
              {/* 지원 정보 — 매장이 실제로 연락하는 값이다. 옛 번호가 그대로면
                  지원 자체가 헛일이 되는데, 지금까지는 미리보기 이력서 본문에
                  섞여 있어 따로 확인하는 자리가 없었다.
                  번호와 메일은 여기서 못 고친다 — 둘 다 본인 확인을 거쳐야
                  바뀌는 값이라, 고치는 자리로 보내는 것이 맞다. */}
              <div className="apply-info">
                <div className="apply-info-head">
                  <span>지원 정보</span>
                  <a href="/profile" target="_blank" rel="noopener">프로필에서 수정</a>
                </div>
                {(positionTitle || workLocation) && (
                  <div className="apply-info-row"><span>지원 자리</span><b>{[positionTitle, workLocation].filter(Boolean).join(" · ")}</b></div>
                )}
                <div className="apply-info-row"><span>이름</span><b>{name}</b></div>
                <div className="apply-info-row"><span>연락처</span><b>{전화꼴(phoneLocal || phone) || "—"}</b></div>
                <div className="apply-info-row"><span>이메일</span><b>{emailLocal || email || "—"}</b></div>
              </div>

              <div style={{ padding: 0 }}>
              <label style={{ display: "block", fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 12 }}>
                자기소개서
              </label>
              {(
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 12, color: "#999", margin: "0 0 6px" }}>💡 추천 문구를 눌러 이어쓸 수 있어요</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <button type="button" className="cv-chip"
                      onClick={() => setCoverLetter((prev) => prev + `${jobBrand ? jobBrand + "의 " : ""}${jobTitle || "이 포지션"} 채용 공고를 보고 지원하게 된 ${userName || ""}입니다.\n`)}
                      style={{ fontSize: 12, padding: "6px 12px", borderRadius: 16, border: "none", background: "#f7f7f8", color: "#582681", cursor: "pointer", textAlign: "left", lineHeight: 1.4 }}>
                      <span className="cv-chip-full">{`${jobBrand ? jobBrand + "의 " : ""}${jobTitle || "이 포지션"} 채용 공고를 보고 지원하게 된 ${userName || ""}입니다.`}</span>
                      <span className="cv-chip-short">✏️ 첫인사</span>
                    </button>
                    {coreCompetencies && coreCompetencies.trim() && (
                      <button type="button" className="cv-chip"
                        onClick={() => setCoverLetter((prev) => prev + `저의 핵심 역량인 ${coreCompetencies.trim()}을(를) 바탕으로 ${jobTitle || "해당"} 직무에서 기여하고 싶습니다.\n`)}
                        style={{ fontSize: 12, padding: "6px 12px", borderRadius: 16, border: "none", background: "#f7f7f8", color: "#582681", cursor: "pointer", textAlign: "left", lineHeight: 1.4 }}>
                        <span className="cv-chip-full">{`저의 핵심 역량인 ${coreCompetencies.trim()}을(를) 바탕으로 ${jobTitle || "해당"} 직무에서 기여하고 싶습니다.`}</span>
                        <span className="cv-chip-short">⭐ 핵심역량</span>
                      </button>
                    )}
                    <button type="button" className="cv-chip"
                      onClick={() => setCoverLetter((prev) => prev + `면접에서 제 경험과 역량을 더 구체적으로 말씀드릴 기회를 주시면 감사하겠습니다.\n`)}
                      style={{ fontSize: 12, padding: "6px 12px", borderRadius: 16, border: "none", background: "#f7f7f8", color: "#582681", cursor: "pointer", textAlign: "left", lineHeight: 1.4 }}>
                      <span className="cv-chip-full">면접에서 제 경험과 역량을 더 구체적으로 말씀드릴 기회를 주시면 감사하겠습니다.</span>
                      <span className="cv-chip-short">🙌 맺음말</span>
                    </button>
                    {lastCoverLetter && (
                      <button type="button"
                        onClick={() => setCoverLetter(lastCoverLetter)}
                        style={{ fontSize: 12, padding: "6px 12px", borderRadius: 16, border: "none", background: "#f7f7f8", color: "#582681", cursor: "pointer", textAlign: "left", lineHeight: 1.4 }}>
                        📋 이전 자소서 불러오기
                      </button>
                    )}
                  </div>
                </div>
              )}
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
                  coverLetter={coverLetter}
                  resume={{
                    name,
                    birthDisplay,
                    addressDisplay,
                    jobDisplay,
                    phone: phoneLocal || phone,
                    email: emailLocal || email,
                    intro,
                    coreCompetencies: "",
                    careers,
                    educations,
                    skills,
                    languages,
                    experiences,
                    links,
                    portfolioImages,
                    resumeFileName: null, // 첨부 이력서 숨김 처리(미리보기/전송 문서에서 제외)
                    avatarUrl,
                    resumeType,
                    officeJobAreas: 직군본사 ?? officeJobAreas,
                    skillAreas: 직군매장 ?? skillAreas,
                    certificates,
                    workTypePrefer,
                    regionPrefer: 희망지역 || regionPrefer,
                    salaryType: 희망급여.type,
                    salaryMin: 희망급여.min,
                  }}
                />
              </div>

              <p style={{ fontSize: 12, color: "#888", marginBottom: 12, lineHeight: 1.6 }}>
                지원하면 위 이력서와 자기소개서가 그대로 전송·저장됩니다. 제출 후에는 수정할 수 없어요.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setStep("edit")}
                  style={{ flex: "0 0 auto", padding: "13px 18px", borderRadius: 8, border: "1px solid #582681", background: "#fff", color: "#582681", fontSize: 15, fontWeight: 400, cursor: "pointer" }}
                >
                  수정하기
                </button>
                <button
                  className="cv-btn-primary"
                  style={{ flex: 1, marginTop: 0 }}
                  disabled={applying}
                  onClick={handleApply}
                >
                  {applying ? "지원 중..." : "지원하기"}
                </button>
              </div>
            </>
          )}

          {/* ===== 화면 3: 이력서 수정 ===== */}
          {step === "edit" && (
            <>
              <div style={{ marginTop: 8 }}>
                <label style={{ display: "block", fontSize: 15, fontWeight: 400, color: "#1a1a1a", marginBottom: 12 }}>
                  자기소개서
                </label>
                <textarea className="apply-textarea"
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  maxLength={2000}
                  style={{ width: "100%", minHeight: 120, padding: 12, borderRadius: 8, border: "1px solid #ddd", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 20 }}
                />
              </div>

              {/* 되살린 것이 무엇인지 밝힌다. 말없이 채워 두면 기본 이력서가
                  이런 줄 알고, 여기서 고친 것이 저쪽에도 남은 줄 안다. */}
              {초안됨 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                  margin: "0 0 12px", padding: "10px 12px", borderRadius: 8, background: "#f7f4fa" }}>
                  <span style={{ fontSize: 13, color: "#6b6570" }}>임시저장해 둔 사본을 불러왔어요.</span>
                  <button type="button" onClick={초안버리기}
                    style={{ marginLeft: "auto", border: "none", background: "none", padding: 0,
                      fontSize: 13, color: "#582681", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
                    기본 이력서로 되돌리기
                  </button>
                </div>
              )}
              <div className="apply-resume-wrap" style={{ borderTop: "1px solid #eee", paddingTop: 16 }}>
                <ResumeEditor
                  resumeType={resumeType}
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
                  resumeFileReadOnly
                  portfolioReadOnly
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