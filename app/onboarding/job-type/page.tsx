"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StoreIcon, OfficeIcon } from "@/components/icons/JobTypeIcon";
import { useAuthStore } from "@/lib/store/authStore";

export default function OnboardingJobTypePage() {
  const router = useRouter();
  const { login, userName, userPhone, userJobAreas } = useAuthStore();
  const [selected, setSelected] = useState<"OFFICE" | "STORE" | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 아직 회원이 아닌 사람 — 카카오·네이버에서 값만 받아 온 상태다. 여기서
  // 약관에 동의해야 비로소 회원이 된다. 서버가 회원을 먼저 만들지 않는 이유는
  // 우리 약관에 동의하기 전에 개인정보를 저장하지 않기 위해서다.
  // (카카오가 보여 주는 동의는 「카카오가 우리에게 값을 넘겨도 되느냐」이지
  //  우리 이용약관에 대한 동의가 아니다.)
  const [가입표, set가입표] = useState<string | null>(null);
  const [표번호있나, set표번호있나] = useState(false);
  const [읽는중, set읽는중] = useState(true);

  // 약관은 이메일 가입과 같은 것을 쓴다(/api/terms → term_agreements).
  type 약관 = { id: string; title: string; is_required: boolean };
  const [약관들, set약관들] = useState<약관[]>([]);
  const [동의, set동의] = useState<Record<string, boolean>>({});

  useEffect(() => {
    set가입표(sessionStorage.getItem("social_signup"));
    set표번호있나(!!sessionStorage.getItem("social_signup_phone"));
    set읽는중(false);
    fetch("/api/terms")
      .then((r) => r.json())
      .then((res) => { if (res.success) set약관들(res.data); })
      .catch((e) => console.error("[load terms]", e));
  }, []);

  const 필수약관 = 약관들.filter((t) => t.is_required);
  const 전체동의됨 = 약관들.length > 0 && 약관들.every((t) => 동의[t.id]);
  const 필수동의됨 = 약관들.length > 0 && 필수약관.every((t) => 동의[t.id]);
  const 전체토글 = () => {
    const 켠다 = !전체동의됨;
    set동의(Object.fromEntries(약관들.map((t) => [t.id, 켠다])));
  };

  // 카카오로 가입하면 번호가 없다. 기업이 지원자에게 연락하는 유일한 수단이라 여기서 받아 둔다.
  const needPhone = 가입표 ? !표번호있나 : !userPhone;
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
    if (!필수동의됨) {
      setError("필수 약관에 동의해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    const 고른약관 = 약관들.filter((t) => 동의[t.id]).map((t) => t.id);
    const 번호 = phone.replace(/\D/g, "");
    try {
      if (가입표) {
        // 아직 회원이 아니다 — 여기서 회원이 만들어지고 동의도 같이 남는다.
        const res = await fetch("/api/auth/social/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signup: 가입표,
            job_type: selected,
            phone: needPhone ? 번호 : undefined,
            agreed_term_ids: 고른약관,
          }),
        });
        const d = await res.json().catch(() => null);
        if (!res.ok || !d?.success) {
          setError(d?.error?.message || "가입에 실패했어요. 다시 시도해 주세요.");
          setLoading(false);
          return;
        }
        sessionStorage.removeItem("social_signup");
        sessionStorage.removeItem("social_signup_name");
        sessionStorage.removeItem("social_signup_phone");
        localStorage.setItem("access_token", d.data.access_token);
        login({
          ownerType: "user",
          userName: d.data.user.name || "",
          userPhone: d.data.user.phone || "",
          userJobType: selected,
          userJobAreas: d.data.user.office_job_areas || [],
        });
        router.replace("/profile");
        return;
      }

      // 이미 있는 회원 — 간편가입에 동의 절차가 붙기 전에 만들어진 계정이다.
      // 직군·번호를 저장하면서 밀린 동의도 같이 받아 둔다.
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(needPhone
          ? { job_type: selected, phone: 번호 }
          : { job_type: selected }),
      });
      if (!res.ok) throw new Error("저장 실패");

      await fetch("/api/users/me/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ agreed_term_ids: 고른약관 }),
      }).catch((e) => console.error("[terms]", e));

      login({
        ownerType: "user",
        userName,
        userPhone: needPhone ? 번호 : userPhone,
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
          <p className="text-[13px] text-[#582681] font-semibold mb-2">거의 다 왔어요!</p>
          <h1 className="text-[22px] font-bold text-[#111]">어떤 일을 찾고 계세요?</h1>
          <p className="text-[14px] text-[#6b6b6b] mt-2">관심 분야 공고를 먼저 보여드릴게요</p>
        </div>

        <div className="flex flex-col gap-3 mb-8">
          <button
            onClick={() => setSelected("STORE")}
            className={"w-full rounded-xl border-2 p-5 text-left transition-all " +
              (selected === "STORE"
                ? "border-[#582681] bg-[#f7f7f8]"
                : "border-[#e5e5e5] bg-white hover:border-[#a8a8ad]")}
          >
            <p className="text-[16px] font-bold text-[#111] mb-1 flex items-center gap-1.5">
              <StoreIcon size={20} style={{ color: "#582681" }} /> 매장
            </p>
            <p className="text-[13px] text-[#6b6b6b]">
              살롱·샵 등 매장에서 근무하는 직군이에요
            </p>
          </button>

          <button
            onClick={() => setSelected("OFFICE")}
            className={"w-full rounded-xl border-2 p-5 text-left transition-all " +
              (selected === "OFFICE"
                ? "border-[#582681] bg-[#f7f7f8]"
                : "border-[#e5e5e5] bg-white hover:border-[#a8a8ad]")}
          >
            <p className="text-[16px] font-bold text-[#111] mb-1 flex items-center gap-1.5">
              <OfficeIcon size={20} style={{ color: "#582681" }} /> 본사
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
                className="flex-1 min-w-0 h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#582681] disabled:bg-[#f5f5f5]"
              />
              <button type="button" onClick={sendCode}
                disabled={phoneBusy || phoneVerified || phone.replace(/\D/g, "").length < 10}
                className="px-4 h-[48px] shrink-0 whitespace-nowrap rounded-lg text-[13px] border border-[#582681] text-[#582681] disabled:border-[#ddd] disabled:text-[#aaa] hover:bg-[#f7f7f8] transition">
                {phoneVerified ? "인증완료" : codeSent ? "재전송" : phoneBusy ? "전송중" : "인증번호 받기"}
              </button>
            </div>
            {codeSent && !phoneVerified && (
              <div className="flex gap-2 mt-2">
                <input type="text" inputMode="numeric" value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="인증번호 6자리"
                  className="flex-1 h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#582681]" />
                <button type="button" onClick={verifyCode}
                  disabled={phoneBusy || phoneCode.length < 6}
                  className="px-4 h-[48px] whitespace-nowrap rounded-lg text-[13px] bg-[#582681] text-white disabled:opacity-40 hover:opacity-90 transition">
                  확인
                </button>
              </div>
            )}
            {phoneMsg && <p className={`mt-1.5 text-[12px] ${phoneVerified ? "text-[#10b981]" : "text-[#9a9a9a]"}`}>{phoneMsg}</p>}
          </div>
        )}

        {/* 약관 동의 — 이메일 가입과 같은 약관, 같은 모양이다.
            카카오·네이버 화면에서 받은 동의는 그쪽이 우리에게 값을 넘기는 데
            대한 것이라, 우리 이용약관 동의는 여기서 따로 받아야 한다. */}
        <div className="mb-8 pt-6 border-t border-[#ececec]">
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input type="checkbox" checked={전체동의됨} onChange={전체토글}
              className="w-4 h-4 accent-[#582681]" />
            <span className="text-[14px]">전체 동의</span>
          </label>
          <div className="space-y-2 ml-1">
            {약관들.map((t) => (
              <label key={t.id} className="flex items-center gap-2 cursor-pointer text-[13px] text-[#3a3a3a]">
                <input type="checkbox" checked={!!동의[t.id]}
                  onChange={(e) => set동의({ ...동의, [t.id]: e.target.checked })}
                  className="w-4 h-4 accent-[#582681]" />
                <span>
                  <span className={t.is_required ? "text-[#582681]" : "text-[#9a9a9a]"}>
                    [{t.is_required ? "필수" : "선택"}]
                  </span>{" "}
                  {t.title}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-3 ml-1 text-[12px] text-[#9a9a9a]">
            <Link href="/support/terms" target="_blank" className="underline">이용약관</Link>
            {" · "}
            <Link href="/support/privacy" target="_blank" className="underline">개인정보처리방침</Link>
          </p>
        </div>

        {error && (
          <p className="text-[13px] text-red-500 text-center mb-4">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!selected || loading || 읽는중 || !필수동의됨 || (needPhone && !phoneVerified)}
          className="w-full h-[52px] rounded-lg bg-[#582681] text-white font-semibold text-[15px] disabled:bg-[#e0e0e0] disabled:text-[#9a9a9a] hover:opacity-90 transition"
        >
          {loading ? "저장 중..." : "시작하기"}
        </button>
      </div>
    </div>
  );
}
