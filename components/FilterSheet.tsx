"use client";
import { useState, useEffect } from "react";
import { X, RotateCcw } from "lucide-react";

const CAREER_OPTIONS = ["신입", "1년", "2년", "3년", "4년", "5년", "6년", "7년", "8년", "9년", "10년 이상", "경력 무관"];

export interface FilterDraft {
  career: string; // "경력 전체" 또는 옵션값
  // 추후: employment, benefits[], salaryMin, salaryMax 등 추가 예정
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

  const reset = () => setDraft({ career: "경력 전체" });

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
              <button type="button"
                className={`filter-chip ${draft.career === "경력 전체" ? "on" : ""}`}
                onClick={() => setDraft({ ...draft, career: "경력 전체" })}>
                전체
              </button>
              {CAREER_OPTIONS.map((c) => (
                <button key={c} type="button"
                  className={`filter-chip ${draft.career === c ? "on" : ""}`}
                  onClick={() => setDraft({ ...draft, career: c })}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 다음 단계에서 여기에 고용형태 · 복리후생 · 급여 섹션 추가 */}
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