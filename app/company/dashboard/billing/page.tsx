"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CompanyLayout from "@/components/company/CompanyLayout";
import { 플랜, 스타트, 원, type PlanId } from "@/lib/companyPlans";

/**
 * 내 이용권 — 무엇을 언제까지 쓰는가, 그동안 얼마나 노출됐는가, 무엇을 냈는가.
 *
 * 메인 채용관은 자리를 파는 상품이라 노출 횟수가 곧 영수증이다. 숨기면 산 사람은
 * 값이 무엇이었는지 끝내 알 수 없고, 다음에 또 살 이유도 없다.
 */

type 이용권 = {
  plan: PlanId | null; paidUntil: string | null; 남은일: number;
  진행중: number; 노출: number; 게재종료: string | null;
};
type 주문 = {
  id: string; plan: PlanId; days: number; amount: number;
  status: "PENDING" | "PAID" | "CANCELED";
  applied_until: string | null; created_at: string;
};

const 상태이름: Record<주문["status"], string> = {
  PENDING: "입금대기", PAID: "적용됨", CANCELED: "취소",
};

export default function CompanyBillingPage() {
  const [it, setIt] = useState<이용권 | null>(null);
  const [주문들, set주문들] = useState<주문[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const 머리 = { headers: { Authorization: `Bearer ${token}` } };
    fetch("/api/company/me/plan", 머리).then((r) => r.json())
      .then((r) => { if (r?.success) setIt(r.data); }).catch(() => {});
    fetch("/api/company/orders", 머리).then((r) => r.json())
      .then((r) => { if (r?.success && Array.isArray(r.data)) set주문들(r.data); }).catch(() => {});
  }, []);

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
          </div>
          <Link href="/company/plans" className="co-bill-go">
            {it?.plan ? "기간 늘리기" : "이용권 신청"} ›
          </Link>
        </div>

        <div className="co-bill-stats">
          <div><span>진행 중 공고</span><b>{it?.진행중 ?? 0}<i>건</i></b></div>
          <div><span>메인 노출</span><b>{(it?.노출 ?? 0).toLocaleString("ko-KR")}<i>회</i></b></div>
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
                  <td>{o.days}일</td>
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
