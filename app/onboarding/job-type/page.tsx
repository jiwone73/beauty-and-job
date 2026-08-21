"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { StoreIcon, OfficeIcon } from "@/components/icons/JobTypeIcon";
import { useAuthStore } from "@/lib/store/authStore";

export default function OnboardingJobTypePage() {
  const router = useRouter();
  const { login, userName, userPhone, userJobAreas } = useAuthStore();
  const [selected, setSelected] = useState<"OFFICE" | "STORE" | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 카카오로 가입하면 번호가 없다. 기업이 지원자에게 연락하는 유일한 수단이라 여기서 받아 둔다.
  const needPhone = !userPhone;
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState("");

  const sendCode = async () => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) { setPhoneMsg("휴대폰 번호를 정확히 입력해주세요."); return; }
    setPhoneBusy(true); setPhoneMsg("");
    try {
      const res = await fetch("/api/auth/phone/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean, purpose: "signup" }),
      });
      const d = await res.json();
      if (d.success) { setCodeSent(true); setPhoneMsg(d.data?.dev_code ? `[개발용] 인증번호: ${d.data.dev_code}` : "인증번호를 발송했어요. (3분 이내 입력)"); }
      else setPhoneMsg(d.error?.message || "발송에 실패했어요.");
    } catch { setPhoneMsg("네트워크 오류가 발생했어요."); } finally { setPhoneBusy(false); }
  };

  const verifyCode = async () => {
    const clean = phone.replace(/\D/g, "");
    setPhoneBusy(true); setPhoneMsg("");
    try {
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean, code: phoneCode, purpose: "signup" }),
      });
      const d = await res.json();
      if (d.success) { setPhoneVerified(true); setPhoneMsg("휴대폰 인증이 완료됐어요."); }
      else setPhoneMsg(d.error?.message || "인증번호가 올바르지 않아요.");
    } catch { setPhoneMsg("네트워크 오류가 발생했어요."); } finally { setPhoneBusy(false); }
  };

  const handleSubmit = async () => {
    if (!selected) {
      setError("직종을 선택해 주세요.");
      return;
    }
    if (needPhone && !phoneVerified) {
      setError("휴대폰 인증을 완료해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(needPhone
          ? { job_type: selected, phone: phone.replace(/\D/g, "") }
          : { job_type: selected }),
      });
      if (!res.ok) throw new Error("저장 실패");

      login({
        ownerType: "user",
        userName,
        userPhone: needPhone ? phone.replace(/\D/g, "") : userPhone,
        userJobType: selected,
        userJobAreas,
      });
      router.replace("/profile");
    } catch (e) {
      console.error(e);
      setError("저장 중 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-[13px] text-[#5f0080] font-semibold mb-2">거의 다 왔어요!</p>
          <h1 className="text-[22px] font-bold text-[#111]">어떤 일을 찾고 계세요?</h1>
          <p className="text-[14px] text-[#6b6b6b] mt-2">관심 분야 공고를 먼저 보여드릴게요</p>
        </div>

        <div className="flex flex-col gap-3 mb-8">
          <button
            onClick={() => setSelected("STORE")}
            className={"w-full rounded-xl border-2 p-5 text-left transition-all " +
              (selected === "STORE"
                ? "border-[#5f0080] bg-[#f5ebfa]"
                : "border-[#e5e5e5] bg-white hover:border-[#c9a3e0]")}
          >
            <p className="text-[16px] font-bold text-[#111] mb-1 flex items-center gap-1.5">
              <StoreIcon size={20} style={{ color: "#5f0080" }} /> 매장
            </p>
            <p className="text-[13px] text-[#6b6b6b]">
              살롱·샵 등 매장에서 근무하는 직군이에요
            </p>
          </button>

          <button
            onClick={() => setSelected("OFFICE")}
            className={"w-full rounded-xl border-2 p-5 text-left transition-all " +
              (selected === "OFFICE"
                ? "border-[#5f0080] bg-[#f5ebfa]"
                : "border-[#e5e5e5] bg-white hover:border-[#c9a3e0]")}
          >
            <p className="text-[16px] font-bold text-[#111] mb-1 flex items-center gap-1.5">
              <OfficeIcon size={20} style={{ color: "#5f0080" }} /> 본사
            </p>
            <p className="text-[13px] text-[#6b6b6b]">
              브랜드·제조·유통·교육·협력사 등 매장이 아닌 곳에서 근무하는 직군이에요
            </p>
          </button>
        </div>

        {needPhone && (
          <div className="mb-8">
            <p className="text-[13px] text-[#6b6b6b] mb-2">
              휴대폰 번호 <span className="text-red-500">*</span>
              <span className="text-[#9a9a9a]"> · 기업이 연락할 때 쓰여요</span>
            </p>
            <div className="flex gap-2">
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/[^0-9-]/g, "")); setPhoneVerified(false); setCodeSent(false); }}
                disabled={phoneVerified}
                placeholder="(예시) 010-1234-5678"
                className="flex-1 min-w-0 h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080] disabled:bg-[#f5f5f5]"
              />
              <button type="button" onClick={sendCode}
                disabled={phoneBusy || phoneVerified || phone.replace(/\D/g, "").length < 10}
                className="px-4 h-[48px] shrink-0 whitespace-nowrap rounded-lg text-[13px] border border-[#5f0080] text-[#5f0080] disabled:border-[#ddd] disabled:text-[#aaa] hover:bg-[#f5ebfa] transition">
                {phoneVerified ? "인증완료" : codeSent ? "재전송" : phoneBusy ? "전송중" : "인증번호 받기"}
              </button>
            </div>
            {codeSent && !phoneVerified && (
              <div className="flex gap-2 mt-2">
                <input type="text" inputMode="numeric" value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="인증번호 6자리"
                  className="flex-1 h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]" />
                <button type="button" onClick={verifyCode}
                  disabled={phoneBusy || phoneCode.length < 6}
                  className="px-4 h-[48px] whitespace-nowrap rounded-lg text-[13px] bg-[#5f0080] text-white disabled:opacity-40 hover:opacity-90 transition">
                  확인
                </button>
              </div>
            )}
            {phoneMsg && <p className={`mt-1.5 text-[12px] ${phoneVerified ? "text-[#10b981]" : "text-[#9a9a9a]"}`}>{phoneMsg}</p>}
          </div>
        )}

        {error && (
          <p className="text-[13px] text-red-500 text-center mb-4">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!selected || loading || (needPhone && !phoneVerified)}
          className="w-full h-[52px] rounded-lg bg-[#5f0080] text-white font-semibold text-[15px] disabled:bg-[#e0e0e0] disabled:text-[#9a9a9a] hover:opacity-90 transition"
        >
          {loading ? "저장 중..." : "시작하기"}
        </button>
      </div>
    </div>
  );
}
