"use client";
import { useState } from "react";
import { useSignupStore } from "@/lib/store/signupStore";
import { COUNTRY_OPTIONS } from "@/lib/constants";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { onNext: () => void; }

const WORK_TYPE_OPTIONS = ["풀타임", "파트타임", "주말·공휴일", "평일만", "무관"];
const WORK_REGION_OPTIONS = ["서울", "경기·인천", "부산·경남", "대구·경북", "광주·전남", "대전·충청", "제주", "지역 무관"];

export default function Step9Country({ onNext }: Props) {
  const {
    jobType,
    countries, countryCustom,
    toggleCountry, addCountryCustom, removeCountryCustom,
  } = useSignupStore();

  const isSalon = jobType === "매장·기술직";

  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [workRegions, setWorkRegions] = useState<string[]>([]);
  const [showCustom, setShowCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const toggleWorkType = (v: string) =>
    setWorkTypes(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  const toggleWorkRegion = (v: string) =>
    setWorkRegions(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const handleChipClick = (opt: string) => {
    if (opt === "직접입력") { setShowCustom(p => !p); return; }
    toggleCountry(opt);
  };

  const handleAddCustom = () => {
    const v = customInput.trim();
    if (!v) return;
    addCountryCustom(v);
    setCustomInput("");
  };

  const officeValid = countries.length > 0 || countryCustom.length > 0;
  const salonValid = workTypes.length > 0 && workRegions.length > 0;
  const valid = isSalon ? salonValid : officeValid;

  return (
    <div className="p-7 px-7">
      {isSalon ? (
        <>
          <h2 className="text-[22px] font-bold text-[#1a1a1a] tracking-tight leading-tight mb-2 text-center">
            희망 근무 조건
          </h2>
          <p className="text-sm text-[#6b6b6b] mb-7 leading-relaxed text-center">
            원하는 근무 형태와 지역을 선택해 주세요
          </p>

          <div className="mb-6">
            <p className="text-[14px] font-bold text-[#1a1a1a] mb-3">근무 형태</p>
            <div className="flex flex-wrap gap-2">
              {WORK_TYPE_OPTIONS.map((opt) => (
                <button key={opt} type="button" onClick={() => toggleWorkType(opt)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium border transition-all",
                    workTypes.includes(opt)
                      ? "bg-primary border-primary text-white"
                      : "bg-white border-[#e5e5e5] text-[#6b6b6b] hover:border-primary-light hover:text-primary"
                  )}>{opt}</button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <p className="text-[14px] font-bold text-[#1a1a1a] mb-3">희망 근무 지역</p>
            <div className="flex flex-wrap gap-2">
              {WORK_REGION_OPTIONS.map((opt) => (
                <button key={opt} type="button" onClick={() => toggleWorkRegion(opt)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium border transition-all",
                    workRegions.includes(opt)
                      ? "bg-primary border-primary text-white"
                      : "bg-white border-[#e5e5e5] text-[#6b6b6b] hover:border-primary-light hover:text-primary"
                  )}>{opt}</button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-[22px] font-bold text-[#1a1a1a] tracking-tight leading-tight mb-2 text-center">
            담당 국가
          </h2>
          <p className="text-sm text-[#6b6b6b] mb-7 leading-relaxed text-center">
            현재까지 담당했던 국가를 모두 선택해 주세요
          </p>

          {showCustom && (
            <div className="mb-5 p-4 bg-[#f7f7f8] rounded-lg border border-primary-soft">
              <label className="block text-sm font-medium text-[#1a1a1a] mb-2.5">직접 입력</label>
              <div className="grid grid-cols-[1fr_auto] gap-2 mb-3">
                <input type="text" value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
                  placeholder="국가를 입력해주세요"
                  maxLength={20} className="text-input" autoFocus />
                <button type="button" onClick={handleAddCustom}
                  className="h-[52px] px-[18px] bg-white text-primary border border-primary rounded-lg text-sm font-medium hover:bg-primary hover:text-white transition-all whitespace-nowrap">
                  추가하기
                </button>
              </div>
              {countryCustom.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {countryCustom.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 bg-primary text-white text-xs px-3 py-1.5 rounded-full">
                      {c}
                      <button type="button" onClick={() => removeCountryCustom(c)}
                        className="hover:bg-white/20 rounded-full p-0.5">
                        <X size={10} strokeWidth={3} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {COUNTRY_OPTIONS.map((opt) => {
              const isSelected = countries.includes(opt);
              const isToggleInput = opt === "직접입력";
              const isActive = isToggleInput ? showCustom : isSelected;
              return (
                <button key={opt} type="button" onClick={() => handleChipClick(opt)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium border transition-all",
                    isActive
                      ? "bg-primary border-primary text-white"
                      : "bg-white border-[#e5e5e5] text-[#6b6b6b] hover:border-primary-light hover:text-primary"
                  )}>
                  {opt === "직접입력" ? "직접 입력" : opt}
                </button>
              );
            })}
          </div>
        </>
      )}

      <button type="button" onClick={onNext} disabled={!valid}
        className={cn("btn-primary-full", valid && "active")}>
        다음
      </button>
    </div>
  );
}
