"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Eye, Edit3, Download, FileText } from "lucide-react";
import { useProfileStore } from "@/lib/store/profileStore";
import { useSignupStore } from "@/lib/store/signupStore";
import { useAuthStore } from "@/lib/store/authStore";

export default function ResumeTab() {
  const router = useRouter();
  const { intro, coreCompetencies, careers, educations, skills, languages, experiences, links, loaded } = useProfileStore();
  const { name: signupName, phone, skillAreas, certificates, workTypePrefer, regionPrefer, officeJobAreas } = useSignupStore();
  const { userName } = useAuthStore();
  const name = userName || signupName || "";

  const [dbJobType, setDbJobType] = useState<"OFFICE" | "STORE" | null>(null);
  const [emailFromDb, setEmailFromDb] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState<string | null>(null);
  const [portfolioFilename, setPortfolioFilename] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      useProfileStore.setState({ loaded: true });
      return;
    }
    useProfileStore.getState().loadFromServer();
    fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          if (res.data.job_type) setDbJobType(res.data.job_type);
          if (res.data.email) setEmailFromDb(res.data.email);
          if (res.data.portfolio_url) setPortfolioUrl(res.data.portfolio_url);
          if (res.data.portfolio_filename) setPortfolioFilename(res.data.portfolio_filename);
        }
      })
      .catch(console.error);
  }, []);

  const items = dbJobType === "STORE" ? [
    // 매장·기술직용
    { label: "기본 정보", done: !!(name && phone && emailFromDb), required: true },
    { label: "소개", done: !!intro.trim(), required: true },
    { label: "경력 (근무 매장)", done: careers.length > 0, required: true },
    { label: "학력", done: educations.length > 0, required: false },
    { label: "시술 분야 · 전문 영역", done: skillAreas.length > 0, required: true },
    { label: "보유 자격증", done: certificates.length > 0, required: false },
    { label: "희망 근무 형태", done: !!workTypePrefer, required: false, extra: workTypePrefer || undefined },
    { label: "희망 근무 지역", done: !!regionPrefer, required: false, extra: regionPrefer || undefined },
    { label: "어학", done: languages.length > 0, required: false },
    { label: "활동/수상", done: experiences.length > 0, required: false },
    { label: "포트폴리오", done: !!portfolioUrl, required: false, extra: portfolioFilename || undefined },
    { label: "링크", done: links.length > 0, required: false },
  ] : [
    // 기업·사무직용
    { label: "기본 정보", done: !!(name && phone && emailFromDb), required: true },
    { label: "소개", done: !!intro.trim(), required: true },
    { label: "핵심 역량", done: !!coreCompetencies.trim(), required: true },
    { label: "직군 영역", done: officeJobAreas.length > 0, required: true },
    { label: "경력", done: careers.length > 0, required: true },
    { label: "학력", done: educations.length > 0, required: false },
    { label: "스킬", done: skills.length > 0, required: false },
    { label: "어학", done: languages.length > 0, required: false },
    { label: "프로젝트 · 활동", done: experiences.length > 0, required: false },
    { label: "포트폴리오", done: !!portfolioUrl, required: false, extra: portfolioFilename || undefined },
    { label: "링크", done: links.length > 0, required: false },
  ];

  const totalCount = items.length;
  const completedCount = items.filter((i) => i.done).length;
  const completionRate = Math.round((completedCount / totalCount) * 100);

  const hasAnyContent = completedCount > 0;

  // 데이터 로딩 중에는 빈 화면 (flash 방지)
  if (!loaded) {
    return <div style={{ minHeight: "300px" }} />;
  }

  if (!hasAnyContent) {
    return (
      <div className="profile-resume-empty">
        <div className="profile-resume-empty-icon">
          <FileText size={48} />
        </div>
        <h3 className="profile-resume-empty-title">아직 작성된 이력서가 없어요</h3>
        <p className="profile-resume-empty-desc">
          프로필을 기반으로 이력서를 만들어보세요.<br />
          뷰티 채용 담당자에게 어필할 수 있어요.
        </p>
        <button
          className="profile-resume-create-btn"
          onClick={() => router.push("/profile/resume")}
        >
          이력서 만들기
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 0" }}>
      {/* 완성도 게이지 */}
      <div style={{
        padding: "20px",
        background: "#fff",
        border: "1px solid #f0e8f8",
        borderRadius: "12px",
        marginBottom: "16px"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "12px"
        }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>
            이력서 완성도
          </span>
          <span style={{ fontSize: "22px", fontWeight: 700, color: "#5f0080" }}>
            {completionRate}%
          </span>
        </div>
        <div style={{
          height: "10px",
          background: "#f3e5f5",
          borderRadius: "6px",
          overflow: "hidden"
        }}>
          <div style={{
            height: "100%",
            width: `${completionRate}%`,
            background: "linear-gradient(90deg, #5f0080, #9c27b0)",
            transition: "width 0.4s ease",
            borderRadius: "6px"
          }} />
        </div>
        <p style={{ fontSize: "12px", color: "#888", marginTop: "10px" }}>
          {completedCount}/{totalCount} 항목 작성 완료
          {completionRate < 100 && " · 조금만 더 채워보세요!"}
          {completionRate === 100 && " · 완벽해요 🎉"}
        </p>
      </div>

      {/* 체크리스트 */}
      <div style={{
        padding: "20px",
        background: "#fff",
        border: "1px solid #f0e8f8",
        borderRadius: "12px",
        marginBottom: "16px"
      }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", marginBottom: "14px" }}>
          작성 현황
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {items.map((item) => (
            <div key={item.label} style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "14px"
            }}>
              {item.done ? (
                <CheckCircle2 size={20} color="#5f0080" />
              ) : (
                <Circle size={20} color="#d0d0d0" />
              )}
              <span style={{
                color: item.done ? "#1a1a1a" : "#888",
                fontWeight: item.done ? 500 : 400,
                flex: 1
              }}>
                {item.label}
                {item.required && !item.done && (
                  <span style={{
                    fontSize: "11px",
                    color: "#e74c3c",
                    marginLeft: "6px",
                    fontWeight: 600
                  }}>
                    필수
                  </span>
                )}
              </span>
              {item.extra && (
                <span style={{
                  fontSize: "11px",
                  color: "#888",
                  maxWidth: "140px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>
                  {item.extra}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div style={{
        display: "flex",
        gap: "8px",
        marginBottom: "16px"
      }}>
        <button
          onClick={() => router.push("/profile/resume")}
          style={{
            flex: 1,
            padding: "13px",
            borderRadius: "10px",
            border: "none",
            background: "#5f0080",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }}
        >
          <Edit3 size={16} />
          편집하기
        </button>
        <button
          onClick={() => router.push("/profile/resume?action=preview")}
          style={{
            flex: 1,
            padding: "13px",
            borderRadius: "10px",
            border: "1.5px solid #5f0080",
            background: "#fff",
            color: "#5f0080",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }}
        >
          <Eye size={16} />
          미리보기
        </button>
        <button
          onClick={() => router.push("/profile/resume?action=download")}
          style={{
            flex: 1,
            padding: "13px",
            borderRadius: "10px",
            border: "1.5px solid #e0e0e0",
            background: "#fff",
            color: "#666",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }}
        >
          <Download size={16} />
          PDF
        </button>
      </div>
    </div>
  );
}