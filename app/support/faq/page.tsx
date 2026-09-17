"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import InfoHeader from "@/components/InfoHeader";
import InfoSide from "@/components/InfoSide";
import FaqBoard from "@/components/support/FaqBoard";

/** 자주 묻는 질문 — 목록은 lib/faq.ts 한 곳에서 온다. */
function 속() {
  const 누구 = useSearchParams().get("누구") === "기업" ? "기업" : "개인";
  return (
    <div className="info-layout">
      <InfoSide active="/support/faq" 아래활성={`${누구}회원`} />
      <div className="info-body">
        <h1 className="info-page-title">자주 묻는 질문</h1>
        <FaqBoard key={누구} 처음={누구} />
      </div>
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className="info-page">
      <InfoHeader />
      <main className="info-main">
        <Suspense fallback={null}><속 /></Suspense>
      </main>
    </div>
  );
}
