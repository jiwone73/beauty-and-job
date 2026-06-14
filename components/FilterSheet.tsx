"use client";
import { useState, useEffect } from "react";
import { X, RotateCcw } from "lucide-react";

const CAREER_OPTS = [
  { label: "전체", value: "경력 전체" },
  { label: "신입", value: "NEW" },
  { label: "경력", value: "EXPERIENCED" },
  { label: "무관", value: "ANY" },
];

const EMPLOYMENT_OPTS = [
  { label: "전체", value: "고용형태 전체" },
  { label: "정규직", value: "정규직" },
  { label: "계약직", value: "계약직" },
  { label: "인턴", value: "인턴" },
  { label: "아르바이트", value: "아르바이트" },
  { label: "프리랜서", value: "프리랜서" },
];

export interface FilterDraft {
  career: string;      // "경력 전체" | "NEW" | "EXPERIENCED" | "ANY"
  employment: string;  // "고용형태 전체" | "정규직" | ...
}

interface Props {
  open: boolean;
  initial: FilterDraft;
  onClose: () => void;
  onApply: (f: FilterDraft) => void;
}

export default function FilterSheet({ open, initial, onClose, onApply }: Props) {
  const [draft, setDraft] = useState<FilterDraft>(initial);

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open]);

  if (!open) return null;

  const reset = () => setDraft({ career: "경력 전체", employment: "고용형태 전체" });

  return (
    <div className="region-modal-overlay" onClick={onClose}>
      <div className="region-modal filter-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="region-modal-head">
          <span className="region-modal-spacer" />
          <span className="region-modal-title">상세 필터</span>
          <button type="button" className="region-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="filter-sheet-body">
          {/* 경력 */}
          <div className="filter-section">
            <div className="filter-section-title">경력</div>
            <div className="filter-chip-grid">
              {CAREER_OPTS.map((o) => (
                <button key={o.value} type="button"
                  className={`filter-chip ${draft.career === o.value ? "on" : ""}`}
                  onClick={() => setDraft({ ...draft, career: o.value })}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* 고용형태 */}
          <div className="filter-section">
            <div className="filter-section-title">고용형태</div>
            <div className="filter-chip-grid">
              {EMPLOYMENT_OPTS.map((o) => (
                <button key={o.value} type="button"
                  className={`filter-chip ${draft.employment === o.value ? "on" : ""}`}
                  onClick={() => setDraft({ ...draft, employment: o.value })}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* 다음 단계: 복리후생 · 급여 섹션 */}
        </div>

        <div className="region-modal-foot filter-sheet-foot">
          <button type="button" className="filter-reset-btn" onClick={reset}>
            <RotateCcw size={14} /> 초기화
          </button>
          <button type="button" className="region-apply-btn"
            onClick={() => { onApply(draft); onClose(); }}>
            적용하기
          </button>
        </div>
      </div>
    </div>
  );
}