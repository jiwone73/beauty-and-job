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

/** 못 고치는 칸. 지원 창처럼 사실은 그대로 두고 서술형만 여는 자리에 쓴다.
 *  누를 수 없다는 것이 보여야 하므로 단추가 아니라 글자로 선다. */
function 잠긴칸(value: string, placeholder: string, 여러줄?: boolean) {
  return (
    <span className={`if-slot if-lock ${value ? "on" : ""} ${여러줄 ? "if-slot-multi" : ""}`}>
      {value || placeholder}
    </span>
  );
}

function 별표(필수?: boolean) {
  return 필수 ? <i className="if-req">*</i> : null;
}

/**
 * 친 글자 길이만큼만 칸을 넓힌다. 고정 폭으로 두면 두 글자 치려고 열었는데
 * 칸이 줄을 다 차지해 옆 칸이 아래로 밀린다(원티드는 글자만큼만 늘어난다).
 * 한글은 라틴 글자의 두 배 폭으로 센다.
 */
function 칸폭(글: string, 자리글: string, 처음폭: number | null) {
  const 셈 = (t: string) => [...t].reduce((a, c) => a + (/[\u3131-\u318E\uAC00-\uD7A3]/.test(c) ? 2 : 1), 0);
  const 글폭 = `${Math.max(2, Math.max(셈(글), 셈(자리글)))}ch`;
  // 누르기 전 자리글 버튼이 차지하던 폭에서 시작한다. 그보다 좁게 열면 옆 칸이 당겨지고,
  // 넓게 열면 밀린다 — 눌러도 아무것도 안 움직이는 것이 원티드의 느낌이다.
  return 처음폭 ? `max(${Math.round(처음폭)}px, ${글폭})` : 글폭;
}

