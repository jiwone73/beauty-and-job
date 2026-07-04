"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";
import InfoHeader from "@/components/InfoHeader";
import InquiryModal from "@/components/support/InquiryModal";

const FAQS = [
  { q: "회원가입은 어떻게 하나요?", a: "상단 '회원가입' 버튼을 클릭하고 휴대폰 인증 후 기본 정보를 입력하시면 됩니다." },
  { q: "이력서는 어떻게 작성하나요?", a: "로그인 후 '이력서' 메뉴에서 각 섹션별로 정보를 입력하실 수 있습니다. 작성한 이력서는 PDF로 다운로드도 가능합니다." },
  { q: "채용공고 지원은 어떻게 하나요?", a: "원하는 채용공고 상세 페이지에서 '지원하기' 버튼을 클릭하면 이력서와 함께 지원할 수 있습니다." },
  { q: "기업 계정은 어떻게 만드나요?", a: "'기업 서비스' 메뉴를 통해 기업 회원 가입을 진행할 수 있습니다. 기업 인증 후 채용공고를 등록하실 수 있습니다." },
  { q: "뉴스레터 수신을 취소하고 싶어요.", a: "수신하신 뉴스레터 하단의 '수신 거부' 링크를 클릭하시거나, 고객센터로 문의해 주세요." },
  { q: "개인정보는 어떻게 관리되나요?", a: "뷰티워크는 개인정보보호법에 따라 안전하게 개인정보를 관리합니다. 자세한 내용은 개인정보처리방침을 확인해주세요." },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button className="faq-question" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && <div className="faq-answer">{a}</div>}
    </div>
  );
}

export default function SupportPage() {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  return (
    <div className="info-page">
      <InfoHeader active="/support" />
      <main className="info-main">
        <div className="info-hero">
          <h1 className="info-hero-title">무엇을 도와드릴까요?</h1>
          <p className="info-hero-desc">뷰티워크 이용 중 궁금한 점이 있으시면 아래에서 확인해보세요.</p>
        </div>
        <div className="support-cards">
          {[
            { icon: "💬", title: "1:1 문의", desc: "접수 후 1~2일 내 답변", action: "문의하기", onClick: () => setInquiryOpen(true) },
            { icon: "📧", title: "이메일 문의", desc: "support@beautywork.co.kr", action: "메일 보내기", onClick: () => { window.location.href = "mailto:support@beautywork.co.kr"; } },
            { icon: "📋", title: "자주 묻는 질문", desc: "빠른 해결책을 찾아보세요", action: "바로가기", onClick: () => { const el = document.querySelector(".faq-list"); el?.scrollIntoView({ behavior: "smooth" }); } },
          ].map((c) => (
            <div key={c.title} className="support-card">
              <span className="support-card-icon">{c.icon}</span>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
              <button className="support-card-btn" onClick={c.onClick}>{c.action}</button>
            </div>
          ))}
        </div>
        <div className="info-section">
          <h2>자주 묻는 질문</h2>
          <div className="faq-list">
            {FAQS.map((faq) => <FaqItem key={faq.q} {...faq} />)}
          </div>
        </div>
      </main>
      <InquiryModal isOpen={inquiryOpen} onClose={() => setInquiryOpen(false)} />
    </div>
  );
}
