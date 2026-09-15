"use client";

import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ServiceHeader from "@/components/company/ServiceHeader";
import { 면상품, 면이름, 면설명, type 광고면 } from "@/lib/adProducts";

/** 배너광고 — 화면 하나에 걸 수 있는 자리들. 가입 전에도 본다. */
const 주소값: Record<string, 광고면> = { main: "MAIN", jobs: "JOBS" };

export default function CompanyAdSurfacePage() {
  const 자리 = String(useParams()?.["면"] || "").toLowerCase();
  const 면 = 주소값[자리];
  if (!면) notFound();

  return (
    <div className="cs-page">
      <ServiceHeader />
      <section className="cs-wrap">
        <div className="pi">
          <div className="pi-hd">
            <h2 className="pi-nm">{면이름[면]}</h2>
            <p className="pi-ln">{면설명[면]}</p>
          </div>
          <section className="pi-sec">
            <h3 className="pi-st">상품</h3>
            <div className="cs-ads">
              {면상품(면).map((a) => (
                <Link key={a.id} href="/company/ads" className="cs-ad">
                  <span className="cs-ad-nm">{a.name}</span>
                  <span className="cs-ad-where">{a.자리}</span>
                  <span className="cs-ad-sum">{a.한줄}</span>
                </Link>
              ))}
            </div>
            <div className="cs-center" style={{ marginTop: 26 }}>
              <Link href="/company/ads" className="cs-btn-fill lg">
                값과 자세한 설명 보기 <ArrowRight size={15} />
              </Link>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
