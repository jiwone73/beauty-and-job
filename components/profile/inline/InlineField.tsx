"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * 칸 하나만 고치는 조각들.
 *
 * 이력서는 무엇을 적어야 하는지가 먼저 보여야 한다. 그래서 값이 없어도 자리를
 * 비우지 않고 무슨 칸인지 회색으로 적어 둔다. 고칠 때도 폼 전체가 아니라
 * 누른 칸 하나만 열린다 — 매장명 하나 고치자고 기간·직급까지 다시 마주할
 * 이유가 없다.
 */

function 별표(필수?: boolean) {
  return 필수 ? <i className="if-req">*</i> : null;
}

/** 눌러서 그 자리에서 치는 칸. */
export function InlineText({
  value, placeholder, required, onSave, wide,
}: {
  value: string;
  placeholder: string;
  required?: boolean;
  onSave: (v: string) => void;
  wide?: boolean;
}) {
  const [고치는중, set고치는중] = useState(false);
  const [초안, set초안] = useState(value);
  const 칸 = useRef<HTMLInputElement>(null);

  useEffect(() => { set초안(value); }, [value]);
  useEffect(() => { if (고치는중) 칸.current?.focus(); }, [고치는중]);

  const 마치기 = () => { set고치는중(false); if (초안.trim() !== value) onSave(초안.trim()); };

  if (고치는중) {
    return (
      <input ref={칸} className={`if-input ${wide ? "if-wide" : ""}`} value={초안}
        placeholder={placeholder}
        onChange={(e) => set초안(e.target.value)}
        onBlur={마치기}
        onKeyDown={(e) => {
          if (e.key === "Enter") 마치기();
          if (e.key === "Escape") { set초안(value); set고치는중(false); }
        }} />
    );
  }
  return (
    <button type="button" className={`if-slot ${value ? "on" : ""}`} onClick={() => set고치는중(true)}>
      {value || placeholder}{!value && 별표(required)}
    </button>
  );
}

/** 눌러서 목록에서 고르는 칸. 고를 것이 정해져 있으면 치는 것보다 빠르다. */
export function InlinePick({
  value, placeholder, required, options, onSave,
}: {
  value: string;
  placeholder: string;
  required?: boolean;
  options: string[];
  onSave: (v: string) => void;
}) {
  const [열림, set열림] = useState(false);
  const 감싸개 = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!열림) return;
    const 밖 = (e: MouseEvent) => { if (!감싸개.current?.contains(e.target as Node)) set열림(false); };
    const 키 = (e: KeyboardEvent) => { if (e.key === "Escape") set열림(false); };
    document.addEventListener("mousedown", 밖);
    window.addEventListener("keydown", 키);
    return () => { document.removeEventListener("mousedown", 밖); window.removeEventListener("keydown", 키); };
  }, [열림]);

  return (
    <span className="if-wrap" ref={감싸개}>
      <button type="button" className={`if-slot ${value ? "on" : ""}`} onClick={() => set열림((v) => !v)}>
        {value || placeholder}{!value && 별표(required)}
      </button>
      {열림 && (
        <span className="if-pop">
          {options.map((o) => (
            <button key={o} type="button" className={`if-pop-item ${o === value ? "on" : ""}`}
              onClick={() => { onSave(o === value ? "" : o); set열림(false); }}>{o}</button>
          ))}
        </span>
      )}
    </span>
  );
}

/** 연·월을 고르는 칸. 손으로 치게 하면 형식이 제각각이 된다. */
export function InlineYM({
  value, placeholder = "YYYY.MM", required, onSave, 올해 = 2026,
}: {
  value: string;
  placeholder?: string;
  required?: boolean;
  onSave: (v: string) => void;
  올해?: number;
}) {
  const [열림, set열림] = useState(false);
  const [연, set연] = useState<number | null>(null);
  const 감싸개 = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!열림) return;
    const m = value.match(/(\d{4})/);
    set연(m ? Number(m[1]) : null);
  }, [열림, value]);

  useEffect(() => {
    if (!열림) return;
    const 밖 = (e: MouseEvent) => { if (!감싸개.current?.contains(e.target as Node)) set열림(false); };
    const 키 = (e: KeyboardEvent) => { if (e.key === "Escape") set열림(false); };
    document.addEventListener("mousedown", 밖);
    window.addEventListener("keydown", 키);
    return () => { document.removeEventListener("mousedown", 밖); window.removeEventListener("keydown", 키); };
  }, [열림]);

  const 연들 = Array.from({ length: 40 }, (_, i) => 올해 - i);

  return (
    <span className="if-wrap" ref={감싸개}>
      <button type="button" className={`if-slot ${value ? "on" : ""}`} onClick={() => set열림((v) => !v)}>
        {value || placeholder}{!value && 별표(required)}
      </button>
      {열림 && (
        <span className="if-pop if-pop-ym">
          {연 === null ? (
            <span className="if-ym-grid">
              {연들.map((y) => (
                <button key={y} type="button" className="if-ym-cell" onClick={() => set연(y)}>{y}</button>
              ))}
            </span>
          ) : (
            <>
              <span className="if-ym-head">
                <button type="button" onClick={() => set연(null)}>{연}년</button>
              </span>
              <span className="if-ym-grid if-ym-month">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <button key={m} type="button" className="if-ym-cell"
                    onClick={() => { onSave(`${연}.${String(m).padStart(2, "0")}`); set열림(false); }}>
                    {String(m).padStart(2, "0")}
                  </button>
                ))}
              </span>
            </>
          )}
        </span>
      )}
    </span>
  );
}
