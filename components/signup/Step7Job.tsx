"use client";
import { useState } from "react";
import { useSignupStore } from "@/lib/store/signupStore";
import { JOB_TYPE_OPTIONS } from "@/lib/constants";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onNext: () => void;
}

type JobType = "기업·사무직" | "매장·기술직";

export default function Step7Job({ onNext }: Props) {
  const { job, jobCustom, setJob } = useSignupStore();
  const [jobType, setJobType] = useState<JobType | null>(null);
  const [customInput, setCustomInput] = useState(jobCustom);
  const [step, setStep] = useState<"type" | "job">("type");

  const isCustomMode = job === "직접입력";
  const valid = job !== "" && (!isCustomMode || customInput.trim() !== "");

  const handleTypeSelect = (type: JobType) => {
    setJobType(type);
    setStep("job");
    setJob(""); // 직군 초기화
  };

  const handleJobSelect = (value: string) => {
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

  const jobOptions = jobType ? JOB_TYPE_OPTIONS[jobType] : [];

  return (
    <div className="p-7 px-7">
      {step === "type" ? (
        <>
          <h2 className="text-[22px] font-bold text-[#1a1a1a] tracking-tight leading-tight mb-2 text-center">
            어떤 일을 찾고 계세요?
          </h2>
          <p className="text-[14px] text-[#888] text-center mb-8">
            직종 유형을 먼저 선택해 주세요
          </p>
          <div className="flex flex-col gap-4 mb-6">
            {/* 기업·사무직 카드 */}
            <button
              type="button"
              onClick={() => handleTypeSelect("기업·사무직")}
              className="w-full p-5 rounded-2xl border-2 border-[#f0f0f0] bg-[#fafafa] text-left transition-all hover:border-primary hover:bg-primary-pale group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#f5eaff] flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                  🏢
                </div>
                <div>
                  <p className="text-[16px] font-bold text-[#1a1a1a] mb-1">기업·사무직</p>
                  <p className="text-[13px] text-[#888]">마케팅, MD, 영업, 디자인, 연구개발 등</p>
                </div>
                <ArrowRight size={20} className="ml-auto text-[#ccc] group-hover:text-primary" />
              </div>
            </button>

            {/* 매장·기술직 카드 */}
            <button
              type="button"
              onClick={() => handleTypeSelect("매장·기술직")}
              className="w-full p-5 rounded-2xl border-2 border-[#f0f0f0] bg-[#fafafa] text-left transition-all hover:border-primary hover:bg-primary-pale group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#fff0f5] flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                  💄
                </div>
                <div>
                  <p className="text-[16px] font-bold text-[#1a1a1a] mb-1">매장·기술직</p>
                  <p className="text-[13px] text-[#888]">네일, 헤어, 피부관리, 메이크업 등</p>
                </div>
                <ArrowRight size={20} className="ml-auto text-[#ccc] group-hover:text-primary" />
              </div>
            </button>
          </div>
        </>
      ) : (
        <>
          {/* 뒤로가기 + 타이틀 */}
          <div className="flex items-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => { setStep("type"); setJob(""); }}
              className="p-1.5 rounded-lg hover:bg-[#f5f5f5] transition-all"
            >
              <ArrowLeft size={20} className="text-[#666]" />
            </button>
            <div>
              <p className="text-[12px] text-[#5f0080] font-600">{jobType}</p>
              <h2 className="text-[20px] font-bold text-[#1a1a1a] leading-tight">
                직군을 선택해 주세요
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {jobOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleJobSelect(opt)}
                className={cn(
                  "h-14 rounded-xl text-[14px] font-medium transition-all border-2",
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
            <span>{valid ? (isCustomMode ? customInput || "다음" : job) : "다음"}</span>
            {valid && <ArrowRight size={18} className="ml-1.5" strokeWidth={2.5} />}
          </button>
        </>
      )}
    </div>
  );
}
