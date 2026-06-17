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
      `SELECT id, company_name, brand_name, logo_url
       FROM companies
       WHERE (company_name ILIKE $1 OR brand_name ILIKE $1)
         AND status = 'ACTIVE'
       ORDER BY company_name
       LIMIT 10`,
      [`%${q}%`]
    );
    const data = rows.map((r) => ({
      companyId: r.id,
      companyName: r.company_name,
      brandName: r.brand_name,
      logoUrl: r.logo_url,
    }));
    return ok(data);
  } catch (e: any) {
    console.error("[company search]", e);
    return err("COMP_SEARCH_001", "기업 검색 실패: " + e.message, 500);
  }
}