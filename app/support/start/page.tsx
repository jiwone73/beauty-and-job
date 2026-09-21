"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import InfoShell, { 누구읽기 } from "@/components/InfoShell";
import StartGuide from "@/components/support/StartGuide";

/**
 * 시작하기 — 고객센터의 첫 항목.
 *
 * 공지·회원정책·FAQ보다 먼저 온다. 그것들은 「궁금해서 찾아오는」 곳이고
 * 여기는 「처음이라 몰라서 오는」 곳이라, 먼저 알아야 순서가 맞다.
 */
function 껍데기() {
  const 누구 = 누구읽기(useSearchParams());
  return (
    <InfoShell active="/support/start" title="시작하기" 누구={누구}>
      <StartGuide key={누구} 누구={누구} />
    </InfoShell>
  );
}

export default function StartPage() {
  return <Suspense fallback={null}><껍데기 /></Suspense>;
}
