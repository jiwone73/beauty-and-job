"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, ChevronRight } from "lucide-react";

/**
 * 지금 하는 이벤트 한 줄.
 *
 * 한때 본문을 통째로 펼쳐 두었는데, 오픈이벤트가 제 페이지를 갖게 되면서
 * 같은 글이 두 곳에 실렸다. 여기서는 「지금 이런 게 있다」까지만 말하고
 * 나머지는 그 페이지가 맡는다.
 *
 * 문구는 공지사항에서 받아 온다(type=event). 이벤트는 한 달 쓰고 바뀌는 것인데
 * 화면마다 적어 두면 바뀌는 날 몇 군데는 반드시 남는다. 없으면 아무것도 안
 * 그린다 — 이벤트가 끝나면 공지에서 내리기만 하면 된다.
 */
type 공지 = { id: string; title: string; short_title?: string | null; target?: string | null };

export default function EventBand({ 받는쪽 = "company", 안쪽 = false }: {
  /** 이 화면을 보는 사람. 받는 쪽이 다른 이벤트는 걸러 낸다. */
  받는쪽?: "company" | "user";
  /** 대시보드 안이면 안쪽 경로로 보낸다 */
  안쪽?: boolean;
}) {
  const [것, set것] = useState<공지 | null>(null);

  useEffect(() => {
    fetch("/api/notices?type=event")
      .then((r) => r.json())
      .then((r) => {
        const list: 공지[] = r?.success && Array.isArray(r.data) ? r.data : [];
        set것(list.find((n) => !n.target || n.target === "all" || n.target === 받는쪽) ?? null);
      })
      .catch(() => {});
  }, [받는쪽]);

  if (!것) return null;

  // 기업 이벤트는 오픈이벤트 안내로, 개인 이벤트는 이벤트 목록으로 보낸다.
  const 갈곳 = 받는쪽 === "company"
    ? `${안쪽 ? "/company/dashboard" : "/company"}/plans/event`
    : `/event?open=${것.id}`;

  return (
    <Link href={갈곳} className="co-evtband">
      <Gift size={16} />
      <span className="co-evtband-t">{것.title}</span>
      <span className="co-evtband-go">자세히 보기<ChevronRight size={15} /></span>
    </Link>
  );
}