/** 눌러서 그 자리에서 치는 칸. */
export function InlineText({
  value, placeholder, required, onSave, wide, 여러줄, 잠금,
}: {
  value: string;
  placeholder: string;
  required?: boolean;
  onSave: (v: string) => void;
  wide?: boolean;
  잠금?: boolean;
  /** 한 줄을 넘기면 다음 줄이 저절로 생긴다. 주요성과처럼 길어지는 칸에 쓴다. */
  여러줄?: boolean;
}) {
  const [고치는중, set고치는중] = useState(false);
  const [초안, set초안] = useState(value);
  const 칸 = useRef<HTMLInputElement>(null);
  const 여러줄칸 = useRef<HTMLTextAreaElement>(null);
  // 내용만큼만 키운다 — 미리 크게 열어 두면 빈 상자가 화면을 먹는다.
  const 높이맞추기 = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  const 자리 = useRef<HTMLButtonElement>(null);
  const [처음폭, set처음폭] = useState<number | null>(null);
  const 열기 = () => { set처음폭(자리.current?.getBoundingClientRect().width ?? null); set고치는중(true); };

  useEffect(() => { set초안(value); }, [value]);
  useEffect(() => {
    if (!고치는중) return;
    if (여러줄) { 여러줄칸.current?.focus(); 높이맞추기(여러줄칸.current); }
    else 칸.current?.focus();
  }, [고치는중, 여러줄]);

  const 마치기 = () => { set고치는중(false); if (초안.trim() !== value) onSave(초안.trim()); };

  if (잠금) return 잠긴칸(value, placeholder, 여러줄);

  if (고치는중 && 여러줄) {
    return (
      <textarea ref={여러줄칸} className={`if-input if-multi ${wide ? "if-wide" : ""}`} value={초안}
        rows={1} placeholder={placeholder}
        onChange={(e) => { set초안(e.target.value); 높이맞추기(e.currentTarget); }}
        onBlur={마치기}
        onKeyDown={(e) => { if (e.key === "Escape") { set초안(value); set고치는중(false); } }} />
    );
  }

  if (고치는중) {
    return (
      <input ref={칸} className={`if-input ${wide ? "if-wide" : ""}`} value={초안}
        style={wide ? undefined : { width: 칸폭(초안, placeholder, 처음폭) }}
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
    <button ref={자리} type="button" className={`if-slot ${value ? "on" : ""} ${여러줄 ? "if-slot-multi" : ""}`} onClick={열기}>
      {value || placeholder}{!value && 별표(required)}
    </button>
  );
}

/**
 * 치면서 후보를 고르는 칸. 고르면 그 항목 전체를 넘겨 준다 — SNS 는 이름을
 * 고르면 주소 앞부분까지 같이 채워야 해서, 값 하나만으로는 모자란다.
 * 브라우저 자동완성은 꺼 둔다. 우리 목록과 겹쳐 뜨면 어느 쪽을 고른 것인지
 * 알 수 없다.
 */
export function InlineSuggest<T extends { 이름: string }>({
  value, placeholder, required, wide, 찾기, onPick, onSave, 잠금,
}: {
  value: string;
  placeholder: string;
  required?: boolean;
  wide?: boolean;
  찾기: (q: string) => T[];
  onPick: (고른것: T) => void;
  onSave: (v: string) => void;
  잠금?: boolean;
}) {
  const [고치는중, set고치는중] = useState(false);
  const [초안, set초안] = useState(value);
  const 칸 = useRef<HTMLInputElement>(null);
  const 자리 = useRef<HTMLButtonElement>(null);
  const [처음폭, set처음폭] = useState<number | null>(null);
  const 열기 = () => { set처음폭(자리.current?.getBoundingClientRect().width ?? null); set고치는중(true); };
  const 감싸개 = useRef<HTMLSpanElement>(null);

  useEffect(() => { set초안(value); }, [value]);
  useEffect(() => { if (고치는중) 칸.current?.focus(); }, [고치는중]);

  const 후보 = 고치는중 ? 찾기(초안) : [];
  const 마치기 = () => { set고치는중(false); if (초안.trim() !== value) onSave(초안.trim()); };

  useEffect(() => {
    if (!고치는중) return;
    const 밖 = (e: MouseEvent) => { if (!감싸개.current?.contains(e.target as Node)) 마치기(); };
    document.addEventListener("mousedown", 밖);
    return () => document.removeEventListener("mousedown", 밖);
  });

  if (잠금) return 잠긴칸(value, placeholder);

  if (!고치는중) {
    return (
      <button ref={자리} type="button" className={`if-slot ${value ? "on" : ""}`} onClick={열기}>
        {value || placeholder}{!value && required && <i className="if-req">*</i>}
      </button>
    );
  }
  return (
    <span className="if-wrap" ref={감싸개} style={wide ? { width: "100%" } : undefined}>
      <input ref={칸} className={`if-input ${wide ? "if-wide" : ""}`} value={초안}
        style={wide ? undefined : { width: 칸폭(초안, placeholder, 처음폭) }}
        placeholder={placeholder} autoComplete="off"
        onChange={(e) => set초안(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { if (후보[0]) { onPick(후보[0]); set고치는중(false); } else 마치기(); }
          if (e.key === "Escape") { set초안(value); set고치는중(false); }
        }} />
      {후보.length > 0 && (
        <span className="if-pop" style={{ top: "calc(100% + 4px)" }}>
          {후보.map((k) => (
            <button key={k.이름} type="button" className="if-pop-item"
              onMouseDown={(e) => { e.preventDefault(); onPick(k); set고치는중(false); }}>
              {k.이름}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

/** 눌러서 목록에서 고르는 칸. 고를 것이 정해져 있으면 치는 것보다 빠르다. */
export function InlinePick({
  value, placeholder, required, options, onSave, 잠금,
}: {
  value: string;
  placeholder: string;
  required?: boolean;
  options: string[];
  onSave: (v: string) => void;
  잠금?: boolean;
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

  if (잠금) return 잠긴칸(value, placeholder);

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
/**
 * 연 → 월 → 일 을 그 자리에서 고른다. 생년월일처럼 세 토막이 다 필요한 칸에 쓴다.
 * 큰 입력칸에 여덟 자리를 치게 하면 오타가 나고, 저장·취소 단추까지 붙어
 * 칸 하나 고치자고 화면이 들썩인다.
 */
export function InlineYMD({
  value, placeholder = "YYYY.MM.DD", required, onSave, 올해 = new Date().getFullYear(), 몇해 = 90,
}: {
  value: string;
  placeholder?: string;
  required?: boolean;
  onSave: (v: string) => void;
  올해?: number;
  몇해?: number;
}) {
  const [열림, set열림] = useState(false);
  const [연, set연] = useState<number | null>(null);
  const [월, set월] = useState<number | null>(null);
  const 감싸개 = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!열림) return;
    const m = value.match(/(\d{4})/);
    set연(m ? Number(m[1]) : null);
    set월(null);
  }, [열림, value]);

  useEffect(() => {
    if (!열림) return;
    const 밖 = (e: MouseEvent) => { if (!감싸개.current?.contains(e.target as Node)) set열림(false); };
    const 키 = (e: KeyboardEvent) => { if (e.key === "Escape") set열림(false); };
    document.addEventListener("mousedown", 밖);
    window.addEventListener("keydown", 키);
    return () => { document.removeEventListener("mousedown", 밖); window.removeEventListener("keydown", 키); };
  }, [열림]);

  const 연들 = Array.from({ length: 몇해 }, (_, i) => 올해 - i);
  const 그달일수 = (y: number, m: number) => new Date(y, m, 0).getDate();

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
          ) : 월 === null ? (
            <>
              <span className="if-ym-head">
                <button type="button" onClick={() => set연(null)}>{연}년</button>
              </span>
              <span className="if-ym-grid if-ym-month">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <button key={m} type="button" className="if-ym-cell" onClick={() => set월(m)}>
                    {String(m).padStart(2, "0")}
                  </button>
                ))}
              </span>
            </>
          ) : (
            <>
              <span className="if-ym-head">
                <button type="button" onClick={() => set월(null)}>{연}년 {String(월).padStart(2, "0")}월</button>
              </span>
              <span className="if-ym-grid if-ym-month">
                {Array.from({ length: 그달일수(연, 월) }, (_, i) => i + 1).map((d) => (
                  <button key={d} type="button" className="if-ym-cell"
                    onClick={() => {
                      onSave(`${연}.${String(월).padStart(2, "0")}.${String(d).padStart(2, "0")}`);
                      set열림(false);
                    }}>
                    {String(d).padStart(2, "0")}
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

export function InlineYM({
  value, placeholder = "YYYY.MM", required, onSave, 올해 = 2026, 잠금,
}: {
  value: string;
  placeholder?: string;
  required?: boolean;
  onSave: (v: string) => void;
  올해?: number;
  잠금?: boolean;
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

  if (잠금) return 잠긴칸(value, placeholder);

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
