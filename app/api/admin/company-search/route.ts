export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, requireAuth } from "@/lib/api";

// 회원 기업 가벼운 검색 (이관 대상 선택용)
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 1) return ok([]);
  const rows = await pool.query(
    `SELECT id, company_name, brand_name, business_number, email::text AS email, status
     FROM companies
     WHERE company_name ILIKE $1 OR brand_name ILIKE $1 OR business_number ILIKE $1
     ORDER BY (status = 'ACTIVE') DESC, created_at DESC
     LIMIT 20`,
    [`%${q}%`]
  );
  return ok(rows.rows);
}
