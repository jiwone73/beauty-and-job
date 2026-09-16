"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift } from "lucide-react";
import { 플랜, 스타트 } from "@/lib/companyPlans";

/**
 * 오픈이벤트 안내 — 상품 상세와 같은 틀로 적는다.
 *
 * 지금 라이트를 살 이유가 「이벤트로 한 달 공짜」인데, 그 설명이 이벤트
 * 페이지의 접힌 줄 뒤에 있으면 상품 페이지에서 결심한 사람이 한 번 더
 * 눌러야 한다. 상품 옆에 상품처럼 세워 둔다.
 *
 * 내용은 공지(type=event, target=company)에서 받아 온다 — 이벤트가 바뀌면
 * 공지만 고친다. 여기 박아 두면 바뀌는 날 이 화면이 남는다.
 */

/** 메인 화면(main-event.png)에서 오픈이벤트 채용관이 선 자리(%). */
const 이벤트자리 = { 위: 33.4, 높이: 33.1 };

type 공지 = { id: string; title: string; target?: string | null };

export default function EventDetail({ 안쪽 = false, 머리숨김 = false }: {
  /** 대시보드 안이면 단추가 「공고 등록하기」, 밖이면 「기업회원 가입하기」 */
  안쪽?: boolean;
  /** 제목을 세우지 않는다 — 기업 서비스 첫 화면처럼 배너가 이미 말한 자리용 */
  머리숨김?: boolean;
}) {
  const [것, set것] = useState<공지 | null>(null);
  const [본문, set본문] = useState("");

  useEffect(() => {
    let 살아있음 = true;
    fetch("/api/notices?type=event").then((r) => r.json())
      .then((r) => {
        const list: 공지[] = r?.success && Array.isArray(r.data) ? r.data : [];
        const 찾음 = list.find((n) => n.target === "company" || n.target === "all") ?? null;
        if (!살아있음) return;
        set것(찾음);
        if (!찾음) return;
        return fetch(`/api/notices/${찾음.id}`).then((x) => x.json())
          .then((x) => { if (살아있음 && x?.success) set본문(String(x.data?.body || "")); });
      }).catch(() => {});
    return () => { 살아있음 = false; };
  }, []);

  // 빈 줄로 나뉜 덩이가 한 단위. 「■」로 시작하면 혜택 하나다.
  const 덩이 = 본문.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const 혜택 = 덩이.map((p) => {
    const 줄 = p.split("\n").map((l) => l.trim()).filter(Boolean);
    return 줄[0].startsWith("■")
      ? { 머리: 줄[0].replace(/^■\s*/, ""), 글: 줄.slice(1).join(" ") }
      : { 머리: null, 글: 줄.join(" ") };
  });
  const 여는말 = 혜택.find((b) => !b.머리 && 혜택.indexOf(b) === 0)?.글 ?? "";
  const 항목들 = 혜택.filter((b) => b.머리);
  const 맺는말 = 혜택.length > 1 && !혜택[혜택.length - 1].머리 ? 혜택[혜택.length - 1].글 : "";

  if (!것) {
    return <p className="pi-none-msg">진행 중인 이벤트가 없습니다.</p>;
  }

  return (
    <div className="pi">
      {!머리숨김 && (
        <div className="pi-hd">
          <h2 className="pi-nm">{것.title}</h2>
          {여는말 && <p className="pi-ln">{여는말}</p>}
        </div>
      )}

      <section className="pi-sec">
        <h3 className="pi-st">혜택</h3>
        <table className="pi-tb">
          <tbody>
            {항목들.map((b) => (
              <tr key={b.머리!}><th>{b.머리}</th><td>{b.글}</td></tr>
            ))}
            {맺는말 && <tr><th>기간</th><td>{맺는말}</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="pi-sec">
        <h3 className="pi-st">참여 방법</h3>
        <ol className="pi-step">
          <li><b>기업회원으로 가입합니다.</b> 이벤트 기간 안에 가입하셔야 합니다.</li>
          <li><b>채용공고를 등록합니다.</b> 건수 제한은 없습니다.</li>
          <li>
            <b>신청은 따로 없습니다.</b> 공고를 올리시면 1개월 무제한 등록이 바로
            적용되고, 먼저 올리신 순서대로 노출됩니다.
          </li>
        </ol>
        <div className="pi-buy">
          <p className="pi-buy-l">
            1개월 무제한 공고등록
            <b>0원</b>
            <i>{플랜.LIGHT.name} 상품 · 이벤트 기간 한정</i>
          </p>
          <Link href={안쪽 ? "/company/dashboard/jobs/new" : "/company/signup"} className="pi-btn">
            {안쪽 ? "공고 등록하기" : "기업회원 가입하기"}
          </Link>
        </div>
      </section>

      <section className="pi-sec">
        <h3 className="pi-st">노출 위치</h3>
        <table className="pi-spot">
          <thead>
            <tr><th>메인 페이지</th><th>채용공고 페이지 (검색·목록)</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className="pi-list">
                  <img src="/images/plans/main-event.png" alt="메인 페이지 오픈이벤트 채용관" />
                  <div className="pi-zone on" style={{ top: `${이벤트자리.위}%`, height: `${이벤트자리.높이}%` }}>
                    <span className="pi-bub">오픈이벤트 채용관 · 맨 위</span>
                  </div>
                </div>
              </td>
              <td>
                <div className="pi-list">
                  <img src="/images/plans/list-full.png" alt="전체 채용공고 목록 화면" />
                  <div className="pi-zone on" style={{ top: "9.2%", height: "14.8%" }}>
                    <span className="pi-bub">먼저 올리신 순서대로 상단</span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="pi-cap">
          이벤트 기간에는 {스타트.name}·{플랜.LIGHT.name}도 메인 「오픈이벤트 채용관」에 섭니다.
          이벤트가 끝나면 이 자리는 없어지고, 메인 공고 노출은 {플랜.STANDARD.name}부터입니다.
        </p>
      </section>

      <section className="pi-sec">
        <h3 className="pi-st">유의사항</h3>
        <ul className="pi-warn">
          <li>이벤트 기간 안에 가입하고 공고를 등록하신 곳만 대상입니다.</li>
          <li>
            1개월은 첫 공고를 등록하신 날부터 셉니다. 가입만 하고 공고를 올리지
            않으시면 시작되지 않습니다.
          </li>
          <li>
            무료로 드리는 것은 유료 상품인 {플랜.LIGHT.name}입니다 — {스타트.name} 회원의
            {스타트.게재일}일 무료 체험 대신 적용됩니다.
          </li>
          <li>오픈이벤트 채용관은 정해진 칸을 차례로 교대하며, 먼저 올리신 순서대로 앞자리에 섭니다.</li>
          <li>
            1개월이 끝나면 {스타트.name}으로 돌아가며, 걸어 두신 공고는 게재가 끝납니다.
            계속 걸어 두시려면 {플랜.LIGHT.name}부터 신청하시면 됩니다.
          </li>
        </ul>
      </section>
    </div>
  );
}
