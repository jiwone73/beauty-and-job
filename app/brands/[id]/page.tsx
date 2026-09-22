import type { Metadata } from "next";
import { notFound } from "next/navigation";
import pool from "@/lib/db";
import { jobCompanyName } from "@/lib/companyName";
import BrandDetailClient from "./BrandDetailClient";

// 승인된(ACTIVE) 회사만 공개 프로필로 연다 — /api/companies/[id] 와 같은 조건.
async function 회사읽기(id: string) {
  try {
    const { rows } = await pool.query(
      `SELECT company_name, brand_name, description, company_type,
              region_sido, region_sigungu, logo_url
         FROM companies WHERE id = $1 AND status = 'ACTIVE'`,
      [id]
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const 회사 = await 회사읽기(params.id);
  if (!회사) return {};
  const 이름 = jobCompanyName(회사.company_type, 회사.company_name, 회사.brand_name);
  const 지역 = [회사.region_sido, 회사.region_sigungu].filter(Boolean).join(" ");
  const 제목 = `${이름} 채용정보 | 뷰티워크`;
  const 설명 = (회사.description && 회사.description.slice(0, 80))
    || [이름, 지역, "채용정보"].filter(Boolean).join(" · ");
  return {
    title: 제목,
    description: 설명,
    alternates: { canonical: `/brands/${params.id}` },
    openGraph: {
      title: 제목,
      description: 설명,
      url: `/brands/${params.id}`,
      images: 회사.logo_url ? [{ url: 회사.logo_url }] : undefined,
      type: "website",
    },
  };
}

export default async function BrandDetailPage({ params }: { params: { id: string } }) {
  const 회사 = await 회사읽기(params.id);
  if (!회사) notFound();
  return <BrandDetailClient />;
}
