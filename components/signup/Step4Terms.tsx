"use client";

import { useSignupStore } from "@/lib/store/signupStore";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onNext: () => void;
}

export default function Step4Terms({ onNext }: Props) {
  const { agreements, setAgreements } = useSignupStore();
  const requiredKeys = ["age", "tos", "privacy"] as const;
  const allRequired = requiredKeys.every((k) => agreements[k]);
  const allChecked = allRequired && agreements.marketing;

  const toggleAll = (checked: boolean) => {
    setAgreements({
      age: checked,
      tos: checked,
      privacy: checked,
      marketing: checked,
    });
  };

  return (
    <div className="p-7 px-7">
      <h2 className="text-[22px] font-bold text-[#1a1a1a] tracking-tight leading-tight mb-2">
        서비스 이용약관에
        <br />
        동의해주세요
      </h2>
      <p className="text-sm text-[#6b6b6b] mb-7 leading-relaxed">
        필수 항목에 동의해야 가입이 완료됩니다
      </p>

      <label className="flex items-center gap-2.5 bg-primary-pale border border-primary-soft rounded-lg px-4 py-3.5 cursor-pointer hover:bg-primary-soft transition-colors mb-3">
        <input
          type="checkbox"
          className="sr-only"
          checked={allChecked}
          onChange={(e) => toggleAll(e.target.checked)}
        />
        <span className="checkbox-visual" />
        <span className="text-[15px] font-semibold text-[#1a1a1a]">전체 동의합니다</span>
      </label>

      <div className="flex flex-col gap-1 border-t border-[#ececec] pt-4 mb-6">
        {[
          { key: "age" as const, label: "만 14세 이상입니다", required: true },
          { key: "tos" as const, label: "이용약관 동의", required: true, view: true },
          { key: "privacy" as const, label: "개인정보 처리방침 동의", required: true, view: true },
          { key: "marketing" as const, label: "마케팅 정보 수신 동의", required: false },
        ].map((row) => (
          <label
            key={row.key}
            className="flex items-center gap-2.5 px-1 py-2.5 cursor-pointer hover:bg-[#f7f7f8] rounded-lg transition-colors"
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={agreements[row.key]}
              onChange={(e) => setAgreements({ [row.key]: e.target.checked })}
            />
            <span className="checkbox-visual" />
            <span className="text-sm text-[#1a1a1a] flex-1 leading-snug">
              <span
                className={cn(
                  "font-semibold mr-1",
                  row.required ? "text-primary" : "text-[#9a9a9a]"
                )}
              >
                [{row.required ? "필수" : "선택"}]
              </span>
              {row.label}
            </span>
            {row.view && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  alert("약관 전문 페이지로 이동합니다.");
                }}
                className="text-[#9a9a9a] hover:text-primary p-1"
                aria-label="약관 보기"
              >
                <ChevronRight size={16} />
              </button>
            )}
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!allRequired}
        className={cn("btn-primary-full", allRequired && "active")}
      >
        다음
      </button>
    </div>
  );
}
