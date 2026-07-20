"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface FilterDropdownProps {
  label: string;          // 예: "채용유형"
  value: string;          // 현재 선택값 예: "전체"
  options: string[];      // 예: ["전체", "매장", "기업"]
  onChange: (v: string) => void;
}

/** 라벨 + 선택값을 함께 보여주는 필터 드롭다운 (닫힘: "채용유형 · 전체", 목록: 전체/매장/기업) */
export default function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className="filter-dd-btn" onClick={() => setOpen((v) => !v)}>
        <span>{label} · {value}</span>
        <ChevronDown size={14} style={{ color: "#999", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>
      {open && (
        <div className="filter-dd-menu">
          {options.map((o) => (
            <button key={o} type="button"
              className={`filter-dd-item ${o === value ? "active" : ""}`}
              onClick={() => { onChange(o); setOpen(false); }}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
