"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useSignupStore } from "@/lib/store/signupStore";
import { TOTAL_STEPS } from "@/lib/constants";

import Step1Select from "@/components/signup/Step1Select";
import Step2Phone from "@/components/signup/Step2Phone";
import Step3Code from "@/components/signup/Step3Code";
import Step4Terms from "@/components/signup/Step4Terms";
import Step5Basic from "@/components/signup/Step5Basic";
import Step6Career from "@/components/signup/Step6Career";
import Step7Job from "@/components/signup/Step7Job";
import Step8Category from "@/components/signup/Step8Category";
import Step9Country from "@/components/signup/Step9Country";
import Step10Done from "@/components/signup/Step10Done";

export default function SignupPage() {
  const router = useRouter();
  const { currentStep, setStep, prevStep, nextStep } = useSignupStore();

  useEffect(() => {
    console.log(
      "%c BEAUTY&JOB 회원가입 ",
      "background:#5f0080;color:#fff;font-weight:700;font-size:14px;padding:4px 10px;border-radius:4px;"
    );
    console.log("💡 데모 인증번호: 123456");
  }, []);

  // STEP 1은 별도 모달 형태
  if (currentStep === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <Step1Select
          onSelectPhone={() => setStep(2)}
          onSelectKakao={() => router.push("/login")}
        />
      </div>
    );
  }

  // STEP 2~10은 진행 화면 (헤더 + 진행바 + 본문)
  const handleBack = () => {
    if (currentStep === 10) return;
    if (currentStep === 2) {
      setStep(1);
      return;
    }
    prevStep();
  };

  const stepIndex = currentStep - 1; // 1-base를 0-base로
  const progressPercent = Math.min(((stepIndex) / TOTAL_STEPS) * 100, 100);

  return (
    <div className="min-h-screen flex items-center justify-center p-5 sm:p-5">
      <section className="relative w-full max-w-[440px] bg-white rounded-2xl shadow-modal overflow-hidden min-h-[640px] sm:min-h-[640px]">
        {/* 헤더 */}
        <header className="grid grid-cols-[48px_1fr_48px] items-center px-2 py-3.5 border-b border-[#ececec]">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 10}
            aria-label="뒤로 가기"
            className="w-10 h-10 flex items-center justify-center text-[#1a1a1a] rounded-lg hover:bg-[#f7f7f8] transition-colors disabled:opacity-30 disabled:cursor-not-allowed justify-self-start"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-center text-[15px] font-semibold text-[#1a1a1a]">
            시작하기
          </h1>
          <span className="text-right text-xs text-[#9a9a9a] font-medium pr-2 tracking-wider">
            {currentStep === 10 ? "완료" : `${stepIndex}/${TOTAL_STEPS}`}
          </span>
        </header>

        {/* 진행 바 */}
        <div className="w-full h-[3px] bg-[#ececec] relative">
          <div
            className="h-full bg-primary transition-all duration-400"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* STEP별 본문 */}
        {currentStep === 2 && <Step2Phone onVerify={nextStep} />}
        {currentStep === 3 && <Step3Code onConfirm={nextStep} />}
        {currentStep === 4 && <Step4Terms onNext={nextStep} />}
        {currentStep === 5 && <Step5Basic onNext={nextStep} />}
        {currentStep === 6 && <Step6Career onNext={nextStep} />}
        {currentStep === 7 && <Step7Job onNext={nextStep} />}
        {currentStep === 8 && <Step8Category onNext={nextStep} />}
        {currentStep === 9 && <Step9Country onNext={nextStep} />}
        {currentStep === 10 && <Step10Done />}
      </section>
    </div>
  );
}
