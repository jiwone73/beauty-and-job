"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * 이력서 편집 칸이 함께 쓰는 껍데기.
 *
 * 큰 화면에서는 **누른 자리 옆에 뜨는 팝오버**, 폰에서는 지금까지 쓰던
 * 가운데 모달이다.
 *
 * 왜 갈랐나: 어학 한 줄, 자격증 한 줄을 넣자고 화면을 통째로 덮으면 방금
 * 무엇을 하고 있었는지가 사라진다. 옆에 뜨면 채우던 이력서가 그대로 보인다.
 * 폰은 화면이 좁아 팝오버가 결국 전체를 덮으므로 모달이 맞다.
 *
 * 누른 자리를 어떻게 아나: 이 껍데기는 어느 버튼이 자기를 열었는지 모른다.
 * 그래서 문서 전체에서 눌린 버튼의 자리를 계속 적어 두고(마지막 하나만),
 * 열릴 때 그 자리를 쓴다. 버튼을 눌러야 열리므로 마지막 기록이 곧 그 버튼이다.
 */

let 마지막버튼: DOMRect | null = null;

if (typeof window !== "undefined") {
  document.addEventListener(
    "mousedown",
    (e) => {
      const b = (e.target as HTMLElement)?.closest?.("button");
      if (b) 마지막버튼 = b.getBoundingClientRect();
    },
    true
  );
}

const 팝오버폭 = 420;
const 여백 = 12;

export default function CvPanel({
  onClose,
  children,
  className = "",
}: {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const 판 = useRef<HTMLDivElement>(null);
  const [자리, set자리] = useState<{ 좌: number; 상: number } | null>(null);
  const [팝오버냐, set팝오버냐] = useState(false);

  useLayoutEffect(() => {
    const 넓나 = window.innerWidth >= 1024;
    set팝오버냐(넓나);
    if (!넓나 || !마지막버튼) return;
    const r = 마지막버튼;
    const 높이 = 판.current?.offsetHeight ?? 360;

    // 버튼 오른쪽 끝을 팝오버 오른쪽 끝에 맞춘다 — 더하기 단추가 칸 오른쪽에
    // 있어서, 왼쪽으로 펼쳐야 칸 안에 들어온다.
    let 좌 = r.right - 팝오버폭;
    if (좌 < 여백) 좌 = 여백;
    if (좌 + 팝오버폭 > window.innerWidth - 여백) 좌 = window.innerWidth - 팝오버폭 - 여백;

    // 아래에 자리가 없으면 위로 뒤집는다.
    let 상 = r.bottom + 8;
    if (상 + 높이 > window.innerHeight - 여백) {
      상 = Math.max(여백, r.top - 높이 - 8);
    }
    set자리({ 좌, 상 });
  }, []);

  // Esc 로 닫는다. 팝오버는 바깥을 눌러도 닫힌다(덮개가 받는다).
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const 팝오버 = 팝오버냐 && 자리;

  return (
    <div className={`cv-overlay ${팝오버 ? "cv-overlay-pop" : ""}`} onClick={onClose}>
      <div
        ref={판}
        className={`cv-modal ${className} ${팝오버 ? "cv-modal-pop" : ""}`}
        style={팝오버 ? { left: 자리!.좌, top: 자리!.상 } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
