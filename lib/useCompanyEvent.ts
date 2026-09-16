"use client";

import { useEffect, useState } from "react";

/**
 * 지금 기업에게 하는 이벤트 하나.
 *
 * 화면 여러 곳이 같은 공지를 따로 불러오고 있었다(띠·블록·히어로). 부르는
 * 곳마다 거르는 규칙을 다시 적으면 한쪽만 고쳐지는 날이 온다.
 *
 * 없으면 null. 이벤트가 끝나 공지를 내리면 그것을 쓰는 자리가 저절로 원래
 * 모습으로 돌아간다 — 코드를 다시 손대지 않는다.
 */
export type 기업이벤트 = {
  id: string;
  title: string;
  /** 좁은 자리에 거는 짧은 제목. 없으면 title */
  short_title?: string | null;
  target?: string | null;
};

export function useCompanyEvent() {
  const [것, set것] = useState<기업이벤트 | null>(null);

  useEffect(() => {
    let 산다 = true;
    fetch("/api/notices?type=event")
      .then((r) => r.json())
      .then((r) => {
        if (!산다) return;
        const list: 기업이벤트[] = r?.success && Array.isArray(r.data) ? r.data : [];
        set것(list.find((n) => n.target === "company" || n.target === "all") ?? null);
      })
      .catch(() => {});
    return () => { 산다 = false; };
  }, []);

  return 것;
}
