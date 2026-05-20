"use client";

import { useRouter } from "next/navigation";
import { useSignupStore } from "@/lib/store/signupStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { CAREER_LABELS } from "@/lib/constants";
import { Check } from "lucide-react";

export default function Step10Done() {
  const router = useRouter();

  const {
    name, phone, job, jobCustom, careerYears, isLeader,
    categories, categoryCustom, countries, countryCustom,
    reset,
  } = useSignupStore();

  const { login } = useAuthStore();
  const { setMainJob, setEmail } = useProfileStore();

  const jobDisplay = job === "직접입력" ? jobCustom : job;
  const allCategories = [...categories.filter((c) => c !== "직접입력"), ...categoryCustom];
  const allCountries = [...countries.filter((c) => c !== "직접입력"), ...countryCustom];

  const summary = [
    { label: "직군", value: jobDisplay },
    { label: "경력", value: `${CAREER_LABELS[careerYears]}${isLeader ? " · 팀리더 경험" : ""}` },
    { label: "카테고리", value: allCategories.join(", ") },
    { label: "담당 국가", value: allCountries.join(", ") },
  ];

  /** 공통: signupStore → profileStore 이관 + authStore 로그인 처리 */
  const handleComplete = async () => {
    try {
      const termsRes = await fetch('/api/terms');
      const termsData = await termsRes.json();
      const requiredTermIds = termsData.success
        ? termsData.data.filter((t: any) => t.is_required).map((t: any) => t.id)
        : [];

      const { jobType: storeJobType } = useSignupStore.getState();
      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          name,
          job_type: storeJobType === 'store' ? 'STORE' : 'OFFICE',
          desired_location: allCountries[0] || '',
          agreed_term_ids: requiredTermIds,
        }),
      });
      const signupData = await signupRes.json();

      if (!signupData.success) {
        alert(signupData.error?.message || '가입에 실패했습니다.');
        return false;
      }

      localStorage.setItem('access_token', signupData.data.access_token);
      setMainJob(jobDisplay || "", allCategories.join(", "));
      login({ userName: name, userPhone: phone });
      reset();
      return true;
    } catch (e) {
      console.error('[signup error]', e);
      alert('네트워크 오류가 발생했습니다.');
      return false;
    }
  };
  const handleGoProfile = async () => {
    const ok = await handleComplete();
    if (ok) router.push("/profile");
  };
  const handleGoMain = async () => {
    const ok = await handleComplete();
    if (ok) router.push("/");
  };

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
        뷰티앤잡 가입이 완료되었습니다<br />
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

      <button type="button" onClick={handleGoProfile} className="btn-primary-full active">
        내 프로필 보러가기
      </button>
      <button
        type="button"
        onClick={handleGoMain}
        className="block mx-auto mt-4 px-3 py-1.5 text-sm text-[#6b6b6b] hover:text-primary transition-colors"
      >
        메인으로 이동
      </button>
    </div>
  );
}
