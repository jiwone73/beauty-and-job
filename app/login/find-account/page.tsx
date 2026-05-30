"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

function formatPhone(v: string) {
  const n = v.replace(/\D/g, "").slice(0, 11);
  if (n.length < 4) return n;
  if (n.length < 8) return `${n.slice(0, 3)}-${n.slice(3)}`;
  return `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`;
}

export default function FindAccountPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [msg, setMsg] = useState("");
  const [accounts, setAccounts] = useState<{ email_masked: string; created_at: string }[] | null>(null);

  const handleSend = async () => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) { setMsg("올바른 휴대폰 번호를 입력해주세요."); return; }
    setSending(true); setMsg("");
    try {
      const res = await fetch("/api/auth/phone/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean, purpose: "find_account" }),
      });
      const data = await res.json();
      if (data.success) {
        setCodeSent(true);
        setMsg(data.data?.dev_code ? `[개발용] 인증번호: ${data.data.dev_code}` : "인증번호를 발송했어요. (3분 이내 입력)");
      } else {
        setMsg(data.error?.message || "발송에 실패했습니다.");
      }
    } catch {
      setMsg("네트워크 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    const clean = phone.replace(/\D/g, "");
    if (!code.trim()) { setMsg("인증번호를 입력해주세요."); return; }
    setVerifying(true); setMsg("");
    try {
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean, code, purpose: "find_account" }),
      });
      const data = await res.json();
      if (data.success) {
        setVerified(true);
        // 인증 성공 시 바로 계정 조회
        const findRes = await fetch("/api/auth/find-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: clean }),
        });
        const findData = await findRes.json();
        if (findData.success) {
          setAccounts(findData.data.accounts);
        }
      } else {
        setMsg(data.error?.message || "인증번호가 올바르지 않습니다.");
      }
    } catch {
      setMsg("네트워크 오류가 발생했습니다.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="h-14 flex items-center px-4 border-b border-[#ececec]">
        <button onClick={() => router.back()} className="p-2">
          <ChevronLeft size={22} />
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center px-5">
        <div className="w-full max-w-[400px]">
          <div className="flex justify-center mb-8">
            <Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} />
          </div>

          <h1 className="text-[22px] font-bold text-[#1a1a1a] text-center mb-2">계정 찾기</h1>
          <p className="text-center text-[14px] text-[#6b6b6b] mb-8">
            가입 시 등록한 휴대폰 번호로 계정을 찾을 수 있어요
          </p>

          {accounts === null ? (
            <>
              {/* 휴대폰 입력 */}
              <div className="mb-3">
                <label className="block text-[13px] text-[#6b6b6b] mb-1.5">휴대폰 번호</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(formatPhone(e.target.value)); setVerified(false); setCodeSent(false); }}
                    placeholder="(예시) 010-1234-5678"
                    disabled={verified}
                    className="flex-1 h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080] disabled:bg-[#f5f5f5]"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || verified || phone.replace(/\D/g, "").length < 10}
                    className="px-4 h-[48px] whitespace-nowrap rounded-lg text-[13px] font-semibold border border-[#5f0080] text-[#5f0080] disabled:border-[#ddd] disabled:text-[#aaa] hover:bg-[#f5ebfa] transition"
                  >
                    {codeSent ? "재전송" : sending ? "전송중" : "인증번호 받기"}
                  </button>
                </div>
              </div>

              {/* 인증번호 입력 */}
              {codeSent && (
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="인증번호 6자리"
                    className="flex-1 h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]"
                  />
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={verifying || code.length < 6}
                    className="px-4 h-[48px] whitespace-nowrap rounded-lg text-[13px] font-semibold bg-[#5f0080] text-white disabled:opacity-40 hover:opacity-90 transition"
                  >
                    {verifying ? "확인중" : "확인"}
                  </button>
                </div>
              )}

              {msg && <p className="text-[12px] text-[#9a9a9a] mt-1.5">{msg}</p>}
            </>
          ) : accounts.length > 0 ? (
            /* 계정 찾기 결과 */
            <div className="text-center">
              <p className="text-[14px] text-[#3a3a3a] mb-4">가입된 계정을 찾았어요</p>
              <div className="border border-[#e0e0e0] rounded-lg p-4 mb-6">
                {accounts.map((a, i) => (
                  <div key={i} className="py-2">
                    <p className="text-[15px] font-semibold text-[#1a1a1a]">{a.email_masked}</p>
                    <p className="text-[12px] text-[#9a9a9a] mt-1">
                      {new Date(a.created_at).toLocaleDateString("ko-KR")} 가입
                    </p>
                  </div>
                ))}
              </div>
              <Link href="/login/email">
                <button className="w-full h-[52px] bg-[#5f0080] text-white rounded-lg font-semibold text-[15px] hover:opacity-90 transition">
                  로그인하러 가기
                </button>
              </Link>
            </div>
          ) : (
            /* 계정 없음 */
            <div className="text-center">
              <p className="text-[14px] text-[#3a3a3a] mb-2">해당 번호로 가입된 계정이 없어요</p>
              <p className="text-[13px] text-[#9a9a9a] mb-6">다른 번호로 가입했거나, 아직 회원이 아닐 수 있어요</p>
              <Link href="/signup/email">
                <button className="w-full h-[52px] bg-[#5f0080] text-white rounded-lg font-semibold text-[15px] hover:opacity-90 transition">
                  회원가입하기
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
