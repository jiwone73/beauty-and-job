export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 내가 차단한 기업 목록
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  try {
    const { rows } = await pool.query(
      `SELECT b.company_id, b.company_name, b.created_at,
              c.company_name AS current_name, c.brand_name, c.logo_url
       FROM user_company_blocks b
       LEFT JOIN companies c ON c.id = b.company_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [auth!.sub]
    );
    const data = rows.map((r) => ({
      companyId: r.company_id,
      companyName: r.current_name || r.company_name,
      brandName: r.brand_name,
      logoUrl: r.logo_url,
      createdAt: r.created_at,
    }));
    return ok(data);
  } catch (e: any) {
    console.error("[blocks GET]", e);
    return err("BLOCK_001", "차단 목록 조회 실패: " + e.message, 500);
  }
}

// 기업 차단 추가
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const companyId = body?.companyId;
    const companyName = body?.companyName || null;
    if (!companyId) return err("BLOCK_002", "기업 ID가 필요합니다.", 400);

    await pool.query(
      `INSERT INTO user_company_blocks (user_id, company_id, company_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, company_id) DO NOTHING`,
      [auth!.sub, companyId, companyName]
    );
    return ok({ blocked: true });
  } catch (e: any) {
    console.error("[blocks POST]", e);
    return err("BLOCK_003", "기업 차단 실패: " + e.message, 500);
  }
}