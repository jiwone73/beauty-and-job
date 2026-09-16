"use client";

import { notFound, useParams } from "next/navigation";
import ServiceHeader from "@/components/company/ServiceHeader";
import AdSurfaceDetail from "@/components/company/AdSurfaceDetail";
import { type 광고면 } from "@/lib/adProducts";

const 주소값: Record<string, 광고면> = { main: "MAIN", jobs: "JOBS" };

/** 배너광고 상세 — 가입 전에도 본다. */
export default function CompanyAdSurfacePage() {
  const 면 = 주소값[String(useParams()?.["면"] || "").toLowerCase()];
  if (!면) notFound();
  return (
    <div className="cs-page">
      <ServiceHeader />
      <section className="cs-wrap">
        <AdSurfaceDetail 면={면} />
      </section>
    </div>
  );
}
