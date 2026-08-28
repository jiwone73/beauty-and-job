"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import { UserRound, Smartphone, Mail, KeyRound, UserX, Building2 } from "lucide-react";
import { companyMeApi } from "@/lib/api/company";
import { InlineText } from "@/components/profile/inline/InlineField";
import { passwordError, PASSWORD_HINT } from "@/lib/password";

// 계정 설정 — 매장정보(프로필)에서 담당자 정보를 옮겨와 이메일·비밀번호·탈퇴와
// 한자리에 모은다("이 계정의 책임자는 담당자이지. 담당자 정보를 계정 설정으로
// 옮기자는거야?"). 프로필은 매장을 소개하는 정보고, 여기는 이 계정을 누가
// 책임지고 어떻게 로그인하는가에 대한 정보라 성격이 다르다.
export default function CompanyAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [managerName, setManagerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [companyType, setCompanyType] = useState("");

  useEffect(() => {
    companyMeApi.get().then((res) => {
      if (res.success && res.data) {
        setManagerName((res.data as any).manager_name || "");
        setPhone((res.data as any).phone || "");
        setEmail(res.data.email || "");
        setCompanyType((res.data as any).company_type || "");
      }
    }).finally(() => setLoading(false));
  }, []);

  // 가입할 때 고른 값이고 여기서 바꾸지 않는다 — 이 값이 화면 곳곳의 말(매장명/기업명)과
  // 업종 목록, 공고 직군을 통째로 가른다. 옛 'BOTH' 는 매장으로 본다(가입 선택지에서 빠졌다).
  const 유형이름 = companyType === "OFFICE" ? "본사" : companyType ? "매장" : "";

  const formatPhone = (v: string) => {
    const d = (v || "").replace(/\D/g, "").slice(0, 11);
    if (d.length < 4) return d;
    if (d.length < 8) return d.replace(/(\d{3})(\d+)/, "$1-$2");
    return d.replace(/(\d{3})(\d{4})(\d+)/, "$1-$2-$3");
  };

  const saveManagerName = async (v: string) => {
    const prev = managerName;
    setManagerName(v);
    try {
      await companyMeApi.update({ manager_name: v } as any);
    } catch (e: any) {
      // api-client 는 실패를 {success:false} 가 아니라 던진다 — 여기서 못 잡으면
      // 낙관적으로 바꾼 화면 값이 실패해도 그대로 남는다.
      setManagerName(prev);
      alert(e?.message || "저장에 실패했습니다.");
    }
  };

  // 담당자 휴대폰
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState("");
  const openPhoneModal = () => {
    setNewPhone(phone || "");
    setPhoneCode(""); setPhoneCodeSent(false); setPhoneMsg("");
    setShowPhoneModal(true);
  };
  const handleSendPhoneCode = async () => {
    const clean = newPhone.replace(/\D/g, "");
    if (clean.length < 10) { setPhoneMsg("올바른 휴대폰 번호를 입력해주세요."); return; }
    setPhoneSending(true); setPhoneMsg("");
    try {
      const res = await fetch("/api/auth/phone/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: clean, purpose: "signup" }) });
      const data = await res.json();
      if (data.success) { setPhoneCodeSent(true); setPhoneMsg(data.data?.dev_code ? `[개발용] 인증번호: ${data.data.dev_code}` : "인증번호를 발송했어요. (3분 이내 입력)"); }
      else setPhoneMsg(data.error?.message || "발송에 실패했습니다.");
    } catch { setPhoneMsg("네트워크 오류가 발생했습니다."); } finally { setPhoneSending(false); }
  };
  // 인증만 하고 저장은 메인 폼 '저장하기'를 기다리던 예전 방식은, 인증해 놓고
  // 저장을 안 눌러 반영이 안 되는 일이 있었다 — 여기서는 인증되면 그 자리에서 바로 저장한다.
  const handleVerifyPhoneCode = async () => {
    const clean = newPhone.replace(/\D/g, "");
    if (!phoneCode.trim()) { setPhoneMsg("인증번호를 입력해주세요."); return; }
    setPhoneVerifying(true); setPhoneMsg("");
    try {
      const res = await fetch("/api/auth/phone/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: clean, code: phoneCode, purpose: "signup" }) });
      const data = await res.json();
      if (!data.success) { setPhoneMsg(data.error?.message || "인증번호가 올바르지 않습니다."); return; }
      await companyMeApi.update({ phone: clean } as any);
      setPhone(clean);
      setShowPhoneModal(false);
    } catch (e: any) { setPhoneMsg(e?.message || "네트워크 오류가 발생했습니다."); } finally { setPhoneVerifying(false); }
  };

  // 이메일 변경
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailStep, setEmailStep] = useState<1 | 2>(1);
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const handleSendEmailCode = async () => {
    if (!newEmail.trim()) { alert("새 이메일 주소를 입력해주세요."); return; }
    setEmailBusy(true); setEmailMsg("");
    try {
      const res = await companyMeApi.requestEmailChange({ new_email: newEmail.trim() });
      setEmailStep(2);
      if (res.data?.dev_code) setEmailMsg(`인증코드를 발송했어요. (테스트: ${res.data.dev_code})`);
      else if (res.data?.sent) setEmailMsg("새 이메일로 인증코드를 발송했어요. 메일함(스팸함 포함)을 확인해주세요.");
      else setEmailMsg(`메일 발송 실패: ${(res.data as any)?.error || "Resend 설정(도메인·API 키)을 확인해주세요."}`);
    } catch (e: any) { setEmailMsg(e?.message || "오류가 발생했습니다."); }
    finally { setEmailBusy(false); }
  };
  const handleVerifyEmailCode = async () => {
    if (!emailCode.trim()) { alert("인증코드를 입력해주세요."); return; }
    setEmailBusy(true); setEmailMsg("");
    try {
      const res = await companyMeApi.verifyEmailChange({ new_email: newEmail.trim(), code: emailCode.trim() });
      setEmail((res.data as any).email);
      setShowEmailModal(false);
      alert("이메일이 변경되었습니다.");
    } catch (e: any) { setEmailMsg(e?.message || "인증에 실패했습니다."); }
    finally { setEmailBusy(false); }
  };

  // 비밀번호 변경
  const [showPwModal, setShowPwModal] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const handleChangePassword = async () => {
    if (!pwForm.current_password || !pwForm.new_password) {
      alert("현재 비밀번호와 새 비밀번호를 입력해주세요.");
      return;
    }
    const pwErr = passwordError(pwForm.new_password);
    if (pwErr) { alert(pwErr); return; }
    if (pwForm.new_password !== pwForm.confirm_password) {
      alert("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    setPwSaving(true);
    try {
      await companyMeApi.changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      alert("비밀번호가 변경되었습니다.");
      setShowPwModal(false);
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (e: any) { alert(e?.message || "비밀번호 변경 중 오류가 발생했습니다."); }
    finally { setPwSaving(false); }
  };

  // 제목 밑에 내용, 내용은 제목 첫 글자(아이콘+간격만큼 들여쓴 자리)에 맞춘다
  // ("제목 밑에 내용으로 통일되게, 내용은 제목 첫글자에 맞쳐줘").
  const row = { display: "flex" as const, flexDirection: "column" as const, gap: 6, padding: "15px 0", borderBottom: "1px solid #f0f0f0" };
  const label = { margin: 0, display: "flex" as const, alignItems: "center" as const, gap: 6 };
  const content = { paddingLeft: 21 }; // 아이콘 15px + gap 6px

  return (
    <CompanyLayout activePage="account">
      {/* 매장정보와 같은 짜임 — 두 칸씩. 옆에 사이드가 붙으면서 판이 넓어져
          한 줄에 하나씩 세우면 오른쪽이 통째로 빈다. */}
      <div style={{ maxWidth: 800 }}>
        {!loading && (
          <div className="company-card">
            <div className="admin-form-body settings-compact" style={{ gap: 0, paddingTop: 0, paddingBottom: 0 }}>
              {/* 가입할 때 고른 값. 이 계정이 어느 쪽인지가 화면 곳곳의 말과 목록을
                  가르므로 맨 위에 세운다. 바꾸는 칸이 아니라 확인하는 줄이다. */}
              <div className="admin-form-row-2col">
                <div className="admin-form-row" style={row}>
                  <label className="admin-form-label" style={label}><Building2 size={15} className="admin-form-icon" />가입 유형</label>
                  <span style={{ ...content, display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 14, color: 유형이름 ? "#333" : "#bbb" }}>{유형이름 || "미등록"}</span>
                    {/* 반 칸짜리 자리라 한마디만 — 긴 설명은 가입 화면에서 이미 읽었다. */}
                    {유형이름 && (
                      <span style={{ fontSize: 12, color: "#b0b0b6" }}>
                        {유형이름 === "본사" ? "매장이 아닌 곳 채용" : "살롱·샵 채용"}
                      </span>
                    )}
                  </span>
                </div>
                <div className="admin-form-row" style={row}>
                  <label className="admin-form-label" style={label}><UserRound size={15} className="admin-form-icon" />담당자</label>
                  <div style={content}><InlineText value={managerName} placeholder="담당자명" onSave={saveManagerName} /></div>
                </div>
              </div>

              <div className="admin-form-row-2col">
                <div className="admin-form-row" onClick={openPhoneModal} style={{ ...row, cursor: "pointer" }}>
                  <label className="admin-form-label" style={label}><Smartphone size={15} className="admin-form-icon" />담당자 휴대폰</label>
                  <span style={{ ...content, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span style={{ fontSize: 14, color: phone ? "#333" : "#bbb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{phone ? formatPhone(phone) : "미등록"}</span>
                    <span style={{ color: "#ccc", fontSize: 16, flexShrink: 0 }}>›</span>
                  </span>
                </div>

                <div className="admin-form-row"
                  onClick={() => { setShowEmailModal(true); setEmailStep(1); setNewEmail(""); setEmailCode(""); setEmailMsg(""); }}
                  style={{ ...row, cursor: "pointer" }}>
                  <label className="admin-form-label" style={label}><Mail size={15} className="admin-form-icon" />이메일</label>
                  <span style={{ ...content, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span style={{ fontSize: 14, color: email ? "#333" : "#bbb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email || "미등록"}</span>
                    <span style={{ color: "#ccc", fontSize: 16, flexShrink: 0 }}>›</span>
                  </span>
                </div>
              </div>

              {/* 비밀번호와 탈퇴는 나머지와 성격이 다르다(계정을 다루는 일).
                  마지막 줄이라 아래 선은 지운다. */}
              <div className="admin-form-row-2col">
                <div className="admin-form-row" onClick={() => setShowPwModal(true)} style={{ ...row, borderBottom: "none", cursor: "pointer" }}>
                  <label className="admin-form-label" style={label}><KeyRound size={15} className="admin-form-icon" />비밀번호</label>
                  <span style={{ ...content, display: "flex", alignItems: "center", gap: 6, color: "#cfcfcf", fontSize: 14 }}>
                    변경하기 <span style={{ color: "#ccc", fontSize: 16 }}>›</span>
                  </span>
                </div>

                <div className="admin-form-row" onClick={() => router.push("/company/dashboard/account/withdraw")}
                  style={{ ...row, borderBottom: "none", cursor: "pointer" }}>
                  <label className="admin-form-label" style={label}><UserX size={15} className="admin-form-icon" />회원 탈퇴</label>
                  <span style={{ ...content, display: "flex", alignItems: "center", gap: 6, color: "#cfcfcf", fontSize: 14 }}>
                    탈퇴하기 <span style={{ color: "#ccc", fontSize: 16 }}>›</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPhoneModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 400, width: "100%" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>담당자 휴대폰 변경</h3>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 16px", lineHeight: 1.5 }}>
              {!phoneCodeSent ? "① 새 휴대폰 번호를 입력하고 인증번호를 받으세요." : "② 문자로 받은 인증번호를 입력하세요."}
            </p>
            {!phoneCodeSent ? (
              <input className="admin-form-input" placeholder="010-0000-0000" inputMode="numeric"
                value={formatPhone(newPhone)} onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} style={{ marginBottom: 4 }} />
            ) : (
              <input className="admin-form-input" placeholder="인증번호 6자리" inputMode="numeric" maxLength={6}
                value={phoneCode} onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))} style={{ marginBottom: 4 }} />
            )}
            {phoneMsg && <p style={{ fontSize: 13, color: "#582681", margin: "6px 0 0", lineHeight: 1.5 }}>{phoneMsg}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={() => setShowPhoneModal(false)} disabled={phoneSending || phoneVerifying}
                style={{ flex: 1, height: 46, borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#333", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
                취소
              </button>
              {!phoneCodeSent ? (
                <button onClick={handleSendPhoneCode} disabled={phoneSending || newPhone.replace(/\D/g, "").length < 10}
                  style={{ flex: 1, height: 46, borderRadius: 8, border: "none", background: "#582681", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer", opacity: phoneSending ? 0.7 : 1 }}>
                  {phoneSending ? "발송 중..." : "인증번호 받기"}
                </button>
              ) : (
                <button onClick={handleVerifyPhoneCode} disabled={phoneVerifying || phoneCode.length < 6}
                  style={{ flex: 1, height: 46, borderRadius: 8, border: "none", background: "#582681", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer", opacity: (phoneVerifying || phoneCode.length < 6) ? 0.6 : 1 }}>
                  {phoneVerifying ? "확인 중..." : "인증하고 저장"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showEmailModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 420, width: "100%" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>이메일 변경</h3>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 16px", lineHeight: 1.5 }}>
              {emailStep === 1 ? "① 새 이메일 주소를 입력하고 인증코드를 받으세요." : "② 새 이메일로 받은 인증코드를 입력하세요."}
            </p>
            {emailStep === 1 ? (
              <input type="email" className="admin-form-input" placeholder="새 이메일 주소"
                value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={{ marginBottom: 4 }} />
            ) : (
              <input className="admin-form-input" placeholder="인증코드 6자리" inputMode="numeric" maxLength={6}
                value={emailCode} onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))} style={{ marginBottom: 4 }} />
            )}
            {emailMsg && <p style={{ fontSize: 13, color: "#582681", margin: "6px 0 0", lineHeight: 1.5 }}>{emailMsg}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={() => setShowEmailModal(false)} disabled={emailBusy}
                style={{ flex: 1, height: 46, borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#333", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
                취소
              </button>
              {emailStep === 1 ? (
                <button onClick={handleSendEmailCode} disabled={emailBusy}
                  style={{ flex: 1, height: 46, borderRadius: 8, border: "none", background: "#582681", color: "#fff", fontSize: 16, fontWeight: 600, cursor: emailBusy ? "not-allowed" : "pointer", opacity: emailBusy ? 0.7 : 1 }}>
                  {emailBusy ? "발송 중..." : "인증코드 받기"}
                </button>
              ) : (
                <button onClick={handleVerifyEmailCode} disabled={emailBusy}
                  style={{ flex: 1, height: 46, borderRadius: 8, border: "none", background: "#582681", color: "#fff", fontSize: 16, fontWeight: 600, cursor: emailBusy ? "not-allowed" : "pointer", opacity: emailBusy ? 0.7 : 1 }}>
                  {emailBusy ? "확인 중..." : "변경하기"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showPwModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 420, width: "100%" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px" }}>비밀번호 변경</h3>
            <input className="admin-form-input" type={showPw ? "text" : "password"} placeholder="현재 비밀번호"
              value={pwForm.current_password}
              onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })} />
            <input className="admin-form-input" type={showPw ? "text" : "password"} placeholder={`새 비밀번호 (${PASSWORD_HINT})`}
              style={{ marginTop: 8 }}
              value={pwForm.new_password}
              onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} />
            <input className="admin-form-input" type={showPw ? "text" : "password"} placeholder="새 비밀번호 확인"
              style={{ marginTop: 8 }}
              value={pwForm.confirm_password}
              onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })} />
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 13, color: "#888", cursor: "pointer" }}>
              <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
              비밀번호 표시
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={() => setShowPwModal(false)} disabled={pwSaving}
                style={{ flex: 1, height: 46, borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#333", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
                취소
              </button>
              <button onClick={handleChangePassword} disabled={pwSaving}
                style={{ flex: 1, height: 46, borderRadius: 8, border: "none", background: "#582681", color: "#fff", fontSize: 16, fontWeight: 600, cursor: pwSaving ? "not-allowed" : "pointer", opacity: pwSaving ? 0.7 : 1 }}>
                {pwSaving ? "변경 중..." : "변경하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </CompanyLayout>
  );
}
