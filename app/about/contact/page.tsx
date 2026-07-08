"use client";
import { useState } from "react";
import AboutHeader from "@/components/AboutHeader";
import PrivacyConsent from "@/components/PrivacyConsent";
export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", category: "", content: "" });
  const [done, setDone] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { alert("개인정보 수집 및 이용에 동의해주세요."); return; }
    try {
      await fetch("/api/ads/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_name: form.name,
          email: form.email,
          product: form.category,
          message: form.content,
          type: "기타",
          privacy_agreed: agreed,
        }),
      });
    } catch {}
    setDone(true);
  };

  return (
    <div className="info-page">
      <AboutHeader active="/about/contact" />
      <main className="info-main">
        <div className="info-hero">
          <h1 className="info-hero-title">기타 문의</h1>
          <p className="info-hero-desc">궁금한 점이 있으시면 언제든지 문의해주세요.</p>
        </div>
        {done ? (
          <div className="info-section" style={{textAlign:"center",padding:"48px 0"}}>
            <div style={{fontSize:"48px",marginBottom:"16px"}}>✅</div>
            <h2 style={{borderBottom:"none"}}>문의가 접수되었습니다</h2>
            <p>담당자 확인 후 <strong>{form.email}</strong>으로 2~3 영업일 내 연락드릴게요.</p>
          </div>
        ) : (
          <div className="info-section">
            <h2>문의 양식</h2>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="contact-form-row"><label>이름 *</label><input required placeholder="성함을 입력해주세요" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
              <div className="contact-form-row"><label>이메일 *</label><input type="email" required placeholder="답변 받으실 이메일" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
              <div className="contact-form-row">
                <label>문의 유형 *</label>
                <select required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                  <option value="">선택해주세요</option>
                  <option>서비스 이용 문의</option>
                  <option>계정 관련 문의</option>
                  <option>채용공고 관련 문의</option>
                  <option>기타</option>
                </select>
              </div>
              <div className="contact-form-row"><label>문의 내용 *</label><textarea required placeholder="문의 내용을 입력해주세요" value={form.content} onChange={e=>setForm({...form,content:e.target.value})} /></div>
              <PrivacyConsent agreed={agreed} onChange={setAgreed} items="이름, 이메일, 문의 유형, 문의 내용" />
              <button type="submit" className="contact-submit-btn" disabled={!agreed} style={!agreed ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>문의 보내기</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}