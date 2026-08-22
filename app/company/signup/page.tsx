"use client";
import { useState, useEffect, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { StoreIcon, OfficeIcon } from "@/components/icons/JobTypeIcon";

interface Term {
  id: string;
  type: string;
  title: string;
  is_required: boolean;
}

// 업체 성격은 매장/본사 둘 중 하나. 매장을 여럿 둔 직영 체인도 '매장'이고,
// 본사 인력을 뽑을 땐 공고를 만들 때 유형(job_type)을 본사로 고르면 된다.
// (예전 'BOTH'는 공고 유형과 중복이라 선택지에서 뺐다 — 기존 데이터는 매장으로 취급)
const COMPANY_TYPES = [
  // 설명은 개인회원 가입과 같은 어휘로 — '현장직/사무직'보다 무엇을 뽑는 곳인지가 바로 읽힌다.
  { value: "STORE", label: "매장", Icon: StoreIcon, desc: "살롱·샵 등 매장에서 근무하는 직군을 뽑아요" },
  { value: "OFFICE", label: "본사", Icon: OfficeIcon, desc: "브랜드·제조·유통·교육·협력사 등 매장이 아닌 곳에서 근무하는 직군을 뽑아요" },
];

export default function CompanySignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    company_name: "",
    brand_name: "",
    business_number: "",
    company_type: "",
    business_license_path: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirm: "",
    address: "",
    website_url: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const [terms, setTerms] = useState<Term[]>([]);
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bizStatus, setBizStatus] = useState<"idle" | "checking" | "valid" | "invalid" | "skipped">("idle");
  const [bizMsg, setBizMsg] = useState("");
  const [licenseName, setLicenseName] = useState("");
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [licenseError, setLicenseError] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailVerifyMsg, setEmailVerifyMsg] = useState("");

  useEffect(() => {
    fetch("/api/terms")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setTerms(res.data);
      });
  }, []);

  const update = (k: string, v: string) => setForm({ ...form, [k]: v });


  // 사업자등록증 업로드 (가입 시점, 비인증)
  const handleLicenseUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLicenseError("");
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) { setLicenseError("JPG, PNG, WebP, PDF 파일만 가능합니다."); return; }
    if (file.size > 5 * 1024 * 1024) { setLicenseError("파일 크기는 5MB 이하여야 합니다."); return; }
    setLicenseUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/company/signup-license", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.data?.path) {
        setForm((prev) => ({ ...prev, business_license_path: data.data.path }));
        setLicenseName(file.name);
      } else {
        setLicenseError(data.error?.message || "업로드에 실패했습니다.");
      }
    } catch {
      setLicenseError("업로드 중 오류가 발생했습니다.");
    } finally {
      setLicenseUploading(false);
    }
  };

  // 사업자등록번호 체크섬 검증 (국세청 공식 알고리즘, API 없이 즉시 판별)
  const isValidBizNo = (num: string) => {
    const n = (num || "").replace(/\D/g, "");
    if (n.length !== 10) return false;
    const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(n[i], 10) * w[i];
    sum += Math.floor((parseInt(n[8], 10) * 5) / 10);
    return (10 - (sum % 10)) % 10 === parseInt(n[9], 10);
  };

  // 사업자번호 형식 (000-00-00000)
  const formatBizNum = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  };

  // 전화 형식
  const handleSendCode = async () => {
    const clean = form.phone.replace(/\D/g, "");
    if (clean.length < 10) { setPhoneMsg("올바른 휴대폰 번호를 입력해주세요."); return; }
    setSending(true); setPhoneMsg("");
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
    const clean = form.phone.replace(/\D/g, "");
    if (!phoneCode.trim()) { setPhoneMsg("인증번호를 입력해주세요."); return; }
    setVerifying(true); setPhoneMsg("");
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

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  };

  const isPasswordValid = (pw: string) => {
    if (pw.length < 8 || pw.length > 16) return false;
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    return [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length >= 3;
  };

  const requiredTerms = terms.filter((t) => t.is_required);
  const allRequiredAgreed = requiredTerms.every((t) => agreed[t.id]);
  const allAgreed = terms.every((t) => agreed[t.id]);

  const toggleAll = () => {
    if (allAgreed) {
      setAgreed({});
    } else {
      const a: Record<string, boolean> = {};
      terms.forEach((t) => (a[t.id] = true));
      setAgreed(a);
    }
  };

  const isFormValid =
    form.company_name &&
    form.business_number.replace(/\D/g, "").length === 10 &&
    form.company_type &&
    form.business_license_path &&
    bizStatus !== "invalid" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    emailStatus !== "taken" &&
    emailVerified &&
    form.phone.replace(/\D/g, "").length >= 10 &&
    phoneVerified &&
    isPasswordValid(form.password) &&
    form.password === form.passwordConfirm &&
    allRequiredAgreed;

  const handleSendEmailCode = async () => {
    const email = form.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailVerifyMsg("올바른 이메일을 입력해주세요."); return; }
    setEmailSending(true); setEmailVerifyMsg("");
    try {
      const res = await fetch("/api/auth/email/send-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (data.success) { setEmailCodeSent(true); setEmailVerifyMsg(data.data?.dev_code ? `[개발용] 인증코드: ${data.data.dev_code}` : "인증코드를 메일로 보냈어요. (스팸함도 확인해주세요)"); }
      else { setEmailVerifyMsg(data.error?.message || "발송에 실패했습니다."); if ((data.error?.message || "").includes("이미 가입")) setEmailStatus("taken"); }
    } catch { setEmailVerifyMsg("네트워크 오류가 발생했습니다."); } finally { setEmailSending(false); }
  };

  const handleVerifyEmailCode = async () => {
    if (!emailCode.trim()) { setEmailVerifyMsg("인증코드를 입력해주세요."); return; }
    setEmailVerifying(true); setEmailVerifyMsg("");
    try {
      const res = await fetch("/api/auth/email/verify-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email.trim(), code: emailCode }) });
      const data = await res.json();
      if (data.success) { setEmailVerified(true); setEmailVerifyMsg("이메일 인증이 완료됐어요."); }
      else setEmailVerifyMsg(data.error?.message || "인증코드가 올바르지 않습니다.");
    } catch { setEmailVerifyMsg("네트워크 오류가 발생했습니다."); } finally { setEmailVerifying(false); }
  };

  const checkEmailDup = async () => {
    const v = form.email.trim();
    if (!v) { setEmailStatus("idle"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setEmailStatus("invalid"); return; }
    setEmailStatus("checking");
    try {
      const r = await fetch(`/api/auth/check-email?email=${encodeURIComponent(v)}&scope=company`);
      const res = await r.json();
      setEmailStatus(res.success ? (res.data.available ? "ok" : "taken") : "invalid");
    } catch { setEmailStatus("idle"); }
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setError("");
    setLoading(true);
    try {
      const agreedTermIds = Object.entries(agreed).filter(([, v]) => v).map(([k]) => k);
      const res = await fetch("/api/auth/company/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          agreed_term_ids: agreedTermIds,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        if (res.status === 409 && (data.error?.message || "").includes("이메일")) setEmailStatus("taken");
        setError(data.error?.message || "회원가입에 실패했습니다.");
        return;
      }
      if (data.data?.access_token) {
        localStorage.setItem("access_token", data.data.access_token);
        router.push("/company/dashboard");
      } else {
        setSubmitted(true);
      }
    } catch (e) {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // ── 가입 신청 완료 (승인 대기) 화면 ──────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <header className="h-14 flex items-center px-4 border-b border-[#ececec]">
          <Link href="/" className="flex items-center gap-1 p-2 text-[14px] md:text-[16px] text-[#6b6b6b]">
            <ChevronLeft size={18} />
            <span>홈으로</span>
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center px-5 py-8">
          <div className="w-full max-w-[420px] text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#f7f7f8] flex items-center justify-center">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#582681" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-[16px] font-normal text-[#1a1a1a] mb-3">회원가입 신청이 완료되었습니다</h1>
            <p className="text-[15px] text-[#6b6b6b] leading-relaxed mb-8">
              입력하신 기업 정보를 확인한 뒤 승인해 드립니다.<br />
              승인이 완료되면 로그인하여 채용공고를 등록하실 수 있습니다.<br />
              <span className="text-[13px] md:text-[15px] text-[#9a9a9a]">보통 1영업일 이내에 처리됩니다.</span>
            </p>
            <Link href="/login"
              className="block w-full h-[52px] leading-[52px] bg-[#582681] text-white rounded-lg font-normal text-[15px] hover:opacity-90 transition">
              로그인 페이지로
            </Link>
            <Link href="/"
              className="block w-full h-[48px] leading-[48px] mt-2.5 text-[#6b6b6b] text-[15px]">
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="h-14 flex items-center px-4 border-b border-[#ececec]">
        <button onClick={() => router.back()} className="flex items-center gap-1 p-2 text-[14px] md:text-[16px] text-[#6b6b6b]">
          <ChevronLeft size={18} />
          <span>돌아가기</span>
        </button>
      </header>

      <div className="flex-1 flex justify-center px-5 py-8">
        <div className="w-full max-w-[480px]">
          <div className="flex justify-center mb-6">
            <Link href="/" className="logo auth-logo"><Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} /></Link>
          </div>

          <h1 className="text-[20px] md:text-[24px] font-normal text-[#1a1a1a] text-center mb-2">
            기업회원 가입
          </h1>
          <p className="text-[14px] md:text-[16px] text-[#6b6b6b] text-center mb-8">
            뷰티워크에서 우수한 인재를 만나보세요
          </p>

          {/* 채용 유형 (최상단) */}
          <div className="mb-6">
            <p className="text-[13px] md:text-[15px] text-[#9a9a9a] mb-3">채용 형태에 맞는 유형을 선택해주세요</p>
            <div className="grid grid-cols-2 gap-2">
              {COMPANY_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => update("company_type", t.value)}
                  className={`jt-card relative flex items-center gap-3 px-2 py-2.5 border-2 rounded-xl text-left transition ${
                    form.company_type === t.value
                      ? "border-[#582681] bg-[#f7f7f8] text-[#582681]"
                      : "border-[#e0e0e0] text-[#6b6b6b] hover:border-[#c0c0c0]"
                  }`}
                >
                  {/* 아이콘은 왼쪽, 글자는 오른쪽 */}
                  <t.Icon size={30} className="jt-icon" style={{ color: "#582681", flexShrink: 0 }} />
                  <span className="jt-text flex flex-col min-w-0">
                    <span className="jt-title text-[14px] md:text-[16px] font-normal text-[#1a1a1a]">{t.label}</span>
                    <span className="jt-desc text-[11px] md:text-[13px] mt-0.5 leading-tight">{t.desc}</span>
                  </span>
                  {form.company_type === t.value && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#582681] rounded-full flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 기업 정보 */}
          <div className="mb-3">
            <label className="block text-[13px] md:text-[16px] text-[#6b6b6b] mb-1.5">회사명 <span className="text-[#e74c3c]">*</span></label>
            <input type="text" value={form.company_name}
              onChange={(e) => update("company_name", e.target.value)}
              placeholder="예) 올리브영"
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[16px] focus:outline-none focus:border-[#582681]" />
          </div>

          <div className="mb-3">
            <label className="block text-[13px] md:text-[16px] text-[#6b6b6b] mb-1.5">브랜드명</label>
            <input type="text" value={form.brand_name}
              onChange={(e) => update("brand_name", e.target.value)}
              placeholder="대표 브랜드명"
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[16px] focus:outline-none focus:border-[#582681]" />
          </div>

          <div className="mb-4">
            <label className="block text-[13px] md:text-[16px] text-[#6b6b6b] mb-1.5">사업자등록번호 <span className="text-[#e74c3c]">*</span></label>
            <div className="relative">
              <input type="text" value={form.business_number}
                onChange={(e) => {
                  const f = formatBizNum(e.target.value);
                  update("business_number", f);
                  const d = f.replace(/\D/g, "");
                  if (d.length === 10) {
                    if (isValidBizNo(d)) { setBizStatus("valid"); setBizMsg("사업자등록번호 형식이 확인되었습니다."); }
                    else { setBizStatus("invalid"); setBizMsg("유효하지 않은 사업자등록번호입니다."); }
                  }
                  else if (d.length === 0) { setBizStatus("idle"); setBizMsg(""); }
                  else { setBizStatus("invalid"); setBizMsg("올바른 사업자등록번호를 입력해주세요."); }
                }}
                placeholder="000-00-00000"
                className={`w-full h-[48px] px-4 ${form.business_number ? "pr-10" : ""} border rounded-lg text-[14px] md:text-[16px] focus:outline-none ${bizStatus === "invalid" ? "border-[#e74c3c] focus:border-[#e74c3c]" : "border-[#e0e0e0] focus:border-[#582681]"}`} />
              {form.business_number && (
                <button type="button" tabIndex={-1}
                  onClick={() => { update("business_number", ""); setBizStatus("idle"); setBizMsg(""); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-[#d0d0d5] text-white text-[12px] leading-none hover:bg-[#b8b8c0]">×</button>
              )}
            </div>
            {bizStatus === "checking" && <p className="mt-1.5 text-[12px] md:text-[14px] text-[#999]">사업자 정보 확인 중…</p>}
            {bizStatus === "valid" && <p className="mt-1.5 text-[12px] md:text-[14px] text-[#1a8a4a]">✓ {bizMsg}</p>}
            {bizStatus === "invalid" && <p className="mt-1.5 text-[12px] md:text-[14px] text-[#e74c3c]">{bizMsg}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-[13px] md:text-[16px] text-[#6b6b6b] mb-1.5">사업자등록증 <span className="text-[#e74c3c]">*</span></label>
            <label className="flex items-center justify-center gap-2 w-full min-h-[48px] px-4 py-2 border border-dashed border-[#e3e3e6] rounded-lg text-[13px] md:text-[15px] text-[#582681] bg-[#faf7fd] cursor-pointer hover:bg-[#f7f7f8] transition text-center">
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleLicenseUpload} className="hidden" />
              {licenseUploading ? "업로드 중…" : licenseName ? `첨부됨: ${licenseName}` : "사업자등록증 첨부 (JPG·PNG·WebP·PDF · 최대 5MB)"}
            </label>
            {licenseError && <p className="mt-1.5 text-[12px] md:text-[14px] text-[#e74c3c]">{licenseError}</p>}
            {form.business_license_path && !licenseError && <p className="mt-1.5 text-[12px] md:text-[14px] text-[#1a8a4a]">✓ 사업자등록증이 첨부되었습니다.</p>}
          </div>

          {/* 담당자 정보 */}
          <div className="mt-6 pt-6 border-t border-[#ececec]">
            <h2 className="text-[16px] md:text-[17px] font-normal mb-3">담당자 정보</h2>

            <div className="mb-3">
              <label className="block text-[13px] md:text-[16px] text-[#6b6b6b] mb-1.5">휴대폰 <span className="text-[#e74c3c]">*</span></label>
              <div className="flex gap-2">
                <input type="tel" value={form.phone}
                  onChange={(e) => { update("phone", formatPhone(e.target.value)); setPhoneVerified(false); setCodeSent(false); }}
                  placeholder="010-1234-5678"
                  disabled={phoneVerified}
                  className="flex-1 min-w-0 h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[16px] focus:outline-none focus:border-[#582681] disabled:bg-[#f5f5f5]" />
                <button type="button" onClick={handleSendCode}
                  disabled={sending || phoneVerified || form.phone.replace(/\D/g, "").length < 10}
                  className="px-4 h-[48px] shrink-0 whitespace-nowrap rounded-lg text-[13px] md:text-[15px] font-normal border border-[#582681] text-[#582681] disabled:border-[#ddd] disabled:text-[#aaa] hover:bg-[#f7f7f8] transition">
                  {phoneVerified ? "인증완료" : codeSent ? "재전송" : sending ? "전송중" : "인증번호 받기"}
                </button>
              </div>
              {codeSent && !phoneVerified && (
                <div className="flex gap-2 mt-2">
                  <input type="text" inputMode="numeric" value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="인증번호 6자리"
                    className="flex-1 h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[16px] focus:outline-none focus:border-[#582681]" />
                  <button type="button" onClick={handleVerifyCode}
                    disabled={verifying || phoneCode.length < 6}
                    className="px-4 h-[48px] whitespace-nowrap rounded-lg text-[13px] md:text-[15px] font-normal bg-[#582681] text-white disabled:opacity-40 hover:opacity-90 transition">
                    {verifying ? "확인중" : "확인"}
                  </button>
                </div>
              )}
              {phoneMsg && (
                <p className={`text-[12px] md:text-[14px] mt-1.5 ${phoneVerified ? "text-[#10b981]" : "text-[#9a9a9a]"}`}>{phoneMsg}</p>
              )}
            </div>

            <div className="mb-3">
              <label className="block text-[13px] md:text-[16px] text-[#6b6b6b] mb-1.5">이메일 <span className="text-[#e74c3c]">*</span></label>
              <div className="flex gap-2">
                <input type="email" value={form.email}
                  onChange={(e) => { update("email", e.target.value); setEmailStatus("idle"); setEmailVerified(false); setEmailCodeSent(false); setEmailVerifyMsg(""); }}
                  onBlur={checkEmailDup}
                  placeholder="hr@company.com"
                  disabled={emailVerified}
                  className="flex-1 min-w-0 h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[16px] focus:outline-none focus:border-[#582681] disabled:bg-[#f5f5f5]" />
                <button type="button" onClick={handleSendEmailCode}
                  disabled={emailSending || emailVerified || emailStatus === "taken" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)}
                  className="px-4 h-[48px] shrink-0 whitespace-nowrap rounded-lg text-[13px] md:text-[15px] font-normal border border-[#582681] text-[#582681] disabled:border-[#ddd] disabled:text-[#aaa] hover:bg-[#f7f7f8] transition">
                  {emailVerified ? "인증완료" : emailCodeSent ? "재전송" : emailSending ? "전송중" : "인증코드 받기"}
                </button>
              </div>
              {emailStatus === "checking" && <p className="mt-1.5 text-[12px] md:text-[14px] text-[#999]">중복 확인 중…</p>}
              {emailStatus === "taken" && <p className="mt-1.5 text-[12px] md:text-[14px] text-red-500">이미 가입된 이메일입니다.</p>}
              {emailStatus === "invalid" && <p className="mt-1.5 text-[12px] md:text-[14px] text-red-500">올바른 이메일 형식이 아닙니다.</p>}
              {emailCodeSent && !emailVerified && (
                <div className="flex gap-2 mt-2">
                  <input type="text" inputMode="numeric" value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="인증코드 6자리"
                    className="flex-1 h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[16px] focus:outline-none focus:border-[#582681]" />
                  <button type="button" onClick={handleVerifyEmailCode}
                    disabled={emailVerifying || emailCode.length < 6}
                    className="px-4 h-[48px] whitespace-nowrap rounded-lg text-[13px] md:text-[15px] font-normal bg-[#582681] text-white disabled:opacity-40 hover:opacity-90 transition">
                    {emailVerifying ? "확인중" : "확인"}
                  </button>
                </div>
              )}
              {emailVerifyMsg && <p className={`mt-1.5 text-[12px] md:text-[14px] ${emailVerified ? "text-[#10b981]" : "text-[#9a9a9a]"}`}>{emailVerifyMsg}</p>}
            </div>

            <div className="mb-2">
              <label className="block text-[13px] md:text-[16px] text-[#6b6b6b] mb-1.5">비밀번호 <span className="text-[#e74c3c]">*</span></label>
              <div className="relative mb-2">
                <input type={showPw ? "text" : "password"} value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="비밀번호 입력"
                  className="w-full h-[48px] px-4 pr-10 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[16px] focus:outline-none focus:border-[#582681]" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <input type={showPw ? "text" : "password"} value={form.passwordConfirm}
                onChange={(e) => update("passwordConfirm", e.target.value)}
                placeholder="비밀번호 다시 입력"
                className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] md:text-[16px] focus:outline-none focus:border-[#582681]" />
              <p className={`text-[12px] md:text-[14px] mt-1.5 ${form.password && !isPasswordValid(form.password) ? "text-[#e74c3c]" : "text-[#9a9a9a]"}`}>
                영문·숫자·특수문자 중 3가지 이상으로 조합해 8~16자
              </p>
              {form.passwordConfirm && form.password !== form.passwordConfirm && (
                <p className="text-[12px] md:text-[14px] text-[#e74c3c] mt-1">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>
          </div>

          {/* 약관 */}
          <div className="mt-6 pt-6 border-t border-[#ececec]">
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" checked={allAgreed} onChange={toggleAll}
                className="w-4 h-4 accent-[#582681]" />
              <span className="font-normal text-[14px] md:text-[16px]">전체 동의</span>
            </label>
            <div className="space-y-2 ml-1">
              {terms.map((term) => (
                <label key={term.id} className="flex items-center gap-2 cursor-pointer text-[13px] md:text-[15px] text-[#3a3a3a]">
                  <input type="checkbox" checked={!!agreed[term.id]}
                    onChange={(e) => setAgreed({ ...agreed, [term.id]: e.target.checked })}
                    className="w-4 h-4 accent-[#582681]" />
                  <span>
                    <span className={`font-normal ${term.is_required ? "text-[#582681]" : "text-[#9a9a9a]"}`}>
                      [{term.is_required ? "필수" : "선택"}]
                    </span>{" "}
                    {term.title}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-[13px] md:text-[15px] text-[#e74c3c] mt-4 text-center">{error}</p>}

          <button onClick={handleSubmit} disabled={!isFormValid || loading}
            className="w-full h-[52px] mt-6 bg-[#582681] text-white rounded-lg font-normal text-[15px] disabled:bg-[#e0e0e0] disabled:text-[#9a9a9a] hover:opacity-90 transition">
            {loading ? "회원가입 중..." : "기업회원 가입"}
          </button>

        </div>
      </div>
    </div>
  );
}