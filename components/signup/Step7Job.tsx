"use client";

import { useState } from "react";
import { useSignupStore } from "@/lib/store/signupStore";
import { JOB_OPTIONS } from "@/lib/constants";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onNext: () => void;
}

export default function Step7Job({ onNext }: Props) {
  const { job, jobCustom, setJob } = useSignupStore();
  const [customInput, setCustomInput] = useState(jobCustom);

  const isCustomMode = job === "직접입력";
  const valid = job !== "" && (!isCustomMode || customInput.trim() !== "");
  const buttonText = isCustomMode && customInput.trim() ? customInput : (job || "다음");

  const handleSelect = (value: string) => {
    if (value === "직접입력") {
      setJob("직접입력", customInput);
    } else {
      setJob(value);
      setCustomInput("");
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setCustomInput(v);
    if (isCustomMode) setJob("직접입력", v);
  };

  return (
    <div className="p-7 px-7">
      <h2 className="text-[22px] font-bold text-[#1a1a1a] tracking-tight leading-tight mb-7 text-center">
        직군을 선택해 주세요
      </h2>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {JOB_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => handleSelect(opt)}
            className={cn(
              "h-16 rounded-lg text-[15px] font-medium transition-all border-2",
              job === opt
                ? "bg-primary-soft border-primary text-primary font-bold"
                : "bg-[#f7f7f8] border-transparent text-[#6b6b6b] hover:bg-primary-pale hover:text-primary"
            )}
          >
            {opt === "직접입력" ? "직접 입력" : opt}
          </button>
        ))}
      </div>

      {isCustomMode && (
        <div className="mb-4">
          <input
            type="text"
            value={customInput}
            onChange={handleCustomChange}
            placeholder="직군을 입력해주세요"
            maxLength={20}
            className="text-input"
            autoFocus
          />
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={!valid}
        className={cn("btn-primary-full", valid && "active")}
      >
        <span>{valid ? buttonText : "다음"}</span>
        {valid && <ArrowRight size={18} className="ml-1.5" strokeWidth={2.5} />}
      </button>
    </div>
  );
}
