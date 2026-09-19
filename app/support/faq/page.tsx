"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import InfoShell, { 누구읽기 } from "@/components/InfoShell";
import FaqBoard from "@/components/support/FaqBoard";

/** 자주 묻는 질문 — 목록은 lib/faq.ts 한 곳에서 온다. */
function 판() {
  const 누구 = 누구읽기(useSearchParams());
  // key 를 주어 갈래가 바뀌면 판을 새로 세운다 — 펼쳐 둔 답이 남지 않게.
  return <FaqBoard key={누구} 처음={누구} />;
}

function 껍데기() {
  const 누구 = 누구읽기(useSearchParams());
  return (
    <InfoShell active="/support/faq" title="자주 묻는 질문" 누구={누구}>
      <판 />
    </InfoShell>
  );
}

export default function FaqPage() {
  return <Suspense fallback={null}><껍데기 /></Suspense>;
}
