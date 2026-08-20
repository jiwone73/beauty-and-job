export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 차단할 기업 검색 (구직자용)
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 1) return ok([]);

  try {
    const { rows } = await pool.query(
      `SELECT id, company_name, brand_name, logo_url,
              address, region_sido, region_sigungu
       FROM companies
       WHERE (company_name ILIKE $1 OR brand_name ILIKE $1)
         AND status = 'ACTIVE'
       ORDER BY company_name
       LIMIT 10`,
      [`%${q}%`]
    );
    // 같은 이름의 매장이 여럿이다(프랜차이즈 지점). 이름만으로는 어느 곳인지
    // 알 수 없어 엉뚱한 곳을 막게 되므로 주소를 함께 준다. 도로명이 없으면
    // 시·군·구까지라도 보여 준다.
    const data = rows.map((r) => ({
      companyId: r.id,
      companyName: r.company_name,
      brandName: r.brand_name,
      logoUrl: r.logo_url,
      address: r.address || [r.region_sido, r.region_sigungu].filter(Boolean).join(" ") || null,
    }));
    return ok(data);
  } catch (e: any) {
    console.error("[company search]", e);
    return err("COMP_SEARCH_001", "기업 검색 실패: " + e.message, 500);
  }
}