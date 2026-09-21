"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import ServiceHeader from "@/components/company/ServiceHeader";
import { useAuthStore } from "@/lib/store/authStore";
import { 플랜, 기간들, 값, 원, 플랜인가, 기간인가, type PlanId, type 기간 } from "@/lib/companyPlans";

/**
 * 이용권 신청.
 *
 * 무통장입금이라 여기서 끝나는 것은 「사겠다」는 기록이고, 실제로 붙는 것은
 * 관리자가 입금을 확인할 때다. 그래서 마지막 화면이 계좌 안내다.
 */

const 순서: PlanId[] = ["LIGHT", "STANDARD", "PREMIUM"];

function 주문화면() {
  const router = useRouter();
  const params = useSearchParams();
  const { isLoggedIn, ownerType } = useAuthStore();

  const 첫플랜 = 플랜인가(params.get("plan")) ? (params.get("plan") as PlanId) : "STANDARD";
  // 상세에서 기간까지 고르고 왔으면 그대로 받는다 — 여기서 다시 고르게 하면
  // 고른 값이 사라져 어느 쪽이 진짜인지 되묻게 된다.
  const 첫기간 = 기간인가(Number(params.get("days"))) ? (Number(params.get("days")) as 기간) : 30;
  const [plan, setPlan] = useState<PlanId>(첫플랜);
  const [days, setDays] = useState<기간>(첫기간);
  const [입금자, set입금자] = useState("");
  // 입금 확인 즉시 서비스가 시작돼 청약철회권이 제한된다 — 결제 전에 이걸
  // 안내하고 동의를 받아야 「환불불가」가 실제로 효력이 있다(약관 제13조 ④).
  const [환불동의, set환불동의] = useState(false);
  const [바쁨, set바쁨] = useState(false);
  const [끝남, set끝남] = useState(false);
  const [계좌, set계좌] = useState("");
  const [팔림, set팔림] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/plans").then((r) => r.json()).then((r) => {
      set팔림(!!r?.data?.sales);
      set계좌(r?.data?.bank || "");
    }).catch(() => set팔림(false));
  }, []);

  const 신청 = async () => {
    if (!isLoggedIn || ownerType !== "company") { router.push("/company/login"); return; }
    if (!입금자.trim() || !환불동의) return;
    set바쁨(true);
    const token = localStorage.getItem("access_token");
    const r = await fetch("/api/company/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan, days, depositor: 입금자.trim(), agreeNoRefund: 환불동의 }),
    }).then((x) => x.json()).catch(() => null);
    set바쁨(false);
    if (!r?.success) { alert(r?.error?.message || "신청하지 못했습니다."); return; }
    set끝남(true);
  };

  if (끝남) {
    return (
      <section className="cs-wrap cs-order">
        <h2 className="cs-h2">신청되었습니다</h2>
        <div className="cs-order-box done">
          <p className="cs-order-done-l">아래로 입금하시면 확인 뒤 이용권이 적용됩니다</p>
          <p className="cs-order-bank">{계좌 || "고객센터로 계좌를 안내해 드립니다"}</p>
          <p className="cs-order-amt">{원(값(plan, days))}</p>
          <div className="cs-order-sum">
            <span>{플랜[plan].name}</span><span>{days}일</span><span>{입금자}</span>
          </div>
          <Link href="/company/dashboard/billing" className="cs-btn-fill lg">
            내 이용권 보기 <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="cs-wrap cs-order">
      <h2 className="cs-h2">이용권 신청</h2>

      {팔림 === false ? (
        <div className="cs-order-box done">
          <p className="cs-order-done-l">온라인 신청은 아직 열지 않았습니다</p>
          <Link href="/support" className="cs-btn-fill lg">고객센터 문의하기 <ArrowRight size={15} /></Link>
        </div>
      ) : (
        <div className="cs-order-box">
          <p className="cs-order-lab">플랜</p>
          <div className="cs-pick">
            {순서.map((p) => (
              <button key={p} type="button" className={`cs-pick-btn${plan === p ? " on" : ""}`}
                onClick={() => setPlan(p)}>
                {plan === p && <Check size={14} strokeWidth={2.6} />}{플랜[p].name}
              </button>
            ))}
          </div>

          <p className="cs-order-lab">기간</p>
          <div className="cs-pick">
            {기간들.map((d) => (
              <button key={d} type="button" className={`cs-pick-btn${days === d ? " on" : ""}`}
                onClick={() => setDays(d)}>
                {days === d && <Check size={14} strokeWidth={2.6} />}{d}일
              </button>
            ))}
          </div>

          <div className="cs-order-price">
            <span>{플랜[plan].name} · {days}일</span>
            <b>{원(값(plan, days))}</b>
          </div>

          <p className="cs-order-lab">입금자명</p>
          <input className="cs-order-input" value={입금자} maxLength={30}
            onChange={(e) => set입금자(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") 신청(); }}
            placeholder="입금하실 분 이름" />

          <label className="cs-order-agree">
            <input type="checkbox" checked={환불동의} onChange={(e) => set환불동의(e.target.checked)} />
            <span>
              입금 확인 즉시 서비스 이용이 시작되며, 이 경우 청약철회권이 제한되어
              이용권 적용 후에는 원칙적으로 환불되지 않는다는 점에 동의합니다.
              (<Link href="/support/faq?누구=기업" target="_blank">환불 정책 자세히 보기</Link>)
            </span>
          </label>

          <button type="button" className="cs-btn-fill lg cs-order-go"
            onClick={신청} disabled={바쁨 || !입금자.trim() || !환불동의}>
            신청하기 <ArrowRight size={15} />
          </button>
          <p className="cs-vat" style={{ margin: "14px 0 0" }}>부가세 포함 · 입금 전(이용권 적용 전)에는 언제든 취소할 수 있습니다</p>
        </div>
      )}
    </section>
  );
}

export default function CompanyOrderPage() {
  return (
    <div className="cs-page">
      <ServiceHeader />
      <Suspense fallback={<section className="cs-wrap cs-order" />}>
        <주문화면 />
      </Suspense>
    </div>
  );
}
