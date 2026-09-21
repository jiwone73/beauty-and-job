"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 오픈일글 } from "@/lib/launchPlan";

/**
 * 광고가 안 걸렸을 때 그 자리에 서는 뷰티워크 배너.
 *
 * 메인과 채용공고가 같은 것을 쓴다 — 문구를 두 곳에 적어 두면 한쪽만 고쳐져
 * 같은 배너가 화면마다 다른 말을 하게 된다.
 *
 * 채용공고에서는 한 단 낮게 선다(작게) — 그 화면의 주인공은 공고 목록이라
 * 메인과 같은 키로 서면 목록을 아래로 밀어낸다.
 *
 * 눌러서 가는 곳은 기업 서비스 소개(/company)다. 배너가 파는 것은 「공고를
 * 올리세요」이고, 올릴 마음이 든 사람에게 필요한 것은 공지 글이 아니라
 * 상품과 등록 단추가 있는 화면이다.
 */
export default function HeroBanner({ 문구, 작게 }: { 문구?: string; 작게?: boolean }) {
  // 메인은 이미 받아 둔 이벤트 문구를 넘긴다. 넘어오지 않으면 스스로 받아온다.
  const [받은문구, set받은문구] = useState<string | null>(null);
  useEffect(() => {
    if (문구) return;
    fetch("/api/notices")
      .then((r) => r.json())
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        const 이벤트들 = list.filter((n: any) => n.type === "event");
        const 것 = 이벤트들.find((n: any) => n.target === "user" || n.target === "all") || 이벤트들[0];
        set받은문구(것?.short_title || 것?.title || null);
      })
      .catch(() => {});
  }, [문구]);

  const 아래 = 문구 || 받은문구
    || `${오픈일글()} 오픈 · 채용공고와 이력서 등록을 무료로 이용하세요.`;

  // 채용공고 쪽만 띠 배너다 — 옆 사이드 매장·오피스 탭 높이에 맞춘
  // 얇은 자리라 메인의 큰 배너와는 다른 짜임을 쓴다.
  if (작게) {
    return (
      <Link href="/company" className="mt-hero sm" aria-label="뷰티워크 오픈 이벤트">
        <span className="mt-hero-shine" aria-hidden="true" />
        <span className="mt-eyebrow">BEAUTYWORK OPEN</span>
        <span className="mt-hero-sub">{아래}</span>
      </Link>
    );
  }

  return (
    <Link href="/company" className="mt-hero">
      <span className="mt-hero-photo" />
      <span className="mt-hero-in">
        <span className="mt-eyebrow">BEAUTYWORK OPEN</span>
        <span className="mt-hero-h">뷰티 커리어의 시작,<br /><b>뷰티워크</b></span>
        <span className="mt-hero-sub">{아래}</span>
      </span>
    </Link>
  );
}
