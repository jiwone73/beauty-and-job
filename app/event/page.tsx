"use client";
import { Suspense } from "react";
import Header from "@/components/Header";
import NoticeBoard from "@/components/NoticeBoard";

/**
 * 이벤트·혜택 — 참여를 끄는 제안이다.
 *
 * 고객센터 계열(약관·개인정보처리방침 옆)에 두지 않는다. 거기는 문제를
 * 풀러 오는 곳이라 혜택을 걸어 두면 아무도 보지 않는다. 일반 헤더를 달고
 * 메인에서 들어오게 한다.
 */
export default function EventPage() {
  return (
    <>
      <Header />
      <main className="ev-page">
        <h1 className="ev-title">이벤트·혜택</h1>
        <p className="ev-sub">지금 받을 수 있는 혜택이에요. 제목을 누르면 자세한 내용이 펼쳐집니다.</p>
        <Suspense fallback={<p className="nb-board-msg">불러오는 중...</p>}>
          <NoticeBoard type="event" emptyText="진행 중인 이벤트가 없습니다." />
        </Suspense>
      </main>
    </>
  );
}
