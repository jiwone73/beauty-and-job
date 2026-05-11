"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
export default function PartnershipPage() {
  const [form, setForm] = useState({ company: "", name: "", email: "", content: "" });
  const [done, setDone] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDone(true);
  };
  return (
    <div className="info-page">
      <header className="info-header">
        <Link href="/"><Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={30} priority /></Link>
      </header>
      <div className="info-nav">
        <Link href="/about" className="info-nav-item">회사 소개</Link>
        <Link href="/about/recruit" className="info-nav-item">채용</Link>
        <Link href="/about/partnership" className="info-nav-item active">제휴 문의</Link>
        <Link href="/about/advertise" className="info-nav-item">광고 문의</Link>
        <Link href="/about/contact" className="info-nav-item">기타 문의</Link>
      </div>
      <main className="info-main">
        <div className="info-hero">
          <h1 className="info-hero-title">제휴 문의</h1>
          <p className="info-hero-desc">뷰티앤잡과 함께 성장할 파트너사를 환영합니다.</p>
        </div>
        {done ? (
          <div className="info-section" style={{textAlign:"center",padding:"48px 0"}}>
            <div style={{fontSize:"48px",marginBottom:"16px"}}>✅</div>
            <h2 style={{borderBottom:"none"}}>문의가 접수되었습니다</h2>
            <p>담당자 확인 후 <strong>{form.email}</strong>으로 연락드릴게요.</p>
          </div>
        ) : (
          <div className="info-section">
            <h2>문의 양식</h2>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="contact-form-row"><label>회사명 *</label><input required placeholder="회사명을 입력해주세요" value={form.company} onChange={e=>setForm({...form,company:e.target.value})} /></div>
              <div className="contact-form-row"><label>담당자명 *</label><input required placeholder="담당자 성함을 입력해주세요" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
              <div className="contact-form-row"><label>이메일 *</label><input type="email" required placeholder="답변 받으실 이메일" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
              <div className="contact-form-row"><label>문의 내용 *</label><textarea required placeholder="제휴 관련 문의 내용을 자유롭게 입력해주세요" value={form.content} onChange={e=>setForm({...form,content:e.target.value})} /></div>
              <button type="submit" className="contact-submit-btn">문의 보내기</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
