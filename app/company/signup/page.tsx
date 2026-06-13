"use client";
import { useState, useEffect, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";

interface Term {
  id: string;
  type: string;
  title: string;
  is_required: boolean;
}

const COMPANY_TYPES = [
  { value: "STORE", label: "매장·살롱", icon: "💄", desc: "현장직 채용" },
  { value: "OFFICE", label: "기업·브랜드", icon: "🏢", desc: "사무직 채용" },
  { value: "BOTH", label: "기업+매장", icon: "🏢+💄", desc: "둘 다 채용" },
];

export default function CompanySignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    company_name: "",
    brand_name: "",
    business_number: "",
    company_type: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirm: "",
    address: "",
    website_url: "",
    business_license_path: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [terms, setTerms] = useState<Term[]>([]);
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [licenseName, setLicenseName] = useState("");
  const [licenseUploading, setLicenseUploading] = useState(false);

  useEffect(() => {
    fetch("/api/terms")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setTerms(res.data);
      });
  }, []);

  const update = (k: string, v: string) => setForm({ ...form, [k]: v });

  // 사업자등록증 업로드
  const handleLicenseUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLicenseUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/company/signup-license", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "사업자등록증 업로드에 실패했습니다.");
        return;
      }
      setForm((prev) => ({ ...prev, business_license_path: data.data.path }));
      setLicenseName(file.name);
    } catch {
      setError("업로드 중 오류가 발생했습니다.");
    } finally {
      setLicenseUploading(false);
    }
  };

  // 사업자번호 형식 (000-00-00000)
  const formatBizNum = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  };

  // 전화 형식
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
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pw);
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
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.phone.replace(/\D/g, "").length >= 9 &&
    isPasswordValid(form.password) &&
    form.password === form.passwordConfirm &&
    allRequiredAgreed;

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
        setError(data.error?.message || "가입에 실패했습니다.");
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
          <Link href="/" className="flex items-center gap-1 p-2 text-[14px] text-[#6b6b6b]">
            <ChevronLeft size={18} />
            <span>홈으로</span>
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center px-5 py-8">
          <div className="w-full max-w-[420px] text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#f5ebfa] flex items-center justify-center">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#5f0080" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-[22px] font-bold text-[#1a1a1a] mb-3">가입 신청이 완료되었습니다</h1>
            <p className="text-[14px] text-[#6b6b6b] leading-relaxed mb-8">
              입력하신 기업 정보를 확인한 뒤 승인해 드립니다.<br />
              승인이 완료되면 로그인하여 채용공고를 등록하실 수 있습니다.<br />
              <span className="text-[13px] text-[#9a9a9a]">보통 1영업일 이내에 처리됩니다.</span>
            </p>
            <Link href="/login"
              className="block w-full h-[52px] leading-[52px] bg-[#5f0080] text-white rounded-lg font-semibold text-[15px] hover:opacity-90 transition">
              로그인 페이지로
            </Link>
            <Link href="/"
              className="block w-full h-[48px] leading-[48px] mt-2.5 text-[#6b6b6b] text-[14px]">
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
        <button onClick={() => router.back()} className="flex items-center gap-1 p-2 text-[14px] text-[#6b6b6b]">
          <ChevronLeft size={18} />
          <span>돌아가기</span>
        </button>
      </header>

      <div className="flex-1 flex justify-center px-5 py-8">
        <div className="w-full max-w-[480px]">
          <div className="flex justify-center mb-6">
            <Link href="/"><Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} /></Link>
          </div>

          <h1 className="text-[22px] font-bold text-[#1a1a1a] text-center mb-2">
            기업회원 가입
          </h1>
          <p className="text-[13px] text-[#6b6b6b] text-center mb-8">
            뷰티앤잡에서 우수한 인재를 만나보세요
          </p>

          {/* 채용 유형 (최상단) */}
          <div className="mb-6">
            <p className="text-[13px] text-[#9a9a9a] mb-3">채용 형태에 맞는 유형을 선택해주세요</p>
            <div className="grid grid-cols-3 gap-2">
              {COMPANY_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => update("company_type", t.value)}
                  className={`relative flex flex-col items-center justify-center p-3 border-2 rounded-xl transition ${
                    form.company_type === t.value
                      ? "border-[#5f0080] bg-[#f5ebfa] text-[#5f0080]"
                      : "border-[#e0e0e0] text-[#6b6b6b] hover:border-[#c0c0c0]"
                  }`}
                >
                  <span className="text-xl mb-1">{t.icon}</span>
                  <span className="text-[12px] font-semibold">{t.label}</span>
                  <span className="text-[10px] mt-0.5 text-center leading-tight">{t.desc}</span>
                  {form.company_type === t.value && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#5f0080] rounded-full flex items-center justify-center">
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
            <label className="block text-[13px] text-[#6b6b6b] mb-1.5">회사명 *</label>
            <input type="text" value={form.company_name}
              onChange={(e) => update("company_name", e.target.value)}
              placeholder="예) 올리브영"
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]" />
          </div>

          <div className="mb-3">
            <label className="block text-[13px] text-[#6b6b6b] mb-1.5">브랜드명 (선택)</label>
            <input type="text" value={form.brand_name}
              onChange={(e) => update("brand_name", e.target.value)}
              placeholder="대표 브랜드명"
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]" />
          </div>

          <div className="mb-3">
            <label className="block text-[13px] text-[#6b6b6b] mb-1.5">사업자등록번호 *</label>
            <input type="text" value={form.business_number}
              onChange={(e) => update("business_number", formatBizNum(e.target.value))}
              placeholder="000-00-00000"
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]" />
          </div>

          {/* 사업자등록증 */}
          <div className="mb-4">
            <label className="block text-[13px] text-[#6b6b6b] mb-1.5">사업자등록증 *</label>
            <label className="flex items-center justify-between gap-2 w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] cursor-pointer hover:border-[#5f0080]">
              <span className={`truncate ${form.business_license_path ? "text-[#1a1a1a]" : "text-[#9a9a9a]"}`}>
                {licenseUploading ? "업로드 중..." : (licenseName || "이미지 또는 PDF 첨부")}
              </span>
              <span className="shrink-0 text-[13px] text-[#5f0080] font-semibold">
                {form.business_license_path ? "변경" : "파일 선택"}
              </span>
              <input type="file" accept="image/*,application/pdf" className="hidden"
                onChange={handleLicenseUpload} disabled={licenseUploading} />
            </label>
            <p className="text-[12px] text-[#9a9a9a] mt-1.5">JPG·PNG·WebP·PDF · 최대 5MB · 관리자 승인 확인용</p>
          </div>

          {/* 담당자 정보 */}
          <div className="mt-6 pt-6 border-t border-[#ececec]">
            <h2 className="text-[15px] font-semibold mb-3">담당자 정보</h2>

            <div className="mb-3">
              <label className="block text-[13px] text-[#6b6b6b] mb-1.5">이메일 *</label>
              <input type="email" value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="hr@company.com"
                className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]" />
            </div>

            <div className="mb-3">
              <label className="block text-[13px] text-[#6b6b6b] mb-1.5">대표 연락처 *</label>
              <input type="tel" value={form.phone}
                onChange={(e) => update("phone", formatPhone(e.target.value))}
                placeholder="02-1234-5678"
                className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]" />
            </div>

            <div className="mb-2">
              <label className="block text-[13px] text-[#6b6b6b] mb-1.5">비밀번호 *</label>
              <div className="relative mb-2">
                <input type={showPw ? "text" : "password"} value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="비밀번호 입력"
                  className="w-full h-[48px] px-4 pr-10 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9a9a]">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <input type={showPw ? "text" : "password"} value={form.passwordConfirm}
                onChange={(e) => update("passwordConfirm", e.target.value)}
                placeholder="비밀번호 다시 입력"
                className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]" />
              <p className="text-[12px] text-[#9a9a9a] mt-1.5">
                영문 대소문자, 숫자, 특수문자를 3가지 이상으로 조합해 8~16자
              </p>
              {form.passwordConfirm && form.password !== form.passwordConfirm && (
                <p className="text-[12px] text-[#e74c3c] mt-1">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>
          </div>

          {/* 약관 */}
          <div className="mt-6 pt-6 border-t border-[#ececec]">
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" checked={allAgreed} onChange={toggleAll}
                className="w-4 h-4 accent-[#5f0080]" />
              <span className="font-semibold text-[14px]">전체 동의</span>
            </label>
            <div className="space-y-2 ml-1">
              {terms.map((term) => (
                <label key={term.id} className="flex items-center gap-2 cursor-pointer text-[13px] text-[#3a3a3a]">
                  <input type="checkbox" checked={!!agreed[term.id]}
                    onChange={(e) => setAgreed({ ...agreed, [term.id]: e.target.checked })}
                    className="w-4 h-4 accent-[#5f0080]" />
                  <span>
                    <span className={`font-semibold ${term.is_required ? "text-[#5f0080]" : "text-[#9a9a9a]"}`}>
                      [{term.is_required ? "필수" : "선택"}]
                    </span>{" "}
                    {term.title}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-[13px] text-[#e74c3c] mt-4 text-center">{error}</p>}

          <button onClick={handleSubmit} disabled={!isFormValid || loading}
            className="w-full h-[52px] mt-6 bg-[#5f0080] text-white rounded-lg font-semibold text-[15px] disabled:bg-[#e0e0e0] disabled:text-[#9a9a9a] hover:opacity-90 transition">
            {loading ? "가입 중..." : "기업회원 가입"}
          </button>

        </div>
      </div>
    </div>
  );
}