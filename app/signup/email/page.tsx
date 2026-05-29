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

  const isFormValid =\n    jobType !== "" &&
    jobType !== "" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    name.trim().length > 0 &&
    phone.replace(/\D/g, "").length >= 10 &&
    isPasswordValid(password) &&
    password === passwordConfirm &&
    allRequiredAgreed;

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
            <Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} />
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
            {jobType === "" && (
              <p className="text-[12px] text-[#e74c3c] mt-2">직군을 선택해주세요.</p>
            )}
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

          {/* 휴대폰 번호 */}
          <div className="mb-4">
            <label className="block text-[13px] text-[#6b6b6b] mb-1.5">휴대폰 번호</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(예시) 010-1234-5678"
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]"
            />
            <p className="text-[12px] text-[#9a9a9a] mt-1.5">
              채용 매칭 시 기업이 연락드릴 번호예요
            </p>
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

          <div className="mt-6 text-center text-[13px] text-[#6b6b6b]">
            이미 계정이 있으신가요?{" "}
            <Link
              href="/login/email"
              className="text-[#5f0080] font-semibold hover:underline"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}