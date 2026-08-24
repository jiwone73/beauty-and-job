"use client";
import { useState, useEffect, useRef, Fragment } from "react";
import { useProfileStore, type 이력서한벌 } from "@/lib/store/profileStore";
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
  onClose,
  onApplied,
}: {
  jobId: string;
  jobBrand?: string;
  jobTitle?: string;
  isExternal?: boolean;
  onClose: () => void;
  onApplied: () => void;
}) {
  const { userName } = useAuthStore();
  const { name: signupName, birth, gender, job, jobCustom, officeJobAreas, skillAreas, workTypePrefer, regionPrefer, phone } = useSignupStore();
  const {
    intro, coreCompetencies, careers, educations, skills, languages, experiences, links, certificates, email,
  } = useProfileStore();

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
    useProfileStore.getState().loadFromServer().then(() => {
      뜬이력서.current = useProfileStore.getState().이력서뽑기();
    });

    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          if (res.data.email) setEmailLocal(res.data.email);
          setResumeType(res.data.job_type === "STORE" ? "salon" : "office");
          if (Array.isArray(res.data.portfolio_images)) setPortfolioImages(res.data.portfolio_images);
          if (res.data.avatar_url) setAvatarUrl(res.data.avatar_url);
          if (res.data.phone) setPhoneLocal(res.data.phone);
          setAddressDisplay(
            [res.data.address_road, res.data.address_detail].filter(Boolean).join(" ") ||
            [res.data.region_sido, res.data.region_sigungu].filter(Boolean).join(" ")
          );
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
   *  빼고 보낸다 — 남의 화면에 빈 줄로 나가면 안 된다. */
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
        body: JSON.stringify({ cover_letter: coverLetter.trim() || null, resume: 사본싸기() }),
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
                    officeJobAreas,
                    skillAreas,
                    certificates,
                    workTypePrefer,
                    regionPrefer,
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

              {/* '저장하기' 는 없앴다. 여기 고친 것은 이 공고에 낼 사본이라
                  따로 저장할 곳이 없다 — 지원할 때 함께 나간다. 단추만 남겨
                  두면 눌러 놓고 기본 이력서에도 남은 줄 안다. */}
              <div style={{ display: "flex", gap: 8, marginTop: 16, paddingBottom: 16 }}>
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