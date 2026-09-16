"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, ChevronRight } from "lucide-react";

/**
 * 히어로 맨 위에 서는 오픈이벤트 한 줄.
 *
 * 블록으로 히어로 아래에 두었더니 스크롤해야 보였다. 지금 상품을 살 이유가
 * 이벤트인데 첫 화면에 없으면 없는 것과 같다.
 *
 * 한 줄이라 혜택을 다 담지 못한다. 담지 않는다 — 히어로가 할 일은 눌러 보게
 * 만드는 것이고, 무엇을 주는지는 이벤트 페이지가 맡는다.
 *
 * 문구는 공지(type=event, target=company)의 짧은 제목에서 온다. 이벤트가
 * 끝나면 공지에서 내리기만 하면 이 줄이 통째로 사라진다.
 */
type 공지 = { id: string; title: string; short_title?: string | null; target?: string | null };

export default function EventPill() {
  const [것, set것] = useState<공지 | null>(null);

  useEffect(() => {
    fetch("/api/notices?type=event").then((r) => r.json())
      .then((r) => {
        const list: 공지[] = r?.success && Array.isArray(r.data) ? r.data : [];
        set것(list.find((n) => n.target === "company" || n.target === "all") ?? null);
      }).catch(() => {});
  }, []);

  if (!것) return null;

  return (
    <Link href="/company/plans/event" className="cs-evtpill">
      <Gift size={15} />
      <b>오픈이벤트</b>
      <span>{것.short_title || 것.title}</span>
      <ChevronRight size={15} />
    </Link>
  );
}
