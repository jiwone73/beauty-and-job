"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CompanyLayout from "@/components/company/CompanyLayout";
import { 플랜, 스타트, 원, 보관표기, type PlanId } from "@/lib/companyPlans";

/**
 * 내 이용권 — 무엇을 언제까지 쓰는가, 그동안 얼마나 노출됐는가, 무엇을 냈는가.
 *
 * 메인 채용관은 자리를 파는 상품이라 노출 횟수가 곧 영수증이다. 숨기면 산 사람은
 * 값이 무엇이었는지 끝내 알 수 없고, 다음에 또 살 이유도 없다.
 */

type 이용권 = {
  plan: PlanId | null; paidUntil: string | null; 남은일: number;
  진행중: number; 노출: number; 게재종료: string | null;
  /** 무료로 올릴 수 있는 공고 건수와, 그 중 쓴 것·남은 것 */
  무료건수: number;
  무료쓴것: number;
  무료남은것: number;
  /** 상품별로 세워 둔 기간 */
  보관: { plan: PlanId; name: string; days: number; until: string }[];
  보관가능: boolean;
};
type 주문 = {
  id: string; plan: PlanId; days: number; amount: number;
  status: "PENDING" | "PAID" | "CANCELED";
  /** 이 주문에 얹힌 보관 일수 */
  kept_days: number;
  applied_until: string | null; created_at: string;
};

const 상태이름: Record<주문["status"], string> = {
  PENDING: "입금대기", PAID: "적용됨", CANCELED: "취소",
};

export default function CompanyBillingPage() {
  const [it, setIt] = useState<이용권 | null>(null);
  const [주문들, set주문들] = useState<주문[]>([]);
  const [보관중, set보관중] = useState(false);

  const 불러오기 = () => {
    const token = localStorage.getItem("access_token");
    const 머리 = { headers: { Authorization: `Bearer ${token}` } };
    fetch("/api/company/me/plan", 머리).then((r) => r.json())
      .then((r) => { if (r?.success) setIt(r.data); }).catch(() => {});
    fetch("/api/company/orders", 머리).then((r) => r.json())
      .then((r) => { if (r?.success && Array.isArray(r.data)) set주문들(r.data); }).catch(() => {});
  };
  useEffect(불러오기, []);

  /** 남은 기간을 세워 둔다. 되돌릴 수 없으니 한 번 묻는다. */
  const 보관하기 = async () => {
    if (!it?.plan) return;
    const 답 = confirm(
      `${플랜[it.plan].name} 남은 ${it.남은일}일을 보관합니다.\n` +
      `지금 이용권은 끝나고, ${보관표기} 안에 다시 신청하시면 그만큼 더 붙습니다.\n` +
      `보관한 기간은 환불되지 않습니다.`
    );
    if (!답) return;
    set보관중(true);
    const token = localStorage.getItem("access_token");
    const r = await fetch("/api/company/plan/keep", {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    }).then((x) => x.json()).catch(() => null);
    set보관중(false);
    if (!r?.success) { alert(r?.error?.message || "보관하지 못했습니다."); return; }
    불러오기();
  };

  const 이름 = it?.plan ? 플랜[it.plan].name : 스타트.name;

  return (
    <CompanyLayout activePage="billing">
      <div className="co-bill">
        <div className="co-bill-now">
          <div className="co-bill-plan">
            <span className="co-bill-nm">{이름}</span>
            {it?.plan && it.paidUntil && (
              <span className="co-bill-until">{it.paidUntil}까지 · {it.남은일}일 남음</span>
            )}
            {/* 스타트는 유료가 날짜를 적는 자리에 남은 건수를 적는다. 무료는
                기간이 아니라 건수로 끊기고, 올린 공고는 내려가지 않는다. */}
            {!it?.plan && it && (
              <span className={`co-bill-until${it.무료남은것 <= 0 ? " out" : ""}`}>
                {it.무료남은것 > 0
                  ? <>무료 · 공고 {it.무료건수}건 · 게재기간 <b>{스타트.게재일}일</b> · 재등록 무제한</>
                  : `공고 ${it.무료쓴것}건 노출 중 · 내리시면 새로 올리실 수 있습니다`}
              </span>
            )}
          </div>
          <Link href="/company/plans" className="co-bill-go">
            {it?.plan ? "기간 늘리기" : "이용권 신청"} ›
          </Link>
        </div>

        {it?.보관?.map((k) => (
          <div key={k.plan} className="co-bill-keep">
            <span className="co-bill-keep-l">보관 중</span>
            <b>{k.name} {k.days}일</b>
            <span className="co-bill-keep-t">{k.until}까지 · {k.name}을 다시 신청하실 때 더해집니다</span>
          </div>
        ))}
        {it?.보관가능 && (
          <div className="co-bill-keep on">
            <span className="co-bill-keep-l">남은 기간 보관</span>
            <b>{it.남은일}일</b>
            <span className="co-bill-keep-t">채용이 끝나셨다면 세워 뒀다가 다음 채용 때 쓰실 수 있습니다</span>
            <button type="button" className="co-bill-keep-b" onClick={보관하기} disabled={보관중}>
              {보관중 ? "보관 중…" : "보관하기"}
            </button>
          </div>
        )}

        <div className="co-bill-stats">
          <div><span>진행 중 공고</span><b>{it?.진행중 ?? 0}<i>건</i></b></div>
          <div><span>메인 공고 노출</span><b>{(it?.노출 ?? 0).toLocaleString("ko-KR")}<i>회</i></b></div>
          <div><span>공고 게재</span><b>{it?.게재종료 ? <>{it.게재종료}<i>까지</i></> : <>—</>}</b></div>
        </div>

        <p className="co-bill-h">결제 내역</p>
        {주문들.length === 0 ? (
          <p className="co-bill-empty">아직 신청한 이용권이 없습니다.</p>
        ) : (
          <table className="co-bill-tb">
            <thead>
              <tr><th>신청일</th><th>플랜</th><th>기간</th><th>금액</th><th>상태</th><th>적용</th></tr>
            </thead>
            <tbody>
              {주문들.map((o) => (
                <tr key={o.id}>
                  <td>{o.created_at.slice(0, 10)}</td>
                  <td>{플랜[o.plan]?.name || o.plan}</td>
                  <td>{o.days}일{o.kept_days > 0 && <i className="co-bill-plus">+{o.kept_days}</i>}</td>
                  <td>{원(o.amount)}</td>
                  <td className={o.status === "PENDING" ? "on" : undefined}>{상태이름[o.status]}</td>
                  <td>{o.applied_until ? `${o.applied_until}까지` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </CompanyLayout>
  );
}
