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
  placeholder = "직군 선택",
  maxSelect,
  title,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <style>{`
        .jgf-value {
          display: inline-flex; align-items: center; gap: 6px;
          max-width: 100%; padding: 0; border: none; background: none;
          cursor: pointer; font-size: 14px;
        }
        .jgf-value:disabled { opacity: 0.6; cursor: not-allowed; }
        .jgf-text { color: #555; font-weight: 400; text-align: right; }
        .jgf-ph { color: #bbb; font-weight: 400; }
        .jgf-chev { color: #ccc; font-size: 16px; flex-shrink: 0; }
      `}</style>

      <div>
        <button
          type="button"
          className="jgf-value"
          onClick={() => !disabled && setOpen(true)}
          disabled={disabled}
        >
          <span className={value.length ? "jgf-text" : "jgf-ph"}>
            {value.length ? value.join(", ") : placeholder}
          </span>
          <span className="jgf-chev">›</span>
        </button>
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