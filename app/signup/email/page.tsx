"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { StoreIcon, OfficeIcon } from "@/components/icons/JobTypeIcon";
import { useAuthStore } from "@/lib/store/authStore";
import { setLoginPersistence } from "@/lib/auth/session";
import { 직군고르기, 경력고르기 } from "@/components/signup/JobCareerPicker";
import { 직군요약 } from "@/lib/data/jobGroups";
import RegionSelectModal from "@/components/RegionSelectModal";
import { shortRegion } from "@/lib/regionShort";
import { passwordError, PASSWORD_HINT } from "@/lib/password";
import { validateBirth } from "@/lib/validateBirth";

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
  const [birth, setBirth] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  // 간편가입 온보딩과 같은 것을 묻는다 — 한쪽에만 있으면 어느 길로 들어왔는지에
  // 따라 기업 검색에 걸리는 사람과 안 걸리는 사람이 갈린다.
  const [대분류, set대분류] = useState("");
  const [단계, set단계] = useState("");
  const [지역들, set지역들] = useState<string[]>([]);
  const [지역창, set지역창] = useState(false);
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

  const formatBirth = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 4) return d;
    if (d.length <= 6) return `${d.slice(0, 4)}.${d.slice(4)}`;
    return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`;
  };
  const birthDigits = birth.replace(/\D/g, "");
  const birthCheck = birthDigits.length === 8 ? validateBirth(birthDigits) : null;

  const isPasswordValid = (pw: string) => !passwordError(pw);

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
    대분류 !== "" &&
    단계 !== "" &&
    지역들.length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    emailStatus !== "taken" &&
    name.trim().length > 0 &&
    phone.replace(/\D/g, "").length >= 10 &&
    phoneVerified &&
    !!birthCheck?.ok &&
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
          birth: birthDigits,
          password,
          job_type: jobType,
          main_job_group: 대분류,
          career_stage: 단계,
          preferred_regions: 지역들.map((r) => {
            const i = r.lastIndexOf(" ");
            const tail = r.slice(i + 1);
            return { sido: r.slice(0, i), sigungu: tail === "전체" ? "" : tail };
          }),
          agreed_term_ids: agreedTermIds,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        if (res.status === 409 && (data.error?.message || "").includes("이메일")) setEmailStatus("taken");
        setError(data.error?.message || "회원가입에 실패했습니다.");
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
      <header className="auth-header border-b border-[#f0f0f0]">
        <div className="mx-auto w-full max-w-[1060px] h-full flex items-center px-5">
          <Link href="/" className="inline-flex items-center">
            <Image src="/images/logo.png" className="auth-logo" alt="뷰티워크" width={140} height={36} />
          </Link>
        </div>
      </header>

      {/* 뒤로 — 로그인 화면과 같이 화살표만 둔다 */}
      <div className="mx-auto w-full max-w-[1060px] px-5 pt-4">
        <button
          onClick={() => router.back()}
          aria-label="뒤로"
          title="뒤로"
          className="-ml-1.5 inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6b6b6b] hover:bg-[#f5f5f5] hover:text-[#555] transition"
        >
          <ArrowLeft size={26} />
        </button>
      </div>

      <div className="onb-job flex-1 flex justify-center px-2 md:px-5 py-8">
        <div className="w-full max-w-[640px]">
          <h1 className="text-[22px] md:text-[26px] font-normal text-[#555] text-center mb-2">
            개인회원 가입
          </h1>
          <p className="text-center text-[13px] md:text-[14px] text-[#6b6b6b] mb-8">
            처음 오셨네요. 아래 정보만 채우면 회원가입이 끝나요.
          </p>

          {/* 직군 선택 — 고른 카드는 뷰티워크 보라 테두리에 회색 바탕이다.
              연보라로 칠하지 않는다(기업회원 가입의 매장·오피스 카드와 같은 값). */}
          <div className="mb-6">
            <label className="block text-[13px] md:text-[16px] font-normal text-gray-700 mb-3">
              어떤 채용을 찾고 계신가요? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 items-stretch">
              <button
                type="button"
                onClick={() => setJobType("STORE")}
                className={`jt-card relative flex items-center gap-3 px-2 py-2.5 rounded-xl border-2 text-left transition-all ${
                  jobType === "STORE"
                    ? "border-[#582681] bg-[#f7f7f8] text-[#582681]"
                    : "border-[#e0e0e0] bg-white text-[#6b6b6b] hover:border-[#c0c0c0]"
                }`}
              >
                {/* 아이콘은 왼쪽, 글자는 오른쪽 */}
                <StoreIcon size={28} className="jt-icon" style={{ color: "#582681", flexShrink: 0 }} />
                <span className="jt-text flex flex-col min-w-0">
                  <span className="jt-title text-[14px] md:text-[16px] font-normal text-[#555]">매장<span className="onb-m-only"> 직군</span></span>
                  <span className="jt-desc text-[13px] md:text-[14px] mt-1 leading-relaxed">
                    {직군요약("STORE")}
                  </span>
                </span>
                {jobType === "STORE" && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#582681] rounded-full flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setJobType("OFFICE")}
                className={`jt-card relative flex items-center gap-3 px-2 py-2.5 rounded-xl border-2 text-left transition-all ${
                  jobType === "OFFICE"
                    ? "border-[#582681] bg-[#f7f7f8] text-[#582681]"
                    : "border-[#e0e0e0] bg-white text-[#6b6b6b] hover:border-[#c0c0c0]"
                }`}
              >
                {/* 아이콘은 왼쪽, 글자는 오른쪽 */}
                <OfficeIcon size={28} className="jt-icon" style={{ color: "#582681", flexShrink: 0 }} />
                <span className="jt-text flex flex-col min-w-0">
                  <span className="jt-title text-[14px] md:text-[16px] font-normal text-[#555]">오피스<span className="onb-m-only"> 직군</span></span>
                  <span className="jt-desc text-[13px] md:text-[14px] mt-1 leading-relaxed">
                    {직군요약("OFFICE")}
                  </span>
                </span>
                {jobType === "OFFICE" && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#582681] rounded-full flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 직군은 칩이 열 개까지 늘어서 한 줄을 다 쓴다. 경력은 칩이 넷에서
              여섯이라 희망 근무지역과 나란히 둘 수 있다. */}
          <div className="mb-8"><직군고르기 jobType={jobType as any} group={대분류} onGroup={set대분류} /></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 mb-8">
            <경력고르기 jobType={jobType as any} group={대분류} stage={단계} onStage={set단계} />
            <div className="mt-8 md:mt-0">
              <p className="onb-f-lab text-[13px] md:text-[16px] text-[#6b6b6b] mb-1.5">
                희망 근무지역 <span className="text-red-500">*</span>
              </p>
              <button type="button" onClick={() => set지역창(true)}
                className="onb-f-btn w-full min-h-[48px] px-4 py-3 border border-[#e0e0e0] rounded-lg text-left text-[14px] hover:border-[#582681] transition">
                {지역들.length === 0
                  ? <span className="text-[#9a9a9a]">지역을 선택해 주세요</span>
                  : <span className="text-[#3a3a3a]">{지역들.map((r) => shortRegion(r)).join(" · ")}</span>}
              </button>
            </div>
          </div>

          <RegionSelectModal open={지역창} initial={지역들} allowAny
            onClose={() => set지역창(false)}
            onApply={(r) => { set지역들(r); set지역창(false); }} />
          {/* 640px 에서 짧은 칸이 한 줄을 통째로 먹지 않게 둘씩 나란히 둔다.
              기업회원 가입 폼과 같은 방식이다. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
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
                    : "border-[#e0e0e0] focus:border-[#582681]"
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
                className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[16px] focus:outline-none focus:border-[#582681]"
              />
            </div>
          </div>
          {/* 휴대폰 번호 + 인증 */}
          <div className="mb-4">
            <label className="onb-f-lab block text-[13px] md:text-[16px] text-[#6b6b6b] mb-1.5">휴대폰 번호 <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); setPhoneVerified(false); setCodeSent(false); }}
                placeholder="(예시) 010-1234-5678"
                disabled={phoneVerified}
                className="flex-1 min-w-0 onb-f-in h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[16px] focus:outline-none focus:border-[#582681] disabled:bg-[#f5f5f5]"
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sending || phoneVerified || phone.replace(/\D/g, "").length < 10}
                className="onb-f-bt px-4 h-[48px] shrink-0 whitespace-nowrap rounded-lg text-[13px] md:text-[15px] font-normal border border-[#582681] text-[#582681] disabled:border-[#ddd] disabled:text-[#aaa] hover:bg-[#f7f7f8] transition"
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
                  className="flex-1 onb-f-in h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[16px] focus:outline-none focus:border-[#582681]"
                />
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={verifying || phoneCode.length < 6}
                  className="onb-f-bt px-4 h-[48px] whitespace-nowrap rounded-lg text-[13px] md:text-[15px] font-normal bg-[#582681] text-white disabled:opacity-40 hover:opacity-90 transition"
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
          {/* 생년월일 — 나이 하한(만 14세)을 가입 시점에 걸러 둔다. 프로필에서
              나중에 걸리면 그때까지 만든 이력서·지원 내역을 되돌릴 방법이 없다. */}
          <div className="mb-4">
            <label className="block text-[13px] md:text-[16px] text-[#6b6b6b] mb-1.5">생년월일 <span className="text-red-500">*</span></label>
            <input
              type="text"
              inputMode="numeric"
              value={birth}
              onChange={(e) => setBirth(formatBirth(e.target.value))}
              placeholder="YYYY.MM.DD"
              className={`w-full h-[48px] px-4 border rounded-lg text-[14px] md:text-[16px] focus:outline-none ${
                birthCheck && !birthCheck.ok ? "border-[#e74c3c] focus:border-[#e74c3c]" : "border-[#e0e0e0] focus:border-[#582681]"
              }`}
            />
            {birthCheck && !birthCheck.ok && (
              <p className="mt-1.5 text-[12px] md:text-[14px] text-[#e74c3c]">{birthCheck.message}</p>
            )}
          </div>
          {/* 비밀번호 — 나란히 두면 오른쪽 칸에 이름표가 필요하다. 넓은 화면에서
              이름표 없는 칸이 옆에 서면 무엇을 다시 치라는 것인지 안내문에만 남는다. */}
          <div className="mb-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <div>
                <label className="block text-[13px] md:text-[16px] text-[#6b6b6b] mb-1.5">비밀번호 <span className="text-red-500">*</span></label>
                <div className="relative mb-2 md:mb-0">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력해주세요"
                    className="w-full h-[48px] px-4 pr-10 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[16px] focus:outline-none focus:border-[#582681]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[13px] md:text-[16px] text-[#6b6b6b] mb-1.5">비밀번호 확인 <span className="text-red-500">*</span></label>
                <input
                  type={showPw ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호를 다시 한번 입력해주세요"
                  className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[16px] focus:outline-none focus:border-[#582681]"
                />
              </div>
            </div>
            <p className={`text-[12px] md:text-[14px] mt-1.5 leading-relaxed ${password && !isPasswordValid(password) ? "text-[#e74c3c]" : "text-[#9a9a9a]"}`}>
              {PASSWORD_HINT}
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
                className="w-4 h-4 accent-[#582681]"
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
                      className="w-4 h-4 accent-[#582681]"
                    />
                    <span>
                      <span
                        className={`font-normal ${
                          term.is_required ? "text-[#582681]" : "text-[#9a9a9a]"
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
            className="w-full h-[52px] mt-6 bg-[#582681] text-white rounded-lg font-normal text-[15px] disabled:bg-[#e0e0e0] disabled:text-[#9a9a9a] hover:opacity-90 transition"
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
