"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { StoreIcon, OfficeIcon } from "@/components/icons/JobTypeIcon";
import { useAuthStore } from "@/lib/store/authStore";
import { setLoginPersistence } from "@/lib/auth/session";

interface Term {
  id: string;
  type: string;
  title: string;
  is_required: boolean;
}

function SignupEmailContent() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [jobType, setJobType] = useState<"OFFICE" | "STORE" | "">("");
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
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

  // 로그인 화면에서 '계속하기'로 넘어온 경우 이미 친 이메일을 그대로 이어받는다.
  useEffect(() => {
    const prefill = (searchParams.get("email") || "").trim();
    if (prefill) setEmail(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
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
    emailStatus !== "taken" &&
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

  const checkEmailDup = async () => {
    const v = email.trim();
    if (!v) { setEmailStatus("idle"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setEmailStatus("invalid"); return; }
    setEmailStatus("checking");
    try {
      const r = await fetch(`/api/auth/check-email?email=${encodeURIComponent(v)}&scope=user`);
      const res = await r.json();
      setEmailStatus(res.success ? (res.data.available ? "ok" : "taken") : "invalid");
    } catch { setEmailStatus("idle"); }
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
        if (res.status === 409 && (data.error?.message || "").includes("이메일")) setEmailStatus("taken");
        setError(data.error?.message || "가입에 실패했습니다.");
        return;
      }
      localStorage.setItem("access_token", data.data.access_token);
      // 방금 만든 계정이라 '로그인 유지'를 물을 자리가 없다 — 유지 쪽으로 둔다.
      setLoginPersistence(true);
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
      {/* 헤더 — 로고는 가운데 컨테이너의 왼쪽 (로그인 화면과 같은 자리) */}
      <header className="h-14 border-b border-[#f0f0f0]">
        <div className="mx-auto w-full max-w-[1060px] h-full flex items-center px-5">
          <Link href="/" className="inline-flex items-center">
            <Image src="/images/logo.png" alt="뷰티워크" width={104} height={27} />
          </Link>
        </div>
      </header>

      {/* 뒤로 — 로그인 화면과 같이 화살표만 둔다 */}
      <div className="mx-auto w-full max-w-[1060px] px-5 pt-4">
        <button
          onClick={() => router.back()}
          aria-label="뒤로"
          title="뒤로"
          className="-ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-[#6b6b6b] hover:bg-[#f5f5f5] hover:text-[#1a1a1a] transition"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="flex-1 flex justify-center px-5 py-8">
        <div className="w-full max-w-[420px]">
          <h1 className="text-[20px] md:text-[24px] font-normal text-[#1a1a1a] text-center mb-2">
            개인 회원가입
          </h1>
          <p className="text-center text-[13px] md:text-[14px] text-[#6b6b6b] mb-8">
            처음 오셨네요. 아래 정보만 채우면 가입이 끝나요.
          </p>

          {/* 직군 선택 */}
          <div className="mb-6">
            <label className="block text-[13px] md:text-[16px] font-normal text-gray-700 mb-3">
              어떤 채용을 찾고 계신가요? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setJobType("STORE")}
                className={`jt-card relative flex items-center gap-3 px-2 py-2.5 rounded-xl border-2 text-left transition-all ${
                  jobType === "STORE"
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                {/* 아이콘은 왼쪽, 글자는 오른쪽 */}
                <StoreIcon size={28} className="jt-icon" style={{ color: "#5f0080", flexShrink: 0 }} />
                <span className="jt-text flex flex-col min-w-0">
                  <span className="jt-title text-[14px] md:text-[16px] font-normal text-[#1a1a1a]">매장</span>
                  <span className="jt-desc text-[11px] md:text-[13px] mt-0.5 leading-tight">
                    헤어 · 네일 · 피부관리
                  </span>
                </span>
                {jobType === "STORE" && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setJobType("OFFICE")}
                className={`jt-card relative flex items-center gap-3 px-2 py-2.5 rounded-xl border-2 text-left transition-all ${
                  jobType === "OFFICE"
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                {/* 아이콘은 왼쪽, 글자는 오른쪽 */}
                <OfficeIcon size={28} className="jt-icon" style={{ color: "#5f0080", flexShrink: 0 }} />
                <span className="jt-text flex flex-col min-w-0">
                  <span className="jt-title text-[14px] md:text-[16px] font-normal text-[#1a1a1a]">오피스</span>
                  <span className="jt-desc text-[11px] md:text-[13px] mt-0.5 leading-tight">
                    브랜드 · MD · 영업
                  </span>
                </span>
                {jobType === "OFFICE" && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </button>
            </div>
            {jobType === "" && (
              <p className="text-[12px] md:text-[14px] text-[#e74c3c] mt-2">직군을 선택해주세요.</p>
            )}
          </div>
          {/* 이메일 — 중복 확인만. 인증은 비밀번호 재설정·이메일 변경 시점에 한다. */}
          <div className="mb-4">
            <label className="block text-[13px] md:text-[16px] text-[#6b6b6b] mb-1.5">이메일 <span className="text-red-500">*</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                const v = e.target.value;
                setEmail(v);
                // 형식은 치는 중에 바로 알려 주고(3자부터), 중복은 다 치고 나서 확인한다.
                const t = v.trim();
                if (t.length >= 3 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) setEmailStatus("invalid");
                else setEmailStatus("idle");
              }}
              onBlur={checkEmailDup}
              placeholder="이메일을 입력해주세요"
              className={`w-full h-[48px] px-4 border rounded-lg text-[14px] md:text-[16px] focus:outline-none ${
                emailStatus === "invalid" || emailStatus === "taken"
                  ? "border-[#e74c3c] focus:border-[#e74c3c]"
                  : "border-[#e0e0e0] focus:border-[#5f0080]"
              }`}
            />
            {emailStatus === "checking" && <p className="mt-1.5 text-[12px] md:text-[14px] text-[#999]">확인 중이에요.</p>}
            {emailStatus === "ok" && <p className="mt-1.5 text-[12px] md:text-[14px] text-[#10b981]">사용할 수 있는 이메일이에요.</p>}
            {emailStatus === "taken" && <p className="mt-1.5 text-[12px] md:text-[14px] text-[#e74c3c]">이미 가입된 이메일이에요. 로그인해 주세요.</p>}
            {emailStatus === "invalid" && <p className="mt-1.5 text-[12px] md:text-[14px] text-[#e74c3c]">이메일 형식을 다시 확인해주세요.</p>}
          </div>
          {/* 이름 */}
          <div className="mb-4">
            <label className="block text-[13px] md:text-[16px] text-[#6b6b6b] mb-1.5">이름 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력해주세요"
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[16px] focus:outline-none focus:border-[#5f0080]"
            />
          </div>
          {/* 휴대폰 번호 + 인증 */}
          <div className="mb-4">
            <label className="block text-[13px] md:text-[16px] text-[#6b6b6b] mb-1.5">휴대폰 번호 <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); setPhoneVerified(false); setCodeSent(false); }}
                placeholder="(예시) 010-1234-5678"
                disabled={phoneVerified}
                className="flex-1 min-w-0 h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[16px] focus:outline-none focus:border-[#5f0080] disabled:bg-[#f5f5f5]"
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sending || phoneVerified || phone.replace(/\D/g, "").length < 10}
                className="px-4 h-[48px] shrink-0 whitespace-nowrap rounded-lg text-[13px] md:text-[15px] font-normal border border-[#5f0080] text-[#5f0080] disabled:border-[#ddd] disabled:text-[#aaa] hover:bg-[#f5ebfa] transition"
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
                  className="flex-1 h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[16px] focus:outline-none focus:border-[#5f0080]"
                />
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={verifying || phoneCode.length < 6}
                  className="px-4 h-[48px] whitespace-nowrap rounded-lg text-[13px] md:text-[15px] font-normal bg-[#5f0080] text-white disabled:opacity-40 hover:opacity-90 transition"
                >
                  {verifying ? "확인중" : "확인"}
                </button>
              </div>
            )}

            {phoneMsg && (
              <p className={`text-[12px] md:text-[14px] mt-1.5 ${phoneVerified ? "text-[#10b981]" : "text-[#9a9a9a]"}`}>
                {phoneMsg}
              </p>
            )}
          </div>
          {/* 비밀번호 */}
          <div className="mb-2">
            <label className="block text-[13px] md:text-[16px] text-[#6b6b6b] mb-1.5">비밀번호 <span className="text-red-500">*</span></label>
            <div className="relative mb-2">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력해주세요"
                className="w-full h-[48px] px-4 pr-10 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[16px] focus:outline-none focus:border-[#5f0080]"
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
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[16px] focus:outline-none focus:border-[#5f0080]"
            />
            <p className={`text-[12px] md:text-[14px] mt-1.5 leading-relaxed ${password && !isPasswordValid(password) ? "text-[#e74c3c]" : "text-[#9a9a9a]"}`}>
              영문·숫자·특수문자 중 3가지 이상으로 조합해 8자 이상 16자 이하로 입력해주세요.
            </p>
            {passwordConfirm && password !== passwordConfirm && (
              <p className="text-[12px] md:text-[14px] text-[#e74c3c] mt-1">비밀번호가 일치하지 않습니다.</p>
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
              <span className="font-normal text-[14px] md:text-[16px]">전체 동의</span>
            </label>
            <div className="space-y-2 ml-1">
              {terms.map((term) => (
                <div key={term.id}>
                  <label className="flex items-center gap-2 cursor-pointer text-[13px] md:text-[15px] text-[#3a3a3a]">
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
                        className={`font-normal ${
                          term.is_required ? "text-[#5f0080]" : "text-[#9a9a9a]"
                        }`}
                      >
                        [{term.is_required ? "필수" : "선택"}]
                      </span>{" "}
                      {term.title}
                    </span>
                  </label>
                  {term.id === "fb392275-4dc3-45cd-ad26-c59b3e571cee" && (
                    <p className="text-[12px] md:text-[14px] text-[#9a9a9a] ml-6 mt-0.5 leading-snug">
                      내 직무·지역에 맞는 공고를 이메일로 받아보려면 체크해 주세요.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-[13px] md:text-[15px] text-[#e74c3c] mt-4 text-center">{error}</p>
          )}

          {/* 가입하기 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={!isFormValid || loading}
            className="w-full h-[52px] mt-6 bg-[#5f0080] text-white rounded-lg font-normal text-[15px] disabled:bg-[#e0e0e0] disabled:text-[#9a9a9a] hover:opacity-90 transition"
          >
            {loading ? "회원가입 중..." : "회원가입하기"}
          </button>

        </div>
      </div>
    </div>
  );
}

// useSearchParams 는 Suspense 경계 안에서만 쓸 수 있다(빌드가 막힌다).
export default function SignupEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SignupEmailContent />
    </Suspense>
  );
}
