"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";

const TYPES = ["계정/로그인", "채용공고", "기업회원", "기타"];

export default function InquiryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { userName } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState("계정/로그인");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(userName || "");
      setEmail("");
      setType("계정/로그인");
      setSubject("");
      setMessage("");
      setDone(false);
    }
  }, [isOpen, userName]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) { alert("이름을 입력해주세요."); return; }
    if (!message.trim()) { alert("문의 내용을 입력해주세요."); return; }
    setSubmitting(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || null, phone: phone.trim() || null, type, subject: subject.trim() || null, message: message.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
      } else {
        alert(data.error?.message || "문의 접수에 실패했습니다.");
      }
    } catch (e) {
      alert("문의 접수 중 오류가 발생했습니다.");
      console.error("[inquiry submit]", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cv-overlay" onClick={onClose}>
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <div style={{ width: 36 }} />
          <h2 className="cv-title">1:1 문의</h2>
          <button className="cv-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="cv-body">
          {done ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: "#1a1a1a" }}>문의가 접수되었습니다</h3>
              <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
                남겨주신 이메일로 평일 기준 1~2일 내에 답변드리겠습니다.
              </p>
              <button className="cv-btn-primary" style={{ marginTop: 20 }} onClick={onClose}>확인</button>
            </div>
          ) : (
            <>
              <label className="cv-field-label">문의 유형</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                {TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => setType(t)}
                    style={{
                      padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      border: type === t ? "1.5px solid #5f0080" : "1px solid #e0e0e0",
                      background: type === t ? "#faf5ff" : "#fff",
                      color: type === t ? "#5f0080" : "#666",
                    }}>
                    {t}
                  </button>
                ))}
              </div>

              <label className="cv-field-label cv-required">이름</label>
              <input className="cv-input" placeholder="이름을 입력해주세요" value={name} onChange={(e) => setName(e.target.value)} />

              <label className="cv-field-label">이메일 (답변 받으실 주소)</label>
              <input className="cv-input" type="email" placeholder="답변 받으실 이메일을 입력해주세요" value={email} onChange={(e) => setEmail(e.target.value)} />
              <label className="cv-field-label">전화번호</label>
              <input className="cv-input" type="tel" placeholder="연락 가능한 전화번호 (선택)" value={phone} onChange={(e) => setPhone(e.target.value)} />

              <label className="cv-field-label">제목</label>
              <input className="cv-input" placeholder="문의 제목 (선택)" value={subject} onChange={(e) => setSubject(e.target.value)} />

              <label className="cv-field-label cv-required">문의 내용</label>
              <textarea className="cv-input" placeholder="문의하실 내용을 자유롭게 작성해주세요." value={message} onChange={(e) => setMessage(e.target.value)}
                style={{ minHeight: 140, resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }} />

              <button className="cv-btn-primary" style={{ marginTop: 16, width: "100%" }} disabled={submitting} onClick={handleSubmit}>
                {submitting ? "접수 중..." : "문의 보내기"}
              </button>
              <p style={{ fontSize: 12, color: "#999", textAlign: "center", marginTop: 10 }}>
                접수 후 평일 기준 1~2일 내에 이메일로 답변드립니다.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
