export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 기업 정보 조회
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;
  const result = await pool.query(
    `SELECT id, company_name, brand_name, business_number, representative_name, manager_name, company_type,
            email, phone, company_phone, logo_url, cover_images, description, website_url, address, address_detail,
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
    "company_name", "brand_name", "representative_name", "manager_name", "phone", "company_phone",
    "logo_url", "description", "website_url", "address", "address_detail",
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
    RETURNING id, company_name, brand_name, business_number, representative_name, manager_name, company_type,
              email, phone, company_phone, logo_url, description, website_url, address, address_detail,
              company_size, founded_year, region_sido, region_sigungu,
              status, created_at
  `;

  const result = await pool.query(query, values);

  if (result.rowCount === 0) {
    return err("COMPANY_001", "기업 정보를 찾을 수 없습니다.", 404);
  }
  return ok(result.rows[0]);
}

// 회원 탈퇴 (소프트: status = WITHDRAWN) — 비밀번호 확인 필요
export async function DELETE(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const password = body?.password || "";
  if (!password) {
    return err("VALIDATION_001", "비밀번호를 입력해주세요.", 400);
  }

  const cur = await pool.query(
    `SELECT password_hash FROM companies WHERE id = $1 AND status = 'ACTIVE'`,
    [auth!.sub]
  );
  if (cur.rowCount === 0) {
    return err("COMPANY_001", "이미 탈퇴했거나 계정을 찾을 수 없습니다.", 404);
  }
  const valid = await bcrypt.compare(password, cur.rows[0].password_hash);
  if (!valid) {
    return err("AUTH_003", "비밀번호가 일치하지 않습니다.", 401);
  }

  await pool.query(
    `UPDATE companies SET status = 'WITHDRAWN', updated_at = NOW() WHERE id = $1 AND status = 'ACTIVE'`,
    [auth!.sub]
  );
  return ok({ withdrawn: true });
}
