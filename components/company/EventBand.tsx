"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, ChevronRight } from "lucide-react";

/**
 * 지금 하는 이벤트 한 줄.
 *
 * 문구를 여기 박지 않고 **공지사항에서 받아 온다**(type=event). 이벤트는 한 달
 * 쓰고 바뀌는 것인데 화면마다 적어 두면 바뀌는 날 몇 군데는 반드시 남는다 —
 * 메인 배너도 같은 공지를 읽는다.
 *
 * 없으면 아무것도 안 그린다. 이벤트가 끝나면 공지에서 내리기만 하면 된다.
 */
type 공지 = { id: string; title: string; target?: string | null };

export default function EventBand({ 받는쪽 = "company" }: {
  /** 이 화면을 보는 사람. 받는 쪽이 다른 이벤트는 걸러 낸다. */
  받는쪽?: "company" | "user";
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

  return (
    <Link href={`/event?open=${것.id}`} className="co-evtband">
      <Gift size={16} />
      <span className="co-evtband-t">{것.title}</span>
      <span className="co-evtband-go">자세히<ChevronRight size={15} /></span>
    </Link>
  );
}
