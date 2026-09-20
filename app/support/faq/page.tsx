"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 누구읽기 } from "@/components/InfoShell";

/** 자주 묻는 질문은 사용가이드 안으로 합쳤다. 옛 링크(북마크·공유된 주소)가
 *  죽지 않게 갈래만 그대로 살려 사용가이드로 돌려보낸다. */
function 판() {
  const router = useRouter();
  const 누구 = 누구읽기(useSearchParams());
  useEffect(() => { router.replace(`/support/guide?누구=${누구}#찾아보기`); }, [router, 누구]);
  return null;
}

export default function FaqPage() {
  return <Suspense fallback={null}><판 /></Suspense>;
}
