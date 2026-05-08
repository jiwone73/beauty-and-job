"use client";

import { useState, useEffect, useRef } from "react";
import { useSignupStore } from "@/lib/store/signupStore";
import { formatPhone, isValidPhone } from "@/lib/validations/signup";
import { cn } from "@/lib/utils";

interface Props {
  onVerify: () => void;
}

export default function Step2Phone({ onVerify }: Props) {
  const { phone, setPhone } = useSignupStore();
  const [local, setLocal] = useState(phone);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const valid = isValidPhone(local);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setLocal(formatted);
    setPhone(formatted);
  };

  const handleSubmit = () => {
    if (!valid) return;
    onVerify();
  };

  return (
    <div className="p-7 px-7">
      <h2 className="text-[22px] font-bold text-[#1a1a1a] tracking-tight leading-tight mb-2">
        휴대전화 번호를
        <br />
        입력해주세요
      </h2>
      <p className="text-sm text-[#6b6b6b] mb-7 leading-relaxed">
        입력하신 번호로 인증번호가 발송됩니다
      </p>

      <label htmlFor="phone-input" className="block text-sm font-medium text-[#1a1a1a] mb-2.5">
        휴대전화 번호
      </label>
      <div className="flex gap-2 items-stretch">
        <input
          ref={inputRef}
          id="phone-input"
          type="tel"
          className="text-input"
          placeholder="010-1234-5678"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={13}
          value={local}
          onChange={handleChange}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!valid}
          className={cn(
            "w-20 h-[52px] rounded-lg text-sm font-medium transition-all flex-shrink-0",
            valid
              ? "bg-primary text-white hover:bg-primary-hover active:scale-[0.98] cursor-pointer"
              : "bg-[#ececec] text-[#9a9a9a] cursor-not-allowed"
          )}
        >
          인증
        </button>
      </div>
      <p className="text-xs text-[#9a9a9a] mt-2 leading-relaxed">
        숫자만 입력해도 자동으로 형식이 적용됩니다
      </p>
    </div>
  );
}
