"use client";
import { useState, useEffect } from "react";
import { useProfileStore } from "@/lib/store/profileStore";
import { useSignupStore } from "@/lib/store/signupStore";
import { useAuthStore } from "@/lib/store/authStore";
import ResumePreview from "@/components/profile/ResumePreview";
import ResumeEditor from "@/components/profile/ResumeEditor";

type Step = "write" | "preview" | "edit";

export default function ApplyModal({
  jobId,
  jobBrand,
  jobTitle,
  onClose,
  onApplied,
}: {
  jobId: string;
  jobBrand?: string;
  jobTitle?: string;
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
  const [saving, setSaving] = useState(false);

  // 기본 정보 (이력서 페이지와 동일하게 /api/users/me 에서)
  const [emailLocal, setEmailLocal] = useState(email);
  const [resumeType, setResumeType] = useState<"office" | "salon">("office");
  const [portfolioUrl, setPortfolioUrl] = useState<string | null>(null);
  const [portfolioFilename, setPortfolioFilename] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const name = signupName || userName || "";

  // 모달 열릴 때: store 로드 + 기본정보 + 최근 자소서
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    useProfileStore.getState().loadFromServer();

    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          if (res.data.email) setEmailLocal(res.data.email);
          setResumeType(res.data.job_type === "STORE" ? "salon" : "office");
          if (res.data.portfolio_url) setPortfolioUrl(res.data.portfolio_url);
          if (res.data.portfolio_filename) setPortfolioFilename(res.data.portfolio_filename);
          if (res.data.avatar_url) setAvatarUrl(res.data.avatar_url);
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

  // 포트폴리오 업로드/삭제 (수정 화면용)
  const processFile = async (file: File) => {
    if (file.type !== "application/pdf") { alert("PDF 파일만 업로드 가능합니다."); return; }
    if (file.size > 5 * 1024 * 1024) { alert("파일 크기는 5MB 이하여야 합니다."); return; }
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/users/me/portfolio", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (data.success) {
        setPortfolioUrl(data.data.portfolio_url);
        setPortfolioFilename(data.data.portfolio_filename);
      } else {
        alert(data.error?.message || "업로드 실패");
      }
    } finally {
      setIsUploading(false);
    }
  };
  const handleDeletePortfolio = async () => {
    if (!confirm("포트폴리오를 삭제하시겠어요?")) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const res = await fetch("/api/users/me/portfolio", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) { setPortfolioUrl(null); setPortfolioFilename(null); }
  };

  // 수정 화면 저장
  const handleSaveResume = async () => {
    setSaving(true);
    try {
      useProfileStore.getState().setEmail(emailLocal);
      await useProfileStore.getState().syncToDb();
      alert("이력서가 저장되었습니다.");
    } catch (e) {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 지원하기 = 이력서 저장(syncToDb) → 지원 API(스냅샷 박제)
  const handleApply = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) { alert("로그인이 필요합니다."); return; }
    setApplying(true);
    try {
      // 최신 이력서를 먼저 DB에 반영 → 스냅샷이 화면과 일치
      try {
        useProfileStore.getState().setEmail(emailLocal);
        await useProfileStore.getState().syncToDb();
      } catch (e) {
        console.error("[apply] 이력서 사전 저장 실패", e);
      }

      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cover_letter: coverLetter.trim() || null }),
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
  const wide = step === "preview" || step === "edit";

  return (
    <div className="cv-overlay">
      <div
        className="cv-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: wide ? 860 : 480,
          width: "94%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="cv-header">
          <div style={{ width: 36 }} />
          <h2 className="cv-title">
            {step === "write" ? "지원하기" : step === "preview" ? "지원서 미리보기" : "이력서 수정"}
          </h2>
          <button className="cv-close" onClick={onClose}>✕</button>
        </div>

        <div className="cv-body" style={{ overflowY: "auto", flex: 1 }}>
          <div className="apply-modal-job">
            <strong>{jobBrand}</strong>
            <p>{jobTitle}</p>
          </div>

          {/* ===== 화면 1: 작성 ===== */}
          {step === "write" && (
            <>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 }}>
                자기소개서
              </label>
              {!coverLetter.trim() && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 12, color: "#999", margin: "0 0 6px" }}>💡 추천 문구로 시작해보세요</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {[
                      `${jobBrand ? jobBrand + " " : ""}${jobTitle || "이 포지션"}에 지원합니다.\n\n`,
                      `안녕하세요, ${jobTitle || "해당 직무"}에 지원하는 ${userName || ""}입니다.\n\n`,
                      `${jobBrand ? jobBrand + "의 " : ""}${jobTitle || "이 직무"}로 성장하고 싶어 지원하게 되었습니다.\n\n`,
                    ].map((tpl, i) => (
                      <button key={i} type="button"
                        onClick={() => setCoverLetter(tpl)}
                        style={{ fontSize: 12, padding: "6px 12px", borderRadius: 16, border: "1px solid #e0d0f0", background: "#faf5ff", color: "#5f0080", cursor: "pointer", textAlign: "left", lineHeight: 1.4 }}>
                        {tpl.trim()}
                      </button>
                    ))}
                    {lastCoverLetter && (
                      <button type="button"
                        onClick={() => setCoverLetter(lastCoverLetter)}
                        style={{ fontSize: 12, padding: "6px 12px", borderRadius: 16, border: "1px solid #ddd", background: "#f5f5f5", color: "#555", cursor: "pointer", textAlign: "left", lineHeight: 1.4 }}>
                        📋 이전 자소서 불러오기
                      </button>
                    )}
                  </div>
                </div>
              )}
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder={`이 회사·포지션에 지원하는 이유와 본인의 강점을 작성해주세요.`}
                maxLength={2000}
                style={{ width: "100%", minHeight: 320, padding: 12, borderRadius: 8, border: "1px solid #ddd", fontSize: 14, lineHeight: 1.6, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
              />
              <div style={{ textAlign: "right", fontSize: 12, color: "#aaa", marginTop: 4 }}>
                {coverLetter.length}/2000자
              </div>
              <button className="cv-btn-primary" onClick={() => setStep("preview")}>
                미리보기
              </button>
            </>
          )}

          {/* ===== 화면 2: 미리보기 (자소서 + 전체 이력서) ===== */}
          {step === "preview" && (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#5f0080", marginBottom: 10 }}>자기소개서</div>
                <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, padding: "18px 20px" }}>
                  {coverLetter.trim() ? (
                    <p style={{ fontSize: 15, color: "#333", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>{coverLetter}</p>
                  ) : (
                    <p style={{ fontSize: 14, color: "#aaa", margin: 0 }}>자기소개서 없이 이력서만 제출됩니다.</p>
                  )}
                </div>
              </div>

              <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                <ResumePreview
                  name={name}
                  birthDisplay={birthDisplay}
                  jobDisplay={jobDisplay}
                  phone={phone}
                  email={emailLocal || email}
                  intro=""
                  coreCompetencies=""
                  careers={careers}
                  educations={educations}
                  skills={skills}
                  languages={languages}
                  experiences={experiences}
                  links={links}
                  portfolioUrl={portfolioUrl}
                  portfolioFilename={portfolioFilename}
                  avatarUrl={avatarUrl}
                  resumeType={resumeType}
                  officeJobAreas={officeJobAreas}
                  skillAreas={skillAreas}
                  certificates={certificates}
                  workTypePrefer={workTypePrefer}
                  regionPrefer={regionPrefer}
                />
              </div>

              <p style={{ fontSize: 12, color: "#888", marginBottom: 12, lineHeight: 1.6 }}>
                지원하면 위 이력서와 자기소개서가 그대로 전송·저장됩니다. 제출 후에는 수정할 수 없어요.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setStep("edit")}
                  style={{ flex: "0 0 auto", padding: "13px 18px", borderRadius: 8, border: "1px solid #5f0080", background: "#fff", color: "#5f0080", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
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
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 }}>
                자기소개서
              </label>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                maxLength={2000}
                style={{ width: "100%", minHeight: 120, padding: 12, borderRadius: 8, border: "1px solid #ddd", fontSize: 14, lineHeight: 1.6, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 20 }}
              />

              <div style={{ borderTop: "1px solid #eee", paddingTop: 16 }}>
                <ResumeEditor
                  resumeType={resumeType}
                  emailLocal={emailLocal}
                  setEmailLocal={setEmailLocal}
                  portfolioUrl={portfolioUrl}
                  portfolioFilename={portfolioFilename}
                  isUploading={isUploading}
                  onPortfolioFile={processFile}
                  onPortfolioDelete={handleDeletePortfolio}
                />
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button
                  onClick={handleSaveResume}
                  disabled={saving}
                  style={{ flex: 1, padding: "13px 0", borderRadius: 8, border: "1px solid #5f0080", background: "#fff", color: "#5f0080", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
                >
                  {saving ? "저장 중..." : "저장하기"}
                </button>
                <button
                  className="cv-btn-primary"
                  style={{ flex: 1, marginTop: 0 }}
                  onClick={() => setStep("preview")}
                >
                  미리보기로
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}