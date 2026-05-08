"use client";

import { useRouter } from "next/navigation";
import { useSignupStore } from "@/lib/store/signupStore";
import { CAREER_LABELS } from "@/lib/constants";
import { Check } from "lucide-react";

export default function Step10Done() {
  const router = useRouter();
  const {
    name,
    job,
    jobCustom,
    careerYears,
    isLeader,
    categories,
    categoryCustom,
    countries,
    countryCustom,
    reset,
  } = useSignupStore();

  const jobDisplay = job === "직접입력" ? jobCustom : job;
  const allCategories = [
    ...categories.filter((c) => c !== "직접입력"),
    ...categoryCustom,
  ];
  const allCountries = [
    ...countries.filter((c) => c !== "직접입력"),
    ...countryCustom,
  ];

  const handleGoMain = () => {
    reset();
    router.push("/");
  };

  const handleGoJobs = () => {
    reset();
    alert("맞춤 채용공고 페이지로 이동합니다.\n(실제 구현 시 채용공고 목록 페이지로 이동)");
    router.push("/");
  };

  const summary: { label: string; value: string }[] = [
    { label: "직군", value: jobDisplay },
    {
      label: "경력",
      value: `${CAREER_LABELS[careerYears]}${isLeader ? " · 팀리더 경험" : ""}`,
    },
    { label: "카테고리", value: allCategories.join(", ") },
    { label: "담당 국가", value: allCountries.join(", ") },
  ];

  return (
    <div className="p-7 px-8 pt-12 text-center">
      <div className="w-[72px] h-[72px] bg-primary-soft rounded-full flex items-center justify-center mx-auto mb-5 relative">
        <div className="absolute -inset-2 border-2 border-primary-soft rounded-full opacity-50" />
        <Check size={32} className="text-primary relative z-10" strokeWidth={2.5} />
      </div>

      <h2 className="text-2xl font-bold text-[#1a1a1a] tracking-tight mb-3">
        환영합니다, <span className="text-primary">{name || "회원"}</span>님!
      </h2>
      <p className="text-[15px] text-[#6b6b6b] leading-relaxed mb-6">
        뷰티앤잡 가입이 완료되었습니다
        <br />
        입력하신 정보로 맞춤 채용공고를 추천해드릴게요
      </p>

      <div className="bg-[#f7f7f8] rounded-lg p-4 mb-7 text-left">
        {summary.map((row, idx) => (
          <div
            key={row.label}
            className={`flex justify-between gap-3 py-2 text-[13px] ${
              idx < summary.length - 1 ? "border-b border-[#ececec]" : ""
            }`}
          >
            <span className="text-[#9a9a9a] flex-shrink-0">{row.label}</span>
            <span className="text-[#1a1a1a] font-medium text-right break-keep leading-relaxed">
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleGoMain}
        className="btn-primary-full active"
      >
        메인으로 이동
      </button>
      <button
        type="button"
        onClick={handleGoJobs}
        className="block mx-auto mt-4 px-3 py-1.5 text-sm text-[#6b6b6b] hover:text-primary transition-colors"
      >
        맞춤 채용공고 보러가기
      </button>
    </div>
  );
}
