"use client";
import { useState } from "react";

type Target = { id: string; name: string; phone: string | null };

export default function SmsModal({
  targets,
  onClose,
}: {
  targets: Target[];
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const valid = targets.filter((t) => t.phone && t.phone.replace(/[^0-9]/g, "").length >= 10);
  const noPhone = targets.length - valid.length;

  const byteLen = [...message].reduce((n, ch) => n + (ch.charCodeAt(0) > 127 ? 2 : 1), 0);
  const msgType = byteLen > 90 ? "LMS(장문)" : "SMS(단문)";

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null);

  const handleSend = async () => {
    if (!message.trim()) { alert("보낼 내용을 입력해주세요."); return; }
    if (valid.length === 0) { alert("전화번호가 있는 수신자가 없습니다."); return; }
    if (!confirm(`${valid.length}명에게 문자를 발송하시겠습니까?`)) return;

    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          receivers: valid.map((t) => t.phone),
          message,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data?.pending) {
          setResult(`⚙️ ${data.data.message}`);
        } else {
          setResult(`✅ ${data.data.count}명에게 발송 완료 (${data.data.type})`);
        }
      } else {
        setResult(`❌ ${data.error?.message || "발송 실패"}`);
      }
    } catch (e) {
      console.error(e);
      setResult("❌ 발송 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="cv-overlay">
      <div className="cv-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="cv-body">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>문자 발송</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999" }}>✕</button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ color: "#888", fontSize: 13, marginBottom: 8 }}>
              수신 대상 <strong style={{ color: "#5f0080" }}>{valid.length}명</strong>
              {noPhone > 0 && <span style={{ color: "#e74c3c" }}> · 번호 없음 {noPhone}명 제외</span>}
            </div>
            <div style={{ maxHeight: 120, overflowY: "auto", background: "#faf7fc", borderRadius: 10, padding: "10px 14px", fontSize: 13, lineHeight: 1.9 }}>
              {targets.map((t) => (
                <div key={t.id} style={{ color: t.phone ? "#333" : "#bbb" }}>
                  {t.name} · {t.phone || "번호 없음"}
                </div>
              ))}
            </div>
          </div>

          <label className="cv-field-label">메시지 내용</label>
          <textarea className="cv-input" value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="발송할 안내 문자를 입력해주세요."
            style={{ minHeight: 140, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
          <div style={{ fontSize: 12, color: "#999", textAlign: "right", marginTop: 4 }}>
            {byteLen}바이트 · {msgType}
          </div>

          {result && (
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "#f3eafa", fontSize: 13, color: "#5f0080", textAlign: "center" }}>
              {result}
            </div>
          )}

          <button onClick={handleSend} disabled={sending}
            style={{ width: "100%", marginTop: 16, padding: "13px", background: sending ? "#b98fd0" : "#5f0080", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: sending ? "default" : "pointer" }}>
            {sending ? "발송 중..." : `${valid.length}명에게 발송`}
          </button>
          <p style={{ fontSize: 12, color: "#999", textAlign: "center", marginTop: 8 }}>
            안내성 문자만 발송하세요. (광고성 문자는 수신동의·수신거부 표기 필요)
          </p>
        </div>
      </div>
    </div>
  );
}
