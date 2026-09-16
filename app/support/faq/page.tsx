"use client";
import InfoHeader from "@/components/InfoHeader";
import FaqBoard from "@/components/support/FaqBoard";

/** 자주 묻는 질문 — 목록은 lib/faq.ts 한 곳에서 온다. */
export default function FaqPage() {
  return (
    <div className="info-page">
      <InfoHeader active="/support/faq" />
      <main className="info-main">
        <div className="info-hero">
          <h1 className="info-hero-title">자주 묻는 질문</h1>
          <p className="info-hero-desc">궁금한 점을 빠르게 해결해 보세요.</p>
        </div>
        <div className="info-section">
          <FaqBoard />
        </div>
      </main>
    </div>
  );
}
