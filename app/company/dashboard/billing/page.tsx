"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CompanyLayout from "@/components/company/CompanyLayout";
import { 플랜, 스타트, 원, 보관표기, type PlanId } from "@/lib/companyPlans";

/**
 * 내 이용권 — 무엇을 언제까지 쓰는가, 무엇을 냈는가.
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
  applied_from: string | null; applied_until: string | null;
  /** 입금 확인(=결제 확정) 날짜. 신청일과 달라, 무통장입금은 며칠 뜰 수 있다. */
  confirmed_at: string | null;
  created_at: string;
};

const 상태이름: Record<주문["status"], string> = {
  PENDING: "입금대기", PAID: "적용됨", CANCELED: "취소",
};

// 기간 필터 — 신청이 잦은 서비스가 아니라 데이터 자체가 몇 건 안 된다(구매
// 이력 최대 50건). 셀렉미처럼 직접 날짜를 고르는 달력까지는 과하다 싶어
// 자주 찾는 구간만 단추로 둔다("살짝 뷰티워크에 맞게 바꿔봐").
const 기간필터_목록 = ["전체", "1개월", "3개월", "6개월"] as const;
type 기간필터 = typeof 기간필터_목록[number];
const 기간필터_일수: Record<기간필터, number | null> = {
  전체: null, "1개월": 30, "3개월": 90, "6개월": 180,
};

export default function CompanyBillingPage() {
  const [it, setIt] = useState<이용권 | null>(null);
  const [주문들, set주문들] = useState<주문[]>([]);
  const [보관중, set보관중] = useState(false);
  const [기간, set기간] = useState<기간필터>("전체");

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

  const 일수 = 기간필터_일수[기간];
  const 필터된주문 = 일수 == null ? 주문들
    : 주문들.filter((o) => (Date.now() - new Date(o.created_at).getTime()) / 86400000 <= 일수);
  // 짧은 결제번호 — uuid 그대로 적으면 눈으로 대조할 값이 못 된다.
  const 결제번호 = (id: string) => id.slice(0, 8).toUpperCase();

  return (
    <CompanyLayout activePage="billing">
      <div className="co-bill">
        <div className="co-bill-now">
          <div className="co-bill-plan">
            <span className="co-bill-nm">{이름}</span>
            {it?.plan && it.paidUntil && (
              <span className="co-bill-until">{it.paidUntil}까지 · {it.남은일}일 남음</span>
            )}
            {/* 스타트는 유료가 날짜를 적는 자리에 남은 건수를 적는다. 게재기간은
                무기한이고(2026-10-01), 대신 회원에게만 노출된다. */}
            {!it?.plan && it && (
              <span className={`co-bill-until${it.무료남은것 <= 0 ? " out" : ""}`}>
                {it.무료남은것 > 0
                  ? <>무료 · 공고 {it.무료건수}건 · 게재기간 <b>무기한</b> · 회원에게만 노출</>
                  : <>
                      {/* "공고노출중이 아니잖아" — 그냥 상태만 말하면 왜 막혔는지 안 와닿는다.
                          게재기간이 무기한이라 더는 저절로 안 풀리고, 마감해야 풀린다.
                          "올린다·내린다"는 말도 안 쓴다("올리고 내리고 이런말 쓰지 말고").
                          말투는 합니다체가 아니라 해요체로 — 격식체가 아니라 업무용어가
                          핵심이었다("너무 부자연스러워", "격식체를 쓰라는게 아니라
                          업무용어를 쓰라는거야"). */}
                      공고 {it.무료건수}건을 이미 올려 두셔서 지금은 새로 등록할 수 없어요. 그 공고를
                      마감하시면 새로 등록하실 수 있고, 마감하지 않고 여러 건을 올리시려면{" "}
                      <Link href="/company/dashboard/plans/light">건수 제한 없는 상품</Link>도 확인해 보세요
                    </>}
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
            <span className="co-bill-keep-t">채용이 끝나셨다면 보관했다가 다음 채용 때 쓰실 수 있습니다</span>
            <button type="button" className="co-bill-keep-b" onClick={보관하기} disabled={보관중}>
              {보관중 ? "보관 중…" : "보관하기"}
            </button>
          </div>
        )}

        {/* 진행 중 공고·메인 노출·게재기간 카드 — "저 카드는 필요없으니 지우라는
            얘기지" 삭제. 진행 중인 공고·노출 수는 대시보드에서 이미 보고, 여기는
            결제·이용권만 남긴다. */}

        <div className="co-bill-htop">
          <p className="co-bill-h">결제 내역</p>
          {주문들.length > 0 && (
            <div className="co-bill-period">
              {기간필터_목록.map((f) => (
                <button key={f} type="button" className={f === 기간 ? "on" : ""} onClick={() => set기간(f)}>
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
        {주문들.length === 0 ? (
          <p className="co-bill-empty">아직 신청한 이용권이 없습니다.</p>
        ) : 필터된주문.length === 0 ? (
          <p className="co-bill-empty">이 기간에는 결제 내역이 없습니다.</p>
        ) : (
          <table className="co-bill-tb">
            <thead>
              <tr>
                <th>결제번호</th><th>신청상품</th><th>이용기간</th><th>결제금액</th>
                <th>결제일</th><th>적용기간</th><th>결제상태</th>
              </tr>
            </thead>
            <tbody>
              {필터된주문.map((o) => (
                <tr key={o.id}>
                  <td className="co-bill-no">{결제번호(o.id)}</td>
                  <td>{플랜[o.plan]?.name || o.plan}</td>
                  <td>{o.days}일{o.kept_days > 0 && <i className="co-bill-plus">+{o.kept_days}</i>}</td>
                  <td>{원(o.amount)}</td>
                  <td>{o.confirmed_at ? o.confirmed_at : "—"}</td>
                  <td>{o.applied_from && o.applied_until ? `${o.applied_from} ~ ${o.applied_until}` : "—"}</td>
                  <td className={o.status === "PENDING" ? "on" : undefined}>{상태이름[o.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </CompanyLayout>
  );
}
