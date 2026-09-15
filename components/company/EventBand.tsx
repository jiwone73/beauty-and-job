"use client";

import { useEffect, useState } from "react";
import { Gift } from "lucide-react";

/**
 * 지금 하는 이벤트 — 내용을 그대로 펼친다.
 *
 * 한 줄만 적고 「자세히 ›」로 이벤트 페이지에 보내던 때가 있었는데, 무엇을
 * 주는지 알려면 화면을 떠나야 했다. 상품을 고르러 온 사람에게 이벤트는
 * **고르는 데 쓰는 정보**라 그 자리에서 읽혀야 한다.
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
  const [본문, set본문] = useState<string>("");

  useEffect(() => {
    let 살아있음 = true;
    fetch("/api/notices?type=event")
      .then((r) => r.json())
      .then((r) => {
        const list: 공지[] = r?.success && Array.isArray(r.data) ? r.data : [];
        const 찾음 = list.find((n) => !n.target || n.target === "all" || n.target === 받는쪽) ?? null;
        if (!살아있음) return;
        set것(찾음);
        if (!찾음) return;
        return fetch(`/api/notices/${찾음.id}`).then((x) => x.json())
          .then((x) => { if (살아있음 && x?.success) set본문(String(x.data?.body || "")); });
      })
      .catch(() => {});
    return () => { 살아있음 = false; };
  }, [받는쪽]);

  if (!것) return null;

  // 빈 줄로 나뉜 덩이가 하나의 단위다. 「■」로 시작하는 덩이는 혜택 하나이고
  // (첫 줄이 이름), 나머지는 여는 말이나 맺는 말이다.
  //
  // 줄 단위로 가르던 때는 맨 끝의 「이벤트 기간은 …까지입니다」가 바로 위
  // 혜택의 설명으로 딸려 들어갔다. 그 문장은 두 혜택 모두에 걸리는 말이다.
  const 덩이 = 본문.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const 묶음 = 덩이.map((p) => {
    const 줄 = p.split("\n").map((l) => l.trim()).filter(Boolean);
    return 줄[0].startsWith("■")
      ? { 머리: 줄[0].replace(/^■\s*/, ""), 글: 줄.slice(1).join(" ") }
      : { 머리: null, 글: 줄.join(" ") };
  });

  return (
    <section className="co-evt">
      <p className="co-evt-h"><Gift size={16} />{것.title}</p>
      {묶음.map((b, i) => (
        <div key={i} className={b.머리 ? "co-evt-item" : "co-evt-lead"}>
          {b.머리 && <p className="co-evt-nm">{b.머리}</p>}
          <p className="co-evt-t">{b.글}</p>
        </div>
      ))}
    </section>
  );
}
