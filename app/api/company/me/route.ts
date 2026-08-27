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
    `SELECT c.id, c.company_name, c.brand_name, c.industry, c.business_number, c.representative_name, c.manager_name, c.company_type,
            c.email, c.phone, c.company_phone, c.logo_url, c.signboard_url, c.cover_images, c.description, c.website_url, c.links, c.address, c.address_detail,
            c.company_size, c.founded_year, c.region_sido, c.region_sigungu,
            c.status, c.business_license_path, c.created_at,
            -- 헤더·사이드바에 쓸 대표 사진. 매장은 간판 사진(매장명이 보이는 선택 항목)이
            -- 있으면 그걸 먼저 쓰고, 없으면 예전처럼 공고 배너 이미지로 대체한다.
            -- 오피스는 로고가 먼저다.
            CASE WHEN c.company_type = 'OFFICE'
              THEN COALESCE(c.logo_url, c.cover_images->0->>'url', jp.cover)
              ELSE COALESCE(c.signboard_url, c.cover_images->0->>'url', jp.cover, c.logo_url)
            END AS thumb_url
     FROM companies c
     LEFT JOIN LATERAL (
       SELECT j.cover_images->0->>'url' AS cover
       FROM job_postings j
       WHERE j.company_id = c.id AND j.cover_images->0->>'url' IS NOT NULL
       ORDER BY j.created_at DESC LIMIT 1
     ) jp ON true
     WHERE c.id = $1`,
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
    "company_name", "brand_name", "industry", "representative_name", "manager_name", "phone", "company_phone",
    "logo_url", "description", "website_url", "links", "address", "address_detail",
    "company_size", "founded_year", "region_sido", "region_sigungu",
  ];

  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      // jsonb 칸은 문자열로 넘겨 캐스팅한다(배열을 그대로 넘기면 pg 가 못 다룬다).
      if (field === "links") {
        values.push(JSON.stringify(Array.isArray(body.links) ? body.links : []));
        updates.push(`links = $${idx++}::jsonb`);
        continue;
      }
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
    RETURNING id, company_name, brand_name, industry, business_number, representative_name, manager_name, company_type,
              email, phone, company_phone, logo_url, description, website_url, links, address, address_detail,
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
