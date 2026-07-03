"use client";
import { useState } from "react";
import Image from "next/image";
import AboutHeader from "@/components/AboutHeader";
export default function AdvertisePage() {
  const [form, setForm] = useState({ company: "", name: "", email: "", content: "" });
  const [done, setDone] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/ads/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: form.company,
          contact_name: form.name,
          email: form.email,
          message: form.content,
          type: "광고",
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
        <div className="info-values" style={{marginBottom:"40px"}}>
          {[{icon:"🎯",title:"타겟 광고",desc:"뷰티 업계 종사자에게 직접 도달"},{icon:"📊",title:"높은 효율",desc:"업계 특화 플랫폼의 높은 전환율"},{icon:"💄",title:"브랜드 노출",desc:"메인/채용공고 등 다양한 지면"},{icon:"📈",title:"성과 분석",desc:"광고 효과 리포트 제공"}].map(v=>(
            <div key={v.title} className="info-value-card"><span className="info-value-icon">{v.icon}</span><h3>{v.title}</h3><p>{v.desc}</p></div>
          ))}
        </div>
        {done ? (
          <div className="info-section" style={{textAlign:"center",padding:"48px 0"}}>
            <div style={{fontSize:"48px",marginBottom:"16px"}}>✅</div>
            <h2 style={{borderBottom:"none"}}>문의가 접수되었습니다</h2>
            <p>담당자 확인 후 <strong>{form.email}</strong>으로 연락드릴게요.</p>
          </div>
        ) : (
          <div className="info-section">
            <h2>광고 문의 양식</h2>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="contact-form-row"><label>회사명 *</label><input required placeholder="회사명" value={form.company} onChange={e=>setForm({...form,company:e.target.value})} /></div>
              <div className="contact-form-row"><label>담당자명 *</label><input required placeholder="담당자 성함" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
              <div className="contact-form-row"><label>이메일 *</label><input type="email" required placeholder="답변 받으실 이메일" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
              <div className="contact-form-row"><label>문의 내용 *</label><textarea required placeholder="광고 관련 문의 내용을 입력해주세요" value={form.content} onChange={e=>setForm({...form,content:e.target.value})} /></div>
              <button type="submit" className="contact-submit-btn">문의 보내기</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
