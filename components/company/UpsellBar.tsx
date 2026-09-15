"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { 플랜, 준비중, type PlanId } from "@/lib/companyPlans";

/**
 * 막힌 자리에서 바로 사러 가는 길.
 *
 * 잠긴 기능은 그 자체로 광고다 — 이름이 가려진 인재 카드는 「여기 사람이 있는데
 * 지금은 못 본다」를 말한다. 그런데 여태 막히기만 하고 사러 가는 길이 없어서,
 * 사장님은 왜 안 보이는지도 모른 채 화면을 닫았다.
 *
 * 값을 여기서 다 늘어놓지 않는다. 무엇이 열리는지 한 줄만 말하고 나머지는
 * 상품 화면이 맡는다 — 막힌 자리에서 요금표를 펼치면 하던 일이 끊긴다.
 */
export default function UpsellBar({ plan = "STANDARD", 무엇 }: {
  /** 이 기능이 열리는 가장 낮은 플랜 */
  plan?: PlanId;
  /** 무엇이 잠겼는지 — 「인재 이름·연락처」처럼 명사로 */
  무엇: string;
}) {
  const [안엶, set안엶] = useState(false);
  useEffect(() => {
    fetch("/api/plans").then((r) => r.json())
      .then((r) => set안엶(Array.isArray(r?.data?.open) && !r.data.open.includes(plan)))
      .catch(() => {});
  }, [plan]);

  // 로그인한 기업은 대시보드 안의 상품 화면으로, 그 밖에서는 바깥 화면으로.
  const 안쪽 = (usePathname() || "").startsWith("/company/dashboard");
  const 어디 = `${안쪽 ? "/company/dashboard/plans" : "/company/plans"}/${plan.toLowerCase()}`;

  return (
    <Link href={어디} className="co-upsell">
      <Lock size={15} />
      <span className="co-upsell-t">
        {무엇}는 <b>{플랜[plan].name}</b>부터 열립니다
      </span>
      <span className="co-upsell-go">{안엶 ? 준비중 : "상품 보기"}<ChevronRight size={15} /></span>
    </Link>
  );
}
