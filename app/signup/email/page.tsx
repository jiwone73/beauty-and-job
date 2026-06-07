"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";

interface Term {
  id: string;
  type: string;
  title: string;
  is_required: boolean;
}

export default function SignupEmailPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [jobType, setJobType] = useState<"OFFICE" | "STORE" | "">("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [terms, setTerms] = useState<Term[]>([]);
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/terms")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setTerms(res.data);
      })
      .catch((e) => console.error("[load terms]", e));
  }, []);

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  };

  const isPasswordValid = (pw: string) => {
    if (pw.length < 8 || pw.length > 16) return false;
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pw);
    const count = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    return count >= 3;
  };

  const requiredTerms = terms.filter((t) => t.is_required);
  const optionalTerms = terms.filter((t) => !t.is_required);
  const allAgreed =
    requiredTerms.every((t) => agreed[t.id]) &&
    optionalTerms.every((t) => agreed[t.id]);
  const allRequiredAgreed = requiredTerms.every((t) => agreed[t.id]);

  const toggleAll = () => {
    if (allAgreed) {
      setAgreed({});
    } else {
      const newAgreed: Record<string, boolean> = {};
      terms.forEach((t) => (newAgreed[t.id] = true));
      setAgreed(newAgreed);
    }
  };

  const isFormValid =
    jobType !== "" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    name.trim().length > 0 &&
    phone.replace(/\D/g, "").length >= 10 &&
    phoneVerified &&
    isPasswordValid(password) &&
    password === passwordConfirm &&
    allRequiredAgreed;
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    name.trim().length > 0 &&
    phone.replace(/\D/g, "").length >= 10 &&
    phoneVerified &&
    isPasswordValid(password) &&
    password === passwordConfirm &&
    allRequiredAgreed;

  const handleSendCode = async () => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) { setPhoneMsg("올바른 휴대폰 번호를 입력해주세요."); return; }
    setSending(true);
    setPhoneMsg("");
    try {
      const res = await fetch("/api/auth/phone/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean, purpose: "signup" }),
      });
      const data = await res.json();
      if (data.success) {
        setCodeSent(true);
        setPhoneMsg(data.data?.dev_code ? `[개발용] 인증번호: ${data.data.dev_code}` : "인증번호를 발송했어요. (3분 이내 입력)");
      } else {
        setPhoneMsg(data.error?.message || "발송에 실패했습니다.");
      }
    } catch {
      setPhoneMsg("네트워크 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async () => {
    const clean = phone.replace(/\D/g, "");
    if (!phoneCode.trim()) { setPhoneMsg("인증번호를 입력해주세요."); return; }
    setVerifying(true);
    setPhoneMsg("");
    try {
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean, code: phoneCode, purpose: "signup" }),
      });
      const data = await res.json();
      if (data.success) {
        setPhoneVerified(true);
        setPhoneMsg("휴대폰 인증이 완료됐어요.");
      } else {
        setPhoneMsg(data.error?.message || "인증번호가 올바르지 않습니다.");
      }
    } catch {
      setPhoneMsg("네트워크 오류가 발생했습니다.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setError("");
    setLoading(true);
    try {
      const agreedTermIds = Object.entries(agreed)
        .filter(([_, v]) => v)
        .map(([k]) => k);

      const res = await fetch("/api/auth/email/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          phone,
          password,
          job_type: jobType,
          agreed_term_ids: agreedTermIds,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "가입에 실패했습니다.");
        return;
      }
      localStorage.setItem("access_token", data.data.access_token);
      login({
        ownerType: "user",
        userName: data.data.user.name,
        userPhone: data.data.user.phone,
        userJobType: data.data.user.job_type || "",
      });
      router.push("/profile");
    } catch (e) {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 헤더 */}
      <header className="h-14 flex items-center px-4 border-b border-[#ececec]">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 p-2 text-[14px] text-[#6b6b6b]"
        >
          <ChevronLeft size={18} />
          <span>취소하고 돌아가기</span>
        </button>
      </header>

      <div className="flex-1 flex justify-center px-5 py-8">
        <div className="w-full max-w-[420px]">
          {/* 로고 */}
          <div className="flex justify-center mb-6">
            <Link href="/"><Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} /></Link>
          </div>

          <h1 className="text-[22px] font-bold text-[#1a1a1a] text-center mb-8">
            회원가입
          </h1>

          {/* 직군 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              어떤 채용을 찾고 계신가요? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setJobType("OFFICE")}
                className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  jobType === "OFFICE"
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                <span className="text-2xl mb-1">🏢</span>
                <span className="text-sm font-semibold">기업·브랜드</span>
                <span className="text-xs mt-0.5 text-center leading-tight">
                  사무직 · 마케팅 · MD
                </span>
                {jobType === "OFFICE" && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setJobType("STORE")}
                className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  jobType === "STORE"
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                <span className="text-2xl mb-1">💄</span>
                <span className="text-sm font-semibold">매장·기술직</span>
                <span className="text-xs mt-0.5 text-center leading-tight">
                  뷰티샵 · 에스테틱 · 네일
                </span>
                {jobType === "STORE" && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </button>
            </div>
            {jobType === "" && (
              <p className="text-[12px] text-[#e74c3c] mt-2">직군을 선택해주세요.</p>
            )}
          </div>

          {/* 이메일 */}
          <div className="mb-4">
            <label className="block text-[13px] text-[#6b6b6b] mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력해주세요"
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]"
            />
          </div>

          {/* 이름 */}
          <div className="mb-4">
            <label className="block text-[13px] text-[#6b6b6b] mb-1.5">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력해주세요"
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]"
            />
          </div>

          {/* 휴대폰 번호 + 인증 */}
          <div className="mb-4">
            <label className="block text-[13px] text-[#6b6b6b] mb-1.5">휴대폰 번호</label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); setPhoneVerified(false); setCodeSent(false); }}
                placeholder="(예시) 010-1234-5678"
                disabled={phoneVerified}
                className="flex-1 h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080] disabled:bg-[#f5f5f5]"
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sending || phoneVerified || phone.replace(/\D/g, "").length < 10}
                className="px-4 h-[48px] whitespace-nowrap rounded-lg text-[13px] font-semibold border border-[#5f0080] text-[#5f0080] disabled:border-[#ddd] disabled:text-[#aaa] hover:bg-[#f5ebfa] transition"
              >
                {phoneVerified ? "인증완료" : codeSent ? "재전송" : sending ? "전송중" : "인증번호 받기"}
              </button>
            </div>

            {codeSent && !phoneVerified && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="인증번호 6자리"
                  className="flex-1 h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]"
                />
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={verifying || phoneCode.length < 6}
                  className="px-4 h-[48px] whitespace-nowrap rounded-lg text-[13px] font-semibold bg-[#5f0080] text-white disabled:opacity-40 hover:opacity-90 transition"
                >
                  {verifying ? "확인중" : "확인"}
                </button>
              </div>
            )}

            {phoneMsg && (
              <p className={`text-[12px] mt-1.5 ${phoneVerified ? "text-[#10b981]" : "text-[#9a9a9a]"}`}>
                {phoneMsg}
              </p>
            )}
          </div>

          {/* 비밀번호 */}
          <div className="mb-2">
            <label className="block text-[13px] text-[#6b6b6b] mb-1.5">비밀번호</label>
            <div className="relative mb-2">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력해주세요"
                className="w-full h-[48px] px-4 pr-10 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <input
              type={showPw ? "text" : "password"}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호를 다시 한번 입력해주세요"
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]"
            />
            <p className="text-[12px] text-[#9a9a9a] mt-1.5 leading-relaxed">
              영문 대소문자, 숫자, 특수문자를 3가지 이상으로 조합해 8자 이상 16자 이하로 입력해주세요.
            </p>
            {passwordConfirm && password !== passwordConfirm && (
              <p className="text-[12px] text-[#e74c3c] mt-1">비밀번호가 일치하지 않습니다.</p>
            )}
          </div>

          {/* 약관 동의 */}
          <div className="mt-6 pt-6 border-t border-[#ececec]">
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allAgreed}
                onChange={toggleAll}
                className="w-4 h-4 accent-[#5f0080]"
              />
              <span className="font-semibold text-[14px]">전체 동의</span>
            </label>
            <div className="space-y-2 ml-1">
              {terms.map((term) => (
                <label
                  key={term.id}
                  className="flex items-center gap-2 cursor-pointer text-[13px] text-[#3a3a3a]"
                >
                  <input
                    type="checkbox"
                    checked={!!agreed[term.id]}
                    onChange={(e) =>
                      setAgreed({ ...agreed, [term.id]: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#5f0080]"
                  />
                  <span>
                    <span
                      className={`font-semibold ${
                        term.is_required ? "text-[#5f0080]" : "text-[#9a9a9a]"
                      }`}
                    >
                      [{term.is_required ? "필수" : "선택"}]
                    </span>{" "}
                    {term.title}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-[13px] text-[#e74c3c] mt-4 text-center">{error}</p>
          )}

          {/* 가입하기 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={!isFormValid || loading}
            className="w-full h-[52px] mt-6 bg-[#5f0080] text-white rounded-lg font-semibold text-[15px] disabled:bg-[#e0e0e0] disabled:text-[#9a9a9a] hover:opacity-90 transition"
          >
            {loading ? "가입 중..." : "가입하기"}
          </button>

        </div>
      </div>
    </div>
  );
}