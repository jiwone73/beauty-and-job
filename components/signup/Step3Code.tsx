"use client";

import { useState, useRef, useEffect } from "react";
import { useSignupStore } from "@/lib/store/signupStore";
import { DEMO_VERIFICATION_CODE, VERIFICATION_TIMER_SECONDS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  onConfirm: () => void;
}

export default function Step3Code({ onConfirm }: Props) {
  const { phone, setPhoneVerified } = useSignupStore();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState(false);
  const [timeLeft, setTimeLeft] = useState(VERIFICATION_TIMER_SECONDS);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  const code = digits.join("");
  const isComplete = code.length === 6;
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const seconds = String(timeLeft % 60).padStart(2, "0");

  const handleInput = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(0, 1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    setError(false);
    if (digit && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
    if (e.key === "Enter" && isComplete) handleConfirm();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((char, i) => (next[i] = char));
    setDigits(next);
    if (pasted.length > 0) {
      inputs.current[Math.min(pasted.length - 1, 5)]?.focus();
    }
  };

  const handleConfirm = () => {
    if (!isComplete) return;
    if (code === DEMO_VERIFICATION_CODE) {
      setPhoneVerified(true);
      onConfirm();
    } else {
      setError(true);
      setTimeout(() => {
        setDigits(["", "", "", "", "", ""]);
        setError(false);
        inputs.current[0]?.focus();
      }, 1500);
    }
  };

  const handleResend = () => {
    setTimeLeft(VERIFICATION_TIMER_SECONDS);
    setDigits(["", "", "", "", "", ""]);
    inputs.current[0]?.focus();
    alert(`인증번호를 재전송했습니다.\n(DEMO: ${DEMO_VERIFICATION_CODE})`);
  };

  return (
    <div className="p-7 px-7">
      <h2 className="text-[22px] font-bold text-[#1a1a1a] tracking-tight leading-tight mb-2">
        인증번호를
        <br />
        입력해주세요
      </h2>
      <p className="text-sm text-[#6b6b6b] mb-7 leading-relaxed">
        <span className="font-medium text-[#1a1a1a]">{phone}</span>로 발송된 6자리 인증번호
      </p>

      <div className="grid grid-cols-6 gap-2 mb-4">
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleInput(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            className={cn(
              "w-full h-14 border rounded-lg bg-white text-center text-[22px] font-semibold text-[#1a1a1a] outline-none transition-all",
              error
                ? "border-error bg-[#fff5f8]"
                : digit
                ? "border-primary bg-primary-pale"
                : "border-[#e5e5e5]",
              "focus:border-primary focus:ring-[3px] focus:ring-primary/12"
            )}
          />
        ))}
      </div>

      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold text-error tabular-nums">
          {timeLeft > 0 ? `${minutes}:${seconds}` : "시간 만료"}
        </span>
        <button
          type="button"
          onClick={handleResend}
          className="text-[13px] text-primary font-medium px-2 py-1 rounded hover:bg-primary-soft transition-colors"
        >
          인증번호 재전송
        </button>
      </div>

      {error && (
        <p className="text-[13px] text-error mb-3">인증번호가 일치하지 않습니다</p>
      )}

      <div className="flex items-center gap-2 bg-primary-pale border border-dashed border-primary-light rounded-lg px-3.5 py-2.5 mb-5 text-[13px] text-[#6b6b6b]">
        <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider">
          DEMO
        </span>
        <span>
          테스트 인증번호: <strong className="font-mono text-primary text-sm tracking-widest">123456</strong>
        </span>
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!isComplete}
        className={cn("btn-primary-full", isComplete && "active")}
      >
        확인
      </button>
    </div>
  );
}
