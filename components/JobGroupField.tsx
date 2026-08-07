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
          display: flex; align-items: center; gap: 6px;
          width: 100%; min-width: 0; justify-content: flex-start;
          padding: 0; border: none; background: none;
          cursor: pointer; font-size: 15px;
        }
        .jgf-value:disabled { opacity: 0.6; cursor: not-allowed; }
        .jgf-text { color: #555; font-weight: 400; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
        .jgf-pick { color: #c4c4c4; font-weight: 400; font-size: 15px; white-space: nowrap; }
      `}</style>

      <div>
        <button
          type="button"
          className="jgf-value"
          onClick={() => !disabled && setOpen(true)}
          disabled={disabled}
        >
          {value.length ? (
            <span className="jgf-text">{value.join(", ")}</span>
          ) : (
            <span className="jgf-pick">{placeholder}</span>
          )}
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