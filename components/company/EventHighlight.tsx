"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, ArrowRight } from "lucide-react";

/**
 * 기업 서비스 첫 화면의 오픈이벤트 블록.
 *
 * 한 줄짜리 띠(EventBand)와 이벤트 안내 한 장(EventDetail) 사이다. 지금 상품을
 * 살 이유가 이벤트라 소개 화면에서 두 번째로 서는데, 한 줄만 적으면 무엇을
 * 주는지 모르고 한 장을 다 펼치면 소개 화면이 이벤트 화면이 된다 — 혜택
 * 이름과 한 줄까지만 보이고 나머지는 이벤트 페이지가 맡는다.
 *
 * 문구는 공지(type=event, target=company)에서 받아 온다. 이벤트가 끝나면
 * 공지에서 내리기만 하면 이 블록이 통째로 사라진다.
 */
type 공지 = { id: string; title: string; target?: string | null };

export default function EventHighlight() {
  const [것, set것] = useState<공지 | null>(null);
  const [본문, set본문] = useState("");

  useEffect(() => {
    let 산다 = true;
    fetch("/api/notices?type=event").then((r) => r.json())
      .then((r) => {
        const list: 공지[] = r?.success && Array.isArray(r.data) ? r.data : [];
        const 찾음 = list.find((n) => n.target === "company" || n.target === "all") ?? null;
        if (!산다) return;
        set것(찾음);
        if (!찾음) return;
        return fetch(`/api/notices/${찾음.id}`).then((x) => x.json())
          .then((x) => { if (산다 && x?.success) set본문(String(x.data?.body || "")); });
      }).catch(() => {});
    return () => { 산다 = false; };
  }, []);

  if (!것) return null;

  // 「■」로 시작하는 덩이가 혜택 하나다. 첫 줄이 이름이고 나머지가 설명인데,
  // 여기서는 이름과 첫 문장까지만 쓴다.
  const 혜택 = 본문.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.startsWith("■"))
    .map((p) => {
      const 줄 = p.split("\n").map((l) => l.trim()).filter(Boolean);
      const 글 = 줄.slice(1).join(" ");
      return { 이름: 줄[0].replace(/^■\s*/, ""), 글: 글.split(". ")[0] + (글.includes(". ") ? "." : "") };
    });

  return (
    <section className="cs-evt">
      <p className="cs-evt-tag"><Gift size={15} />오픈이벤트</p>
      <h2 className="cs-evt-t">{것.title}</h2>
      {혜택.length > 0 && (
        <div className="cs-evt-list">
          {혜택.map((b) => (
            <div key={b.이름} className="cs-evt-item">
              <b>{b.이름}</b>
              <span>{b.글}</span>
            </div>
          ))}
        </div>
      )}
      <Link href="/company/plans/event" className="cs-btn-fill lg">
        이벤트 자세히 보기 <ArrowRight size={16} />
      </Link>
    </section>
  );
}
