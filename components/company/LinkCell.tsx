"use client";
import type { CSSProperties, ReactNode } from "react";

/**
 * 작업물 표시 한 줄 (사진 · SNS).
 * 값이 없어도 지우지 않고 흐리게 남긴다 — '아직 없다'는 것도 판단에 쓰이는 정보다.
 * 인재검색·스크랩 인재·지원자 관리·회원관리에서 같은 모양으로 쓴다.
 *
 * 링크는 걸지 않는다. 눌러 봐야 사진 한 장이 새 탭에 뜰 뿐이고, 실제로 볼 것은
 * 옆 칸의 이력서 안에 다 있다. 여기서는 있는지 없는지만 알려 준다.
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
  const 있음 = !!url;
  const style: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 3, fontSize: 13,
    color: 있음 ? "#582681" : "#d0d0d0",
    fontWeight: 있음 ? 500 : 400,
  };
  return <span style={style}>{icon}<span>{label}</span></span>;
}
