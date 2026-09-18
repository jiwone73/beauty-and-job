"use client";
import InfoShell from "@/components/InfoShell";
import NoticeBoard from "@/components/NoticeBoard";

/**
 * 공지사항 — 알려야 할 사실만 담는다(점검·약관·정책).
 * 혜택 안내는 성격이 달라 /event 로 갈라 두었다.
 */
export default function NoticePage() {
  return (
    <InfoShell active="/notice" title="공지사항">
      <NoticeBoard emptyText="등록된 글이 없습니다." />
    </InfoShell>
  );
}
