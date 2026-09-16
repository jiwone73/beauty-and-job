"use client";

import { useEffect, useState } from "react";
import { FileText, Monitor, Users, ChevronRight, UserPlus, CheckCircle2 } from "lucide-react";
import { 플랜, 스타트 } from "@/lib/companyPlans";

/**
 * 오픈이벤트 안내 한 장.
 *
 * 흐름은 배너 → 혜택 → 참여 방법 → 노출 자리 → 유의사항이다. 한때 같은 것을
 * 표로 한 번 더 적고 부르는 띠를 두 개 두었는데, 혜택 카드가 이미 다 말하고
 * 있어 표는 요약이 아니라 반복이었다. 누를 곳은 배너의 단추 하나로 족하다.
 *
 * 내용은 공지(type=event, target=company)에서 받아 온다. 이벤트가 바뀌면
 * 공지만 고치고, 끝나면 공지를 내리면 된다.
 */

/** 캡처에서 배너가 선 자리(%) */
const 메인자리 = { 위: 6.3, 높이: 16.3, 왼: 2.5, 오: 2.6 };
const 목록자리 = { 위: 6.1, 높이: 12.0, 왼: 19.1, 오: 2.6 };

const 참여 = [
  { Icon: UserPlus, 머리: "기업회원으로 가입합니다.", 글: "이벤트 기간 안에 가입하셔야 합니다." },
  { Icon: FileText, 머리: "채용공고를 등록합니다.", 글: "건수 제한 없이 올리실 수 있습니다." },
  { Icon: CheckCircle2, 머리: "신청은 따로 없습니다.", 글: "올리시는 순간 이벤트 혜택이 적용됩니다." },
];

type 공지 = { id: string; title: string; target?: string | null };

export default function EventDetail({ 머리숨김 = false }: {
  /** 제목을 세우지 않는다 — 기업 서비스 첫 화면처럼 배너가 이미 말한 자리용 */
  머리숨김?: boolean;
}) {
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

  if (!것) return <p className="pi-none-msg">진행 중인 이벤트가 없습니다.</p>;

  // 빈 줄로 나뉜 덩이가 한 단위. 「■」로 시작하면 혜택 하나다.
  const 덩이 = 본문.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const 혜택 = 덩이.filter((p) => p.startsWith("■")).map((p) => {
    const 줄 = p.split("\n").map((l) => l.trim()).filter(Boolean);
    return { 이름: 줄[0].replace(/^■\s*/, ""), 글: 줄.slice(1).join(" ") };
  });
  const 여는말 = !덩이[0]?.startsWith("■") ? 덩이[0] : "";
  const 맺는말 = 덩이.length > 1 && !덩이[덩이.length - 1].startsWith("■") ? 덩이[덩이.length - 1] : "";

  const 혜택아이콘 = [FileText, Monitor, Users];

  return (
    <div className="ev">
      {!머리숨김 && (
        <div className="pi-hd">
          <h2 className="pi-nm">{것.title}</h2>
          {여는말 && <p className="pi-ln">{여는말}</p>}
        </div>
      )}

      {/* ── 혜택 ── 표보다 먼저 온다. 「그래서 뭘 주는데」가 첫 물음이다. */}
      <section className="ev-sec">
        <p className="ev-kicker">EVENT BENEFIT</p>
        <h3 className="ev-h">지금 시작하면, <b>이런 혜택이 있어요</b></h3>
        <div className="ev-cards">
          {혜택.map((b, i) => {
            const I = 혜택아이콘[i] ?? Users;
            return (
              <div key={b.이름} className="ev-card">
                <span className="ev-card-ic"><I size={26} strokeWidth={1.7} /></span>
                <b>{b.이름}</b>
                <p>{b.글}</p>
              </div>
            );
          })}
          {맺는말 && (
            <div className="ev-card">
              <span className="ev-card-ic"><CheckCircle2 size={26} strokeWidth={1.7} /></span>
              <b>지금이 기회</b>
              <p>{맺는말}</p>
            </div>
          )}
        </div>
      </section>

      <section className="ev-sec">
        <h3 className="ev-h">이벤트 <b>참여 방법</b></h3>
        <div className="ev-steps">
          {참여.map(({ Icon, 머리, 글 }, i) => (
            <div key={머리} className="ev-step">
              <span className="ev-step-ic"><Icon size={26} strokeWidth={1.7} /></span>
              <div>
                <span className="ev-step-no">STEP {String(i + 1).padStart(2, "0")}</span>
                <b>{머리}</b>
                <p>{글}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ev-sec">
        <h3 className="ev-h">노출 위치</h3>
        <p className="ev-sub">메인과 검색 상단에 노출되어 더 많은 지원자에게 보입니다</p>
        <table className="pi-spot">
          <thead><tr><th>메인 페이지</th><th>채용공고 페이지 (검색·목록)</th></tr></thead>
          <tbody>
            <tr>
              <td>
                <div className="pi-list">
                  <img src="/images/plans/ad-main-slot.png" alt="메인 페이지" />
                  <div className="pi-zone on" style={{ top: `${메인자리.위}%`, height: `${메인자리.높이}%`,
                                                       left: `${메인자리.왼}%`, right: `${메인자리.오}%` }}>
                    <span className="pi-bub">오픈이벤트 채용관</span>
                  </div>
                </div>
              </td>
              <td>
                <div className="pi-list">
                  <img src="/images/plans/ad-jobs-slot.png" alt="채용공고 목록" />
                  <div className="pi-zone on" style={{ top: `${목록자리.위}%`, height: `${목록자리.높이}%`,
                                                       left: `${목록자리.왼}%`, right: `${목록자리.오}%` }}>
                    <span className="pi-bub">검색 결과 상단</span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="ev-sec">
        <h3 className="ev-h">유의사항</h3>
        <ul className="pi-warn">
          <li>이벤트 기간 안에 기업회원으로 가입하고 공고를 등록하신 곳만 대상입니다.</li>
          <li>1개월은 첫 공고를 등록하신 날부터 셉니다. 가입만 하시면 시작되지 않습니다.</li>
          <li>
            무료로 드리는 것은 유료 상품인 {플랜.LIGHT.name}입니다 — {스타트.name} 회원의{" "}
            {스타트.게재일}일 무료 체험 대신 적용됩니다.
          </li>
          <li>오픈이벤트 채용관은 정해진 칸을 차례로 교대하며, 먼저 올리신 순서대로 앞자리에 섭니다.</li>
          <li>
            1개월이 끝나면 {스타트.name}으로 돌아가며 걸어 두신 공고는 게재가 끝납니다.
            계속 걸어 두시려면 {플랜.LIGHT.name}부터 신청하시면 됩니다.
          </li>
          <li>이벤트는 사정에 따라 미리 알리고 바뀌거나 일찍 끝날 수 있습니다.</li>
        </ul>
      </section>

    </div>
  );
}
