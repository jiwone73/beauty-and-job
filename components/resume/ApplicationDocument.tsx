"use client";
import { forwardRef } from "react";
import ResumePreview from "@/components/profile/ResumePreview";

// 제출한 지원서 공용 문서: 자기소개서 + 이력서 본문
// 구직자/기업/관리자 화면에서 동일하게 사용 (PDF/인쇄는 lib/applicationPdf 유틸)
type Props = {
  coverLetter?: string | null;
  subtitle?: string;      // 예: "beautyLab · 네일보조"
  resume: any;            // ResumePreview에 전달할 props 묶음
  children?: React.ReactNode; // 이력서 뒤 추가 요소(첨부 이력서 파일 등)
};

const ApplicationDocument = forwardRef<HTMLDivElement, Props>(function ApplicationDocument(
  { coverLetter, subtitle, resume, children },
  ref
) {
  const hasCover = !!(coverLetter && coverLetter.trim());
  // 지원서에 실리는 자소서는 이 공고에 낸 그것 하나다. 이력서에 딸려 온 기본
  // 자소서까지 아래에 또 붙으면 한 문서에 자기소개서가 두 번 나온다.
  const { coverLetter: _기본자소서, ...이력서 } = resume || {};
  return (
    <div ref={ref} className="app-doc" style={{ background: "#fff" }}>
      {/* 자기소개서는 맨 끝, 희망 근무 조건 다음이다 — 기본 이력서 미리보기와
          같은 차례다. 읽는 사람은 누구인지·무엇을 해왔는지를 먼저 훑고,
          하고 싶은 말은 마지막에 읽는다. */}
      <ResumePreview {...이력서} />
      {hasCover && (
        <>
          <div style={{ borderTop: "1px solid #e0e0e0", marginTop: 22, paddingTop: 22 }} />
          <div style={{ background: "#fff" }}>
            <h2 style={{ fontSize: 17, fontWeight: 400, color: "#1a1a1a", margin: "0 0 4px", lineHeight: 1.5 }}>자기소개서</h2>
            {subtitle && (
              <p style={{ fontSize: 12.5, color: "#888", margin: "0 0 14px" }}>{subtitle}</p>
            )}
            <p style={{ fontSize: 14, color: "#333", lineHeight: 1.85, margin: 0, whiteSpace: "pre-wrap" }}>{coverLetter}</p>
          </div>
        </>
      )}
      {children}
    </div>
  );
});

export default ApplicationDocument;
