"use client";
import { forwardRef } from "react";
import ResumePreview from "@/components/profile/ResumePreview";

// 제출한 지원서 공용 문서: 자기소개서 + 이력서 제목 + 이력서 본문
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
  return (
    <div ref={ref} className="app-doc" style={{ background: "#fff", padding: "40px" }}>
      {hasCover && (
        <div style={{ background: "#fff", padding: "0 0 22px" }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px", lineHeight: 1.5 }}>자기소개서</h2>
          {subtitle && (
            <p style={{ fontSize: 12.5, color: "#888", margin: "0 0 14px" }}>{subtitle}</p>
          )}
          <p style={{ fontSize: 14, color: "#333", lineHeight: 1.85, margin: 0, whiteSpace: "pre-wrap" }}>{coverLetter}</p>
        </div>
      )}
      <div style={{ background: "#fff", padding: "22px 0 0", borderTop: hasCover ? "1px solid #e0e0e0" : "none" }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a", margin: 0, lineHeight: 1.5 }}>이력서</h2>
      </div>
      <ResumePreview {...resume} />
      {children}
    </div>
  );
});

export default ApplicationDocument;
