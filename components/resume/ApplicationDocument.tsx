"use client";
import { forwardRef } from "react";
import ResumePreview from "@/components/profile/ResumePreview";
import { Quote } from "lucide-react";

// 제출한 지원서 공용 문서: 자기소개서 + 이력서 본문
// 구직자/기업/관리자 화면에서 동일하게 사용 (PDF/인쇄는 lib/applicationPdf 유틸)
type Props = {
  coverLetter?: string | null;
  subtitle?: string;      // 예: "beautyLab · 네일보조"
  /** 어느 자리에 냈는가 — 「헤어 디자이너 · 신입 · 서울 강동구」. */
  지원분야?: string;
  /** 실제로 낸(낼) 지원서인가. 그때는 가려 둔 재직 매장도 그대로 나간다 —
   *  내가 스스로 문을 연 자리다. 이력서 미리보기는 남이 보는 모습이라 가린다. */
  제출본?: boolean;
  resume: any;            // ResumePreview에 전달할 props 묶음
  children?: React.ReactNode; // 이력서 뒤 추가 요소(첨부 이력서 파일 등)
};

const ApplicationDocument = forwardRef<HTMLDivElement, Props>(function ApplicationDocument(
  { coverLetter, subtitle, resume, 지원분야, 제출본, children },
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
      <ResumePreview {...이력서} 지원분야={지원분야} 재직매장그대로={제출본} />
      {hasCover && (
        <>
          <div style={{ borderTop: "1px solid #e0e0e0", marginTop: 22, paddingTop: 22 }} />
          <div style={{ background: "#fff" }}>
            {/* 칸 이름은 이 문서의 다른 칸들과 같은 규칙을 쓴다 — 여기만 제
                스타일을 들고 있어 아이콘도 굵기도 어긋나 있었다. */}
            <h2 className="rp-section-title" style={{ margin: "0 0 12px" }}>
              <Quote size={16} className="resume-section-icon" />자기소개서
            </h2>
            {subtitle && (
              <p style={{ fontSize: 12.5, color: "#888", margin: "-6px 0 14px" }}>{subtitle}</p>
            )}
            {/* 빈 줄을 그대로 흘리면 줄 높이(1.85)만큼 통째로 벌어져, 문단 사이가
                제목과 첫 줄 사이보다 훨씬 넓어진다. 빈 줄로 끊어 문단으로 세우고
                사이 여백은 우리가 정한다. */}
            {String(coverLetter).split(/\n{2,}/).map((단락, i) => (
              <p key={i} style={{ fontSize: 14, color: "#555", lineHeight: 1.85,
                margin: i === 0 ? 0 : "10px 0 0", whiteSpace: "pre-wrap" }}>{단락}</p>
            ))}
          </div>
        </>
      )}
      {children}
    </div>
  );
});

export default ApplicationDocument;
