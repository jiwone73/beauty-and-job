"use client";
import { useState } from "react";
import { useSignupStore } from "@/lib/store/signupStore";
import { CATEGORY_OPTIONS } from "@/lib/constants";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { onNext: () => void; }

/* 매장·기술직 직군별 전문 분야 */
const SALON_SPECIALTY: Record<string, string[]> = {
  "네일 아티스트":        ["젤네일", "아크릴", "네일아트", "네일케어", "페디큐어", "직접입력"],
  "헤어 디자이너":        ["커트", "펌", "염색·탈색", "헤어케어", "업스타일", "직접입력"],
  "피부관리사":           ["기초관리", "여드름관리", "미백·주름", "왁싱", "림프마사지", "직접입력"],
  "메이크업 아티스트":    ["웨딩메이크업", "무대·공연", "뷰티메이크업", "아이메이크업", "직접입력"],
  "속눈썹·눈썹 아티스트": ["속눈썹연장", "눈썹문신", "눈썹정리", "반영구", "직접입력"],
  "왁싱 전문가":          ["전신왁싱", "페이셜왁싱", "브라질리언", "직접입력"],
  "반영구 아티스트":      ["눈썹", "아이라인", "입술", "직접입력"],
  "샵 매니저":            ["고객관리", "직원관리", "매장운영", "직접입력"],
  "뷰티 강사·교육":       ["네일교육", "헤어교육", "메이크업교육", "피부교육", "직접입력"],
};

export default function Step8Category({ onNext }: Props) {
  const {
    jobType, job,
    categories, categoryCustom,
    toggleCategory, addCategoryCustom, removeCategoryCustom,
  } = useSignupStore();

  const isSalon = jobType === "매장·기술직";
  const salonOptions = isSalon ? (SALON_SPECIALTY[job] || ["직접입력"]) : [];

  const [showCustom, setShowCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const valid = categories.length > 0 || categoryCustom.length > 0;

  const handleChipClick = (opt: string) => {
    if (opt === "직접입력") { setShowCustom(p => !p); return; }
    toggleCategory(opt);
  };

  const handleAddCustom = () => {
    const v = customInput.trim();
    if (!v) return;
    addCategoryCustom(v);
    setCustomInput("");
  };

  const options = isSalon ? salonOptions : [...CATEGORY_OPTIONS];

  return (
    <div className="p-7 px-7">
      <h2 className="text-[22px] font-bold text-[#1a1a1a] tracking-tight leading-tight mb-2 text-center">
        {isSalon ? "전문 분야" : "카테고리"}
      </h2>
      <p className="text-sm text-[#6b6b6b] mb-7 leading-relaxed text-center">
        {isSalon
          ? `${job} 전문 분야를 선택해 주세요`
          : "현재까지 담당했던 모든 카테고리를 선택해 주세요"}
      </p>

      {showCustom && (
        <div className="mb-5 p-4 bg-[#f7f7f8] rounded-lg border border-primary-soft">
          <label className="block text-sm font-medium text-[#1a1a1a] mb-2.5">직접 입력</label>
          <div className="grid grid-cols-[1fr_auto] gap-2 mb-3">
            <input type="text" value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
              placeholder={isSalon ? "전문 분야를 입력해주세요" : "카테고리를 입력해주세요"}
              maxLength={20} className="text-input" autoFocus />
            <button type="button" onClick={handleAddCustom}
              className="h-[52px] px-[18px] bg-white text-primary border border-primary rounded-lg text-sm font-medium hover:bg-primary hover:text-white transition-all whitespace-nowrap">
              추가하기
            </button>
          </div>
          {categoryCustom.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {categoryCustom.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 bg-primary text-white text-xs px-3 py-1.5 rounded-full">
                  {c}
                  <button type="button" onClick={() => removeCategoryCustom(c)}
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
        {options.map((opt) => {
          const isSelected = categories.includes(opt);
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

      <button type="button" onClick={onNext} disabled={!valid}
        className={cn("btn-primary-full", valid && "active")}>
        다음
      </button>
    </div>
  );
}
