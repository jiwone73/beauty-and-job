"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

// 사이드 필터에서 대분류를 누르면 옆으로 펼쳐지는 판.
//
// 채용공고 페이지가 쓰던 것을 그대로 뺐다. 인재검색도 같은 필터를 써야 하는데
// 한쪽에만 있으면 어휘와 움직임이 갈라진다 — 실제로 인재검색은 상단 드롭다운,
// 공고는 사이드 펼침으로 서로 달랐다.

export function Pop({
  title, onClose, 좌, 상, children,
}: { title: string; onClose: () => void; 좌: number; 상: number; children: React.ReactNode }) {
  const 상자 = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const 바깥 = (e: MouseEvent) => {
      if (상자.current && !상자.current.contains(e.target as Node)) onClose();
    };
    const 키 = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    // 여는 클릭이 그대로 '바깥 클릭'으로 잡히지 않도록 한 틱 뒤에 건다.
    const t = setTimeout(() => document.addEventListener("mousedown", 바깥), 0);
    document.addEventListener("keydown", 키);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", 바깥); document.removeEventListener("keydown", 키); };
  }, [onClose]);
  return (
    <div className="jobs-pop" ref={상자} role="dialog" aria-label={title} style={{ left: 좌, top: 상 }}>
      <div className="jobs-pop-h">
        <span className="jobs-pop-title">{title}</span>
        <button type="button" onClick={onClose} aria-label="닫기"><X size={14} /></button>
      </div>
      <div className="jobs-pop-body">{children}</div>
    </div>
  );
}

export function PopItem({
  on, onClick, children,
}: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={`jobs-pop-item${on ? " on" : ""}`} onClick={onClick}>
      <span className={`jobs-checkbox ${on ? "on" : ""}`}>{on ? "✓" : ""}</span>
      {children}
    </button>
  );
}

/** 누른 단추 오른쪽에 판이 뜰 자리를 잰다. 화면 밖으로 나가면 안쪽으로 당긴다. */
export function 팝자리(e: React.MouseEvent) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const 폭 = 260;
  const 좌 = r.right + 8 + 폭 > window.innerWidth ? Math.max(8, r.left - 폭 - 8) : r.right + 8;
  return { 좌, 상: Math.max(8, Math.min(r.top, window.innerHeight - 320)) };
}
