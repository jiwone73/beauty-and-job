export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 관리자: 개인회원이 기업을 차단한(열람제한) 관계 목록 (CS 확인용)
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || null;

  const params: any[] = [];
  let where = "";
  if (search) {
    where = `WHERE (
      u.name ILIKE $1
      OR u.email::text ILIKE $1
      OR b.company_name ILIKE $1
      OR c.company_name ILIKE $1
    )`;
    params.push(`%${search}%`);
  }

  try {
    const { rows } = await pool.query(
      `SELECT
        b.id,
        b.created_at,
        b.user_id,
        u.name AS user_name,
        u.email::text AS user_email,
        u.avatar_url AS user_avatar_url,
        b.company_id,
        COALESCE(c.company_name, b.company_name) AS company_name,
        c.company_type,
        c.phone AS company_phone,
        c.address AS company_address
      FROM user_company_blocks b
      JOIN users u ON u.id = b.user_id
      LEFT JOIN companies c ON c.id = b.company_id
      ${where}
      ORDER BY b.created_at DESC`,
      params
    );
    return ok({ items: rows });
  } catch (e: any) {
    console.error("[admin blocks GET]", e);
    return err("BLOCK_001", "차단 목록 조회 실패: " + e.message, 500);
  }
}
