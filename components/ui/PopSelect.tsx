"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

type Opt = { value: string; label: string };
type Group = { label?: string; items: Opt[] };

/** 네이티브 <select> 대신 쓰는 커스텀 드롭다운.
 *
 *  네이티브 select는 iOS·안드로이드에서 기기 기본 시트(화면을 덮는 어두운
 *  휠·목록)로 뜬다 — 같은 화면의 다른 칸(문자 입력, 인라인 편집, 공고 등록 폼의
 *  드롭다운())은 다 같은 자리에 붙는 작은 팝오버인데 이 칸만 갑자기 기기 UI로
 *  튀어 화면이 갈라져 보였다("이 풀다운 통일하기로 한 걸로 수정해줘"). 트리거는
 *  className="admin-form-select"를 그대로 받아 기존 select와 같은 모양(테두리·
 *  화살표·자리색)을 그대로 쓰고, 목록만 이 컴포넌트가 새로 그린다.
 *
 *  options 는 평평한 목록, groups 는 업종처럼 묶음 이름이 있는 목록 — 업종은
 *  묶음이 없으면 목록이 너무 길어 찾기 어렵다. 표시 높이 계산은 항목 수만
 *  대충 세므로(묶음 이름 줄까지 다 세지는 않는다) 넉넉히 어림한다. */
export default function PopSelect({
  value, options, groups, onChange, placeholder = "선택하기", disabled, className = "admin-form-select", style,
}: {
  value: string;
  options?: Opt[];
  groups?: Group[];
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const flat = useMemo(() => groups ? groups.flatMap((g) => g.items) : (options || []), [groups, options]);
  const 항목수 = useMemo(() => flat.length + (groups ? groups.filter((g) => g.label).length : 0), [flat, groups]);
  const selected = flat.find((o) => o.value === value);

  const place = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const height = Math.min(항목수, 8) * 34 + 12;
    const 아래공간 = window.innerHeight - 8 - (r.bottom + 4);
    const 위공간 = r.top - 4 - 8;
    const 위로 = r.bottom + 4 + height > window.innerHeight - 8 && 위공간 > 아래공간;
    const width = Math.max(r.width, 120);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    const top = 위로 ? r.top - height - 4 : r.bottom + 4;
    setPos({ left, top, width });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onReposition = () => place();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const 옵션버튼 = (o: Opt) => (
    <button key={o.value} type="button" className="ui-pop-opt"
      style={o.value === value ? { background: "#f7f7f8", color: "var(--color-primary)" } : undefined}
      onClick={() => { onChange(o.value); setOpen(false); }}>
      {o.label}
    </button>
  );

  return (
    <>
      <button type="button" ref={btnRef} disabled={disabled}
        className={className} data-empty={!value} style={{ textAlign: "left", cursor: disabled ? "default" : "pointer", ...style }}
        onClick={() => setOpen((v) => !v)}>
        {selected?.label || placeholder}
      </button>
      {open && pos && createPortal(
        <div ref={popRef} className="ui-pop-list" style={{ left: pos.left, top: pos.top, minWidth: pos.width }}>
          {groups
            ? groups.map((g, gi) => (
                <div key={gi}>
                  {g.label && <div className="ui-pop-group">{g.label}</div>}
                  {g.items.map(옵션버튼)}
                </div>
              ))
            : (options || []).map(옵션버튼)}
        </div>,
        document.body
      )}
    </>
  );
}
