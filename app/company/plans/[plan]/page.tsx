"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ServiceHeader from "@/components/company/ServiceHeader";
import PlanDetail from "@/components/company/PlanDetail";
import { 플랜인가, type PlanId } from "@/lib/companyPlans";

/** 로그인 전에 보는 플랜 상세. 알맹이는 PlanDetail 이 그리고 여기는 껍데기만 두른다. */
export default function PlanDetailPage() {
  const 자리 = String(useParams()?.plan || "").toUpperCase();
  if (!플랜인가(자리)) notFound();

  return (
    <div className="cs-page">
      <ServiceHeader />
      <section className="cs-wrap" style={{ paddingBottom: 0 }}>
        <Link href="/company/plans" className="cs-back"><ArrowLeft size={16} /> 요금제</Link>
      </section>
      <PlanDetail id={자리 as PlanId} />
    </div>
  );
}
