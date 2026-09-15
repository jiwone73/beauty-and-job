"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * 파는 배너 자리.
 *
 * 걸린 것이 없으면 **아무것도 그리지 않는다**. 빈 자리를 「광고 문의」 같은 것으로
 * 채워 두면 아직 안 팔렸다는 사실이 화면에 늘 적혀 있는 셈이다.
 *
 * `group` 은 지금 고른 직군이다. 직군에 맞는 배너가 있으면 그것이 먼저 나온다 —
 * 헤어를 보는 사람에게 헤어 광고를 거는 자리가 이것이다.
 */
type 배너 = { image: string; href?: string; alt?: string };

export default function AdBanner({ slot, group, className }: {
  slot: "main" | "jobs";
  group?: string;
  className?: string;
}) {
  const [것, set것] = useState<배너 | null>(null);

  useEffect(() => {
    const q = new URLSearchParams({ slot, ...(group ? { group } : {}) });
    fetch(`/api/ads/banner?${q}`)
      .then((r) => r.json())
      .then((r) => set것(r?.data?.image ? r.data : null))
      .catch(() => set것(null));
  }, [slot, group]);

  if (!것) return null;

  const 그림 = <img className="ad-banner-img" src={것.image} alt={것.alt || "광고"} loading="lazy" />;
  return (
    <div className={`ad-banner${className ? ` ${className}` : ""}`}>
      {것.href ? <Link href={것.href} className="ad-banner-a">{그림}</Link> : 그림}
      {/* 표시 의무 — 판 자리라는 것을 밝힌다. */}
      <span className="ad-banner-tag">광고</span>
    </div>
  );
}
