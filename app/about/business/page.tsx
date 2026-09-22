"use client";
import { useState } from "react";
import InfoShell from "@/components/InfoShell";
import AttachFiles from "@/components/AttachFiles";
import { 사업문의유형 } from "@/lib/inquiryTypes";

// 광고·제휴·기타 문의 — 셋 다 기업이 보내는 사업문의라 같은 폼을 쓴다.
// 예전엔 URL이 셋으로 나뉘어 있었는데, 관리자 쪽은 이미 한 함(사업문의)에서
// 유형 하나로만 갈랐다. 화면도 그와 맞춰 하나로 합치고, 유형만 고르게 한다.
export default function BusinessInquiryPage() {
  const [type, setType] = useState<string>(사업문의유형[0]);
  const [form, setForm] = useState({ company: "", name: "", email: "", phone: "", subject: "", content: "" });
  const [done, setDone] = useState(false);
  const [파일들, set파일들] = useState<File[]>([]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const 값 = {
        company_name: form.company,
        contact_name: form.name,
        email: form.email,
        phone: form.phone || null,
        subject: form.subject,
        message: form.content,
        type,
      };
      let 몸통: BodyInit; const 머리: Record<string, string> = {};
      if (파일들.length) {
        const fd = new FormData();
        fd.append("payload", JSON.stringify(값));
        파일들.forEach((f) => fd.append("files", f));
        몸통 = fd;
      } else {
        머리["Content-Type"] = "application/json";
        몸통 = JSON.stringify(값);
      }
      await fetch("/api/ads/inquiry", { method: "POST", headers: 머리, body: 몸통 });
    } catch {}
    setDone(true);
  };
  return (
    <InfoShell active="/about/business" title="사업문의">
      <div className="info-hero">
        <p className="info-hero-desc">광고·제휴 등 사업 관련 문의를 남겨주시면 담당자가 확인 후 연락드릴게요.</p>
      </div>
      {done ? (
        <div className="info-section" style={{ textAlign: "center", padding: "48px 0" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
          <h2 style={{ borderBottom: "none" }}>문의가 접수되었습니다</h2>
          <p>담당자 확인 후 <strong>{form.email}</strong>으로 연락드릴게요.</p>
        </div>
      ) : (
        <div className="info-section">
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-form-row"><label>문의 유형 *</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                {사업문의유형.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="contact-form-grid">
              <div className="contact-form-row"><label>회사명 *</label><input required placeholder="회사명을 입력해주세요" value={form.company} onChange={e=>setForm({...form,company:e.target.value})} /></div>
              <div className="contact-form-row"><label>담당자명 *</label><input required placeholder="담당자 성함을 입력해주세요" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
              <div className="contact-form-row"><label>이메일 *</label><input type="email" required placeholder="답변 받으실 이메일" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
              <div className="contact-form-row"><label>전화번호</label><input type="tel" placeholder="연락 가능한 전화번호 (선택)" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
            </div>
            <div className="contact-form-row"><label>제목 *</label><input required placeholder="어떤 문의인지 한 줄로 적어주세요" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} /></div>
            <div className="contact-form-row"><label>문의 내용 *</label><textarea required placeholder="문의 내용을 자유롭게 입력해주세요" value={form.content} onChange={e=>setForm({...form,content:e.target.value})} /></div>
            <div className="contact-form-row"><label>파일 첨부</label>
              <AttachFiles 파일들={파일들} 바뀜={set파일들} /></div>
            <button type="submit" className="contact-submit-btn">문의 보내기</button>
          </form>
        </div>
      )}
    </InfoShell>
  );
}
