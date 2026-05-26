"use client";

import { useSignupStore } from "@/lib/store/signupStore";
import { CAREER_LABELS } from "@/lib/constants";

interface Props {
  onNext: () => void;
}

export default function Step6Career({ onNext }: Props) {
  const { name, careerYears, setCareer } = useSignupStore();
  const displayLabel = `경력 ${CAREER_LABELS[careerYears]}`;
  const percent = (careerYears / (CAREER_LABELS.length - 1)) * 100;

  return (
    <div className="p-7 px-7 pt-10">
      <h2 className="text-[22px] font-bold text-[#1a1a1a] tracking-tight leading-tight text-center mb-9">
        환영해요 <span className="text-primary">{name || "회원"}</span>님!
        <br />
        경력을 선택해 주세요
      </h2>

      <div className="text-center text-base font-bold text-[#1a1a1a] mb-6">
        {displayLabel}
      </div>

      <div className="px-3 mb-12">
        <input
          type="range"
          min="0"
          max="11"
          step="1"
          value={careerYears}
          onChange={(e) => setCareer({ careerYears: parseInt(e.target.value) })}
          className="career-slider w-full mb-3"
          style={{
            background: `linear-gradient(to right, #5f0080 0%, #5f0080 ${percent}%, #ececec ${percent}%, #ececec 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-[#9a9a9a]">
          <span>신입</span>
          <span>10년 이상</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="btn-primary-full active mt-4"
      >
        다음
      </button>
    </div>
  );
}
