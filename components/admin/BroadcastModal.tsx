"use client";
import { useState } from "react";

type Target = { id: string; name: string; email: string | null; phone: string | null };

export default function BroadcastModal({
  targets,
  onClose,
  initialChannel = "email",
}: {
  targets: Target[];
  onClose: () => void;
  initialChannel?: "email" | "sms";
}) {
  const [channel, setChannel] = useState<"email" | "sms">(initialChannel);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null);

  const emailValid = targets.filter((t) => t.email && t.email.includes("@"));
  const smsValid = targets.filter((t) => t.phone && t.phone.replace(/[^0-9]/g, "").length >= 10);
  const valid = channel === "email" ? emailValid : smsValid;
  const missing = targets.length - valid.length;

  const byteLen = [...message].reduce((n, ch) => n + (ch.charCodeAt(0) > 127 ? 2 : 1), 0);
  const smsType = byteLen > 90 ? "LMS(장문)" : "SMS(단문)";

  const send = async () => {
    if (channel === "email" && !subject.trim()) { alert("제목을 입력해주세요."); return; }
    if (!message.trim()) { alert("내용을 입력해주세요."); return; }
    if (valid.length === 0) { alert(channel === "email" ? "이메일이 있는 대상이 없습니다." : "전화번호가 있는 대상이 없습니다."); return; }
    if (!confirm(`${valid.length}명에게 ${channel === "email" ? "이메일" : "문자"}를 발송하시겠습니까?`)) return;

    setSending(true); setResult(null);
    try {
      const res = channel === "email"
        ? await fetch("/api/admin/broadcast/email", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
            body: JSON.stringify({ to: emailValid.map((t) => t.email), subject, body: message }),
          })
        : await fetch("/api/admin/sms/send", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
            body: JSON.stringify({ receivers: smsValid.map((t) => t.phone), message }),
          });
      const data = await res.json();
      if (data.success) {
        if (data.data?.pending) setResult(`⚙️ ${data.data.message}`);
        else setResult(`✅ ${data.data.sent ?? data.data.count}명에게 발송 완료`);
      } else {
        setResult(`❌ ${data.error?.message || "발송 실패"}`);
      }
    } catch (e) {
      console.error(e); setResult("❌ 발송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  const tabBtn = (on: boolean): React.CSSProperties => ({
    flex: 1, padding: "8px 0", borderRadius: 8, cursor: "pointer",
    fontSize: 14, fontWeight: 400,
    background: on ? "#ede9fe" : "#fff",
    color: on ? "#5f0080" : "#aaa",
    border: on ? "none" : "1px solid #eee",
  });

  return (
    <div className="cv-overlay">
      <div className="cv-modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        <div className="cv-body">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 400, margin: 0 }}>{channel === "email" ? "이메일 발송" : "문자 발송"}</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999" }}>✕</button>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button style={tabBtn(channel === "email")} onClick={() => setChannel("email")}>이메일</button>
            <button style={tabBtn(channel === "sms")} onClick={() => setChannel("sms")}>문자(SMS)</button>
          </div>

          <div style={{ color: "#888", fontSize: 13, marginBottom: 10 }}>
            수신 대상 <span style={{ color: "#5f0080" }}>{valid.length}명</span>
            {missing > 0 && <span style={{ color: "#e74c3c" }}> · {channel === "email" ? "이메일" : "번호"} 없음 {missing}명 제외</span>}
          </div>

          {channel === "email" && (
            <input className="cv-input" value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="이메일 제목"
              style={{ marginBottom: 10 }} />
          )}

          <textarea className="cv-input" value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder={channel === "email" ? "메일 내용을 입력하세요." : "안내 문자 내용을 입력하세요."}
            spellCheck lang="ko"
            style={{ minHeight: 150, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
          {channel === "sms" && (
            <div style={{ fontSize: 12, color: "#999", textAlign: "right", marginTop: 4 }}>{byteLen}바이트 · {smsType}</div>
          )}

          {result && (
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "#f3eafa", fontSize: 13, color: "#5f0080", textAlign: "center" }}>
              {result}
            </div>
          )}

          <button onClick={send} disabled={sending}
            style={{ width: "100%", marginTop: 16, padding: "13px", background: sending ? "#f3eefc" : "#ede9fe", color: "#5f0080", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 400, cursor: sending ? "default" : "pointer" }}>
            {sending ? "발송 중..." : `${valid.length}명에게 ${channel === "email" ? "이메일" : "문자"} 발송`}
          </button>
          <p style={{ fontSize: 12, color: "#999", textAlign: "center", marginTop: 8 }}>
            {channel === "email"
              ? "발신 전용(noreply)로 나갑니다. 회신은 support@로 받습니다."
              : "안내성 문자만 발송하세요. (광고성은 수신동의·수신거부 표기 필요)"}
          </p>
        </div>
      </div>
    </div>
  );
}
