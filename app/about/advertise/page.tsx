"use client";
import { useState } from "react";
import Image from "next/image";
import AboutHeader from "@/components/AboutHeader";
import PrivacyConsent from "@/components/PrivacyConsent";
export default function AdvertisePage() {
  const [form, setForm] = useState({ company: "", name: "", email: "", phone: "", content: "" });
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
          company_name: form.company,
          contact_name: form.name,
          email: form.email,
          phone: form.phone || null,
          message: form.content,
          type: "광고",
          privacy_agreed: agreed,
        }),
      });
    } catch {}
    setDone(true);
  };
  return (
    <div className="info-page">
      <AboutHeader active="/about/advertise" />
      <main className="info-main">
        <div className="info-hero">
          <h1 className="info-hero-title">광고 문의</h1>
          <p className="info-hero-desc">뷰티워크의 다양한 광고 상품을 통해 브랜드를 알려보세요.</p>
        </div>
        
        {done ? (
          <div className="info-section" style={{textAlign:"center",padding:"48px 0"}}>
            <div style={{fontSize:"48px",marginBottom:"16px"}}>✅</div>
            <h2 style={{borderBottom:"none"}}>문의가 접수되었습니다</h2>
            <p>담당자 확인 후 <strong>{form.email}</strong>으로 연락드릴게요.</p>
          </div>
        ) : (
          <div className="info-section">
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="contact-form-grid">
                <div className="contact-form-row"><label>회사명 *</label><input required placeholder="회사명" value={form.company} onChange={e=>setForm({...form,company:e.target.value})} /></div>
                <div className="contact-form-row"><label>담당자명 *</label><input required placeholder="담당자 성함" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
                <div className="contact-form-row"><label>이메일 *</label><input type="email" required placeholder="답변 받으실 이메일" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
                <div className="contact-form-row"><label>전화번호</label><input type="tel" placeholder="연락 가능한 전화번호 (선택)" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
              </div>
              <div className="contact-form-row"><label>문의 내용 *</label><textarea required placeholder="광고 관련 문의 내용을 입력해주세요" value={form.content} onChange={e=>setForm({...form,content:e.target.value})} /></div>
              <PrivacyConsent agreed={agreed} onChange={setAgreed} items="회사명, 담당자명, 이메일, 전화번호, 문의 내용" />
              <button type="submit" className="contact-submit-btn" disabled={!agreed} style={!agreed ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>문의 보내기</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
