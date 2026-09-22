import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { 스토리공개 } from "@/lib/storiesGate";
import StoriesListClient from "./StoriesListClient";

// 현장이야기는 이번 오픈에서 비공개다(lib/storiesGate.js). 메뉴에서만
// 숨기면 주소를 아는 사람은 그대로 들어올 수 있어, 여기서도 막는다 —
// 공개로 정해지면 스위치 하나로 이 페이지·API·사이트맵이 같이 켜진다.
export const metadata: Metadata = 스토리공개
  ? {
      title: "현장이야기 | 뷰티워크",
      description: "진상 손님부터 독립 고민까지, 공감·꿀팁·정보가 모이는 뷰티 현장 이야기.",
    }
  : { robots: { index: false, follow: false } };

export default function StoriesPage() {
  if (!스토리공개) notFound();
  return <StoriesListClient />;
}
