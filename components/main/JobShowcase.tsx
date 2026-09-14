"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Crown, Star } from "lucide-react";
import JobCard from "@/components/JobCard";
import { mapJob } from "@/lib/jobCard";
import { 메인롤링, 메인칸, 칸수 } from "@/lib/companyPlans";

/**
 * 메인 채용관 — 프리미엄 4칸, 스탠다드 5칸.
 *
 * 화살표도 전체보기도 없다. 칸은 고정이고 5초마다 안에 든 것이 바뀐다.
 * 뒤로 밀리는 자리가 아니라 돌아가며 서는 자리다.
 *
 * 노출 수는 실제로 뜬 것만 센다. 바뀔 때마다 서버를 부르면 방문자 한 사람이
 * 1분에 열두 번 부르므로, 모아 두었다가 20초에 한 번 · 화면을 떠날 때 보낸다.
 */

type Props = { tier: "PREMIUM" | "STANDARD"; title: string;
  /** 다른 자리에 이미 뜬 공고 — 빈 칸을 채울 때 뺀다. null 이면 아직 모른다. */
  excludeIds?: string[] | null;
  onLoaded?: (ids: string[]) => void };

export default function JobShowcase({ tier, title, excludeIds, onLoaded }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [slots, setSlots] = useState(칸수(tier));
  const [cols, setCols] = useState<number>(메인칸[tier].열);
  const [바퀴, set바퀴] = useState(0);
  const 모은것 = useRef<string[]>([]);

  useEffect(() => {
    if (excludeIds === null) return;  // 겹치는지 알기 전에 먼저 쏘면 걸러줄 게 없다
    const ex = excludeIds?.length ? `&exclude=${excludeIds.join(",")}` : "";
    fetch(`/api/jobs/showcase?tier=${tier}${ex}`).then((r) => r.json())
      .then((r) => {
        if (!r?.success) return;
        const list = r.data.items || [];
        setItems(list);
        setSlots(r.data.slots || slots);
        setCols(r.data.cols || cols);
        onLoaded?.(list.map((x: any) => x.id));
      }).catch(() => onLoaded?.([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, excludeIds]);

  const 바퀴수 = items.length > slots ? Math.ceil(items.length / slots) : 1;

  useEffect(() => {
    if (바퀴수 < 2) return;
    const t = setInterval(() => set바퀴((n) => (n + 1) % 바퀴수), 메인롤링);
    return () => clearInterval(t);
  }, [바퀴수]);

  const 보이는것 = items.slice(바퀴 * slots, 바퀴 * slots + slots);

  // 지금 떠 있는 것을 담아 둔다. 채워 넣은 공고(filler)는 판 자리가 아니라 안 센다.
  useEffect(() => {
    for (const j of 보이는것) if (!j.filler) 모은것.current.push(j.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [바퀴, items]);

  useEffect(() => {
    const 보내기 = () => {
      const ids = 모은것.current;
      if (!ids.length) return;
      모은것.current = [];
      const body = JSON.stringify({ ids });
      // 화면을 떠나는 중에는 보통 fetch 가 잘린다.
      if (navigator.sendBeacon) navigator.sendBeacon("/api/jobs/showcase", new Blob([body], { type: "application/json" }));
      else fetch("/api/jobs/showcase", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
    };
    const t = setInterval(보내기, 20000);
    const 떠날때 = () => { if (document.visibilityState === "hidden") 보내기(); };
    document.addEventListener("visibilitychange", 떠날때);
    window.addEventListener("pagehide", 보내기);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", 떠날때);
      window.removeEventListener("pagehide", 보내기);
      보내기();
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className={`section showcase-sec${tier === "PREMIUM" ? " top" : ""}`}>
      <div className="container">
        <div className="showcase-head">
          <h2 className="showcase-title">
            {tier === "PREMIUM"
              ? <Crown size={22} className="title-icon" />
              : <Star size={22} className="title-icon" />}
            {title}
          </h2>
          <Link href="/company/plans" className="see-all">상품안내 ›</Link>
        </div>
        <div className={`card-grid card-grid-${cols}`}>
          {보이는것.map((j) => <JobCard key={j.id} data={mapJob(j)} variant="grid" />)}
        </div>
      </div>
    </section>
  );
}
