export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 기업 정보 조회
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;
  const result = await pool.query(
    `SELECT id, company_name, brand_name, business_number, company_type,
            email, phone, logo_url, description, website_url, address,
            company_size, founded_year, region_sido, region_sigungu,
            status, created_at
     FROM companies WHERE id = $1`,
    [auth!.sub]
  );
  if (result.rowCount === 0) {
    return ok(null, 404);
  }
  return ok(result.rows[0]);
}

// 기업 정보 수정
export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));

  // 수정 가능한 필드 (whitelist - 보안)
  const allowedFields = [
    "company_name", "brand_name", "phone",
    "logo_url", "description", "website_url", "address",
    "company_size", "founded_year", "region_sido", "region_sigungu",
  ];

  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = $${idx++}`);
      values.push(body[field]);
    }
  }

  if (updates.length === 0) {
    return err("VALIDATION_001", "수정할 항목이 없습니다.", 400);
  }

  updates.push(`updated_at = NOW()`);
  values.push(auth!.sub);

  const query = `
    UPDATE companies
    SET ${updates.join(", ")}
    WHERE id = $${idx++}
    RETURNING id, company_name, brand_name, business_number, company_type,
              email, phone, logo_url, description, website_url, address,
              company_size, founded_year, region_sido, region_sigungu,
              status, created_at
  `;

  const result = await pool.query(query, values);

  if (result.rowCount === 0) {
    return err("COMPANY_001", "기업 정보를 찾을 수 없습니다.", 404);
  }
  return ok(result.rows[0]);
}
