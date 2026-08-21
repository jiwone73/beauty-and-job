"use client";
import { Suspense } from "react";
import InfoHeader from "@/components/InfoHeader";
import NoticeBoard from "@/components/NoticeBoard";

/**
 * 공지사항 — 알려야 할 사실만 담는다(점검·약관·정책).
 * 혜택 안내는 성격이 달라 /event 로 갈라 두었다.
 */
export default function NoticePage() {
  return (
    <div className="info-page">
      <InfoHeader active="/notice" />
      <main className="info-main">
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <h1 className="info-page-title">공지사항</h1>
          <Suspense fallback={<p className="nb-board-msg">불러오는 중...</p>}>
            <NoticeBoard type="notice" emptyText="등록된 공지사항이 없습니다." />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
