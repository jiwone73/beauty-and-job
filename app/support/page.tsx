"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Megaphone, Download } from "lucide-react";
import InfoHeader from "@/components/InfoHeader";
import InquiryModal from "@/components/support/InquiryModal";
import FaqBoard from "@/components/support/FaqBoard";

/**
 * 고객센터 첫 화면.
 *
 * 묻는 길(1:1·메일)과 스스로 찾는 길(공지·FAQ)을 한 화면에 둔다. 예전에는 문의
 * 카드 셋과 FAQ 여섯 줄이 전부여서, 공지사항이 머리줄 탭에만 있고 여기서는
 * 보이지 않았다 — 점검이나 이벤트 안내를 찾으러 온 사람이 제일 먼저 닿는 곳이
 * 여긴데도 그렇다.
 *
 * FAQ 목록은 lib/faq.ts 한 곳에서 온다. 이 화면과 /support/faq 가 각자 들고
 * 있던 때에는 같은 질문에 답이 서로 달랐다.
 */
type 공지 = { id: string; type: string; title: string; published_at: string | null; created_at: string };

export default function SupportPage() {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [공지들, set공지들] = useState<공지[]>([]);

  useEffect(() => {
    fetch("/api/notices")
      .then((r) => r.json())
      .then((r) => { if (r?.success && Array.isArray(r.data)) set공지들(r.data.slice(0, 4)); })
      .catch(() => {});
  }, []);

  return (
    <div className="info-page">
      <InfoHeader active="/support" />
      <main className="info-main">
        <div className="info-hero">
          <h1 className="info-hero-title">무엇을 도와드릴까요?</h1>
          <p className="info-hero-desc">궁금한 점을 아래에서 찾아보시고, 없으면 물어봐 주세요.</p>
        </div>

        <div className="support-cards">
          {[
            { icon: "💬", title: "1:1 문의", desc: "접수 후 1~2일 내 답변", action: "문의하기",
              onClick: () => setInquiryOpen(true) },
            { icon: "📧", title: "이메일 문의", desc: "support@beautywork.co.kr", action: "메일 보내기",
              onClick: () => { window.location.href = "mailto:support@beautywork.co.kr"; } },
            { icon: "📋", title: "자주 묻는 질문", desc: "찾으시는 답이 여기 있을 수 있어요", action: "바로가기",
              onClick: () => document.querySelector(".faq-board")?.scrollIntoView({ behavior: "smooth" }) },
          ].map((c) => (
            <div key={c.title} className="support-card">
              <span className="support-card-icon">{c.icon}</span>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
              <button className="support-card-btn" onClick={c.onClick}>{c.action}</button>
            </div>
          ))}
        </div>

        {/* 공지 — 점검·이벤트를 찾으러 온 사람이 제일 먼저 닿는 곳이 여기다.
            없으면 자리를 만들지 않는다. */}
        {공지들.length > 0 && (
          <div className="info-section">
            <div className="sup-sec-head">
              <h2><Megaphone size={18} />공지사항</h2>
              <Link href="/notice" className="sup-more">전체 보기<ChevronRight size={15} /></Link>
            </div>
            <ul className="sup-notice">
              {공지들.map((n) => (
                <li key={n.id}>
                  <Link href={n.type === "event" ? `/event?open=${n.id}` : `/notice/${n.id}`}>
                    <i className={n.type === "event" ? "evt" : undefined}>
                      {n.type === "event" ? "이벤트" : "공지"}
                    </i>
                    <span>{n.title}</span>
                    <em>{(n.published_at || n.created_at).slice(0, 10)}</em>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 이력서 서식 — 손으로 쓰거나 인쇄해 가실 분을 위한 빈 양식.
            온라인 이력서를 대신하는 것이 아니라서 아래쪽에 한 줄로만 둔다 —
            위에 크게 걸면 정작 등록하러 온 사람이 파일만 받아 가고 나간다. */}
        <div className="info-section">
          <a className="sup-file" href="/files/뷰티워크-이력서-양식.pdf" download>
            <Download size={20} />
            <span className="sup-file-t">
              <b>미용 이력서 양식 내려받기</b>
              손으로 쓰거나 인쇄해 가실 분을 위한 빈 양식입니다 (PDF · A4 한 장)
            </span>
            <em>받기</em>
          </a>
          <p className="sup-file-n">
            뷰티워크에서 온라인으로 쓰시면 지원까지 한 번에 되고, 매장이 보내는 제안도 받으실 수 있습니다.{" "}
            <Link href="/profile/resume">이력서 쓰러 가기 ›</Link>
          </p>
        </div>

        <div className="info-section">
          <h2>자주 묻는 질문</h2>
          <FaqBoard />
        </div>
      </main>
      <InquiryModal isOpen={inquiryOpen} onClose={() => setInquiryOpen(false)} />
    </div>
  );
}
