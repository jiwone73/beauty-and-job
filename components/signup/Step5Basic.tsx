"use client";

import { useState, useEffect } from "react";
import { useSignupStore, Gender } from "@/lib/store/signupStore";
import { isValidBirth } from "@/lib/validations/signup";
import { GENDER_OPTIONS } from "@/lib/constants";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onNext: () => void;
}

export default function Step5Basic({ onNext }: Props) {
  const { name, birth, gender, setBasic } = useSignupStore();
  const [nameLocal, setNameLocal] = useState(name);
  const [birthLocal, setBirthLocal] = useState(birth);
  const [nameTouched, setNameTouched] = useState(false);

  useEffect(() => {
    setBasic({ name: nameLocal });
  }, [nameLocal, setBasic]);

  useEffect(() => {
    setBasic({ birth: birthLocal });
  }, [birthLocal, setBasic]);

  const nameValid = nameLocal.trim().length >= 1;
  const birthValid = isValidBirth(birthLocal);
  const genderValid = gender !== "";
  const allValid = nameValid && birthValid && genderValid;

  return (
    <div className="p-7 px-7">
      <h2 className="text-[22px] font-bold text-[#1a1a1a] tracking-tight leading-tight mb-2 text-center">
        기본 정보
      </h2>
      <p className="text-sm text-[#6b6b6b] mb-8 leading-relaxed text-center">
        뷰티앤잡 서비스를 위한 필수 정보를 입력해 주세요
      </p>

      <label htmlFor="basic-name" className="block text-sm font-medium text-[#1a1a1a] mb-2.5">
        이름
      </label>
      <input
        id="basic-name"
        type="text"
        autoComplete="name"
        maxLength={20}
        value={nameLocal}
        onChange={(e) => setNameLocal(e.target.value)}
        onBlur={() => setNameTouched(true)}
        placeholder="실명을 입력해주세요"
        className={cn("text-input", nameTouched && !nameValid && "border-error")}
      />
      {nameTouched && !nameValid && (
        <p className="text-xs text-warn mt-1.5 flex items-center gap-1 leading-relaxed">
          <AlertCircle size={14} />
          반드시 실명을 입력해 주세요.
        </p>
      )}

      <label htmlFor="basic-birth" className="block text-sm font-medium text-[#1a1a1a] mt-5 mb-2.5">
        생년월일
      </label>
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <input
          id="basic-birth"
          type="text"
          inputMode="numeric"
          maxLength={8}
          value={birthLocal}
          onChange={(e) => setBirthLocal(e.target.value.replace(/\D/g, ""))}
          placeholder="YYYYMMDD"
          className="text-input"
        />
        {GENDER_OPTIONS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setBasic({ gender: g as Gender })}
            className={cn(
              "w-16 h-[52px] border rounded-lg text-sm font-medium transition-all",
              gender === g
                ? "bg-primary-soft border-primary text-primary font-semibold"
                : "bg-white border-[#e5e5e5] text-[#6b6b6b] hover:border-primary-light hover:text-primary"
            )}
          >
            {g}
          </button>
        ))}
      </div>
      <p className="text-xs text-[#9a9a9a] mt-2 leading-relaxed">
        8자리 숫자로 입력해주세요 (예: 19901225)
      </p>

      <button
        type="button"
        onClick={onNext}
        disabled={!allValid}
        className={cn("btn-primary-full mt-6", allValid && "active")}
      >
        다음
      </button>
    </div>
  );
}
