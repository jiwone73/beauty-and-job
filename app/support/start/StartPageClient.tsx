"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import InfoShell, { 누구읽기 } from "@/components/InfoShell";
import StartGuide from "@/components/support/StartGuide";

/**
 * 시작하기 — 고객센터 옆줄에는 안 올린다(둘 필요 없다고 판단해 뺐다).
 * 메인 화면 「처음 오셨나요?」 카드에서만 들어온다.
 */
function 껍데기() {
  const 누구 = 누구읽기(useSearchParams());
  return (
    <InfoShell active="/support/start" title="시작하기" 누구={누구}>
      <StartGuide key={누구} 누구={누구} />
    </InfoShell>
  );
}

export default function StartPageClient() {
  return <Suspense fallback={null}><껍데기 /></Suspense>;
}
