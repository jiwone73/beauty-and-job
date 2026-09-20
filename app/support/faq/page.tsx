"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import InfoShell, { 누구읽기 } from "@/components/InfoShell";
import FaqBoard from "@/components/support/FaqBoard";

/**
 * 자주 묻는 질문(FAQ).
 *
 * 한때 STEP 1~4 요약과 함께 「사용가이드」라는 이름으로 묶어 두었다.
 * 그런데 그 요약도 결국 이 판의 질문·답으로 다 흡수됐고, 남는 것은
 * 「이건 어떻게 하나요」에 답하는 이 화면 하나였다 — 이름이 실제로 하는
 * 일과 안 맞으면 FAQ로 부른다.
 */
function 판() {
  const 누구 = 누구읽기(useSearchParams());
  return <FaqBoard key={누구} 처음={누구} />;
}

function 껍데기() {
  const 누구 = 누구읽기(useSearchParams());
  return (
    <InfoShell active="/support/faq" title="FAQ" 누구={누구}>
      <판 />
    </InfoShell>
  );
}

export default function FaqPage() {
  return <Suspense fallback={null}><껍데기 /></Suspense>;
}
