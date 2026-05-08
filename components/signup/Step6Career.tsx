"use client";

import { useSignupStore } from "@/lib/store/signupStore";
import { CAREER_LABELS } from "@/lib/constants";

interface Props {
  onNext: () => void;
}

export default function Step6Career({ onNext }: Props) {
  const { name, careerYears, isLeader, setCareer } = useSignupStore();
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

      <div className="bg-[#f7f7f8] rounded-lg p-4 mb-4">
        <label className="flex items-center gap-2.5 p-1 cursor-pointer">
          <input
            type="checkbox"
            className="sr-only"
            checked={isLeader}
            onChange={(e) => setCareer({ isLeader: e.target.checked })}
          />
          <span className="checkbox-visual" />
          <span className="text-sm font-medium text-[#1a1a1a]">팀리더 경험</span>
        </label>
        <p className="text-xs text-[#9a9a9a] mt-2 ml-8 leading-relaxed">
          회사에서 프로젝트 리더로서 팀을 이끈 경험이 있는 경우 선택해 주세요.
        </p>
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
