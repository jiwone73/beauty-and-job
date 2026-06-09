"use client";

import { useState } from "react";
import JobGroupSelectModal from "./JobGroupSelectModal";
import { type JobType } from "@/lib/data/jobGroups";

interface Props {
  jobType: JobType;                 // "OFFICE" | "STORE"
  value: string[];                  // 선택된 직군
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxSelect?: number;
  title?: string;
  disabled?: boolean;
}

export default function JobGroupField({
  jobType,
  value,
  onChange,
  placeholder = "직군을 선택해주세요",
  maxSelect,
  title,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <style>{`
        .jgf-trigger {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px; border: 1.5px solid #e0e0e0; border-radius: 10px;
          background: #fff; cursor: pointer; font-size: 14px; text-align: left;
        }
        .jgf-trigger:hover:not(:disabled) { border-color: #c9a3d6; }
        .jgf-trigger:disabled { opacity: 0.6; cursor: not-allowed; }
        .jgf-text { color: #333; font-weight: 500; }
        .jgf-ph { color: #aaa; }
        .jgf-arrow { color: #999; font-size: 14px; }
        .jgf-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .jgf-chip {
          display: inline-flex; align-items: center; gap: 4px;
          background: #f3e5f5; color: #5f0080;
          border-radius: 16px; padding: 5px 10px; font-size: 13px; font-weight: 600;
        }
        .jgf-chip button {
          background: none; border: none; color: #5f0080;
          cursor: pointer; font-size: 14px; line-height: 1; padding: 0;
        }
      `}</style>

      <div>
        <button
          type="button"
          className="jgf-trigger"
          onClick={() => !disabled && setOpen(true)}
          disabled={disabled}
        >
          <span className={value.length ? "jgf-text" : "jgf-ph"}>
            {value.length === 0
              ? placeholder
              : value.length === 1
              ? value[0]
              : `${value[0]} 외 ${value.length - 1}`}
          </span>
          <span className="jgf-arrow">⌄</span>
        </button>

        {value.length > 0 && (
          <div className="jgf-chips">
            {value.map((item) => (
              <span key={item} className="jgf-chip">
                {item}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v !== item))}
                  aria-label={`${item} 삭제`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <JobGroupSelectModal
        open={open}
        jobType={jobType}
        selected={value}
        onChange={onChange}
        onClose={() => setOpen(false)}
        maxSelect={maxSelect}
        title={title}
      />
    </>
  );
}