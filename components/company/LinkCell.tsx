"use client";
import type { CSSProperties, ReactNode } from "react";

/**
 * 작업물 링크 한 줄 (포트폴리오 · SNS).
 * 값이 없으면 지우지 않고 흐리게 남긴다 — '아직 없다'는 것도 판단에 쓰이는 정보다.
 * 인재검색·스크랩 인재·지원자 관리에서 같은 모양으로 쓴다.
 */
export default function LinkCell({
  url,
  icon,
  label,
}: {
  url?: string | null;
  icon: ReactNode;
  label: string;
}) {
  const base: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 3, fontSize: 13 };
  if (!url) {
    return <span style={{ ...base, color: "#d0d0d0" }}>{icon}<span>{label}</span></span>;
  }
  return (
    <a
      href={/^https?:\/\//.test(url) ? url : `https://${url}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{ ...base, color: "#5f0080", textDecoration: "none", fontWeight: 500 }}
    >
      {icon}<span>{label}</span>
    </a>
  );
}
