"use client";

import { notFound, useParams } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import AdSurfaceDetail from "@/components/company/AdSurfaceDetail";
import { type 광고면 } from "@/lib/adProducts";

const 주소값: Record<string, 광고면> = { main: "MAIN", jobs: "JOBS" };

/** 배너광고 상세 — 로그인한 기업이 보는 쪽. */
export default function CompanyDashboardAdSurfacePage() {
  const 면 = 주소값[String(useParams()?.["면"] || "").toLowerCase()];
  if (!면) notFound();
  return (
    <CompanyLayout activePage={면 === "MAIN" ? "ads-main" : "ads-jobs"} 제목숨김>
      <div className="co-plans"><AdSurfaceDetail 면={면} 안쪽 /></div>
    </CompanyLayout>
  );
}
