export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { verifyAccessToken } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return err("AUTH_001", "인증이 필요합니다.", 401);
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return err("AUTH_001", "유효하지 않은 토큰입니다.", 401);
  }
  if (payload.owner_type !== "user") {
    return err("AUTH_002", "사용자 권한이 필요합니다.", 403);
  }
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT 
        id, email, name, phone, gender, job_type, office_job_areas, status, created_at,
        portfolio_url, portfolio_filename, portfolio_uploaded_at,
        avatar_url, birth_date,
        address_road, address_detail, region_sido, region_sigungu, preferred_regions
       FROM users WHERE id = $1`,
      [payload.sub]
    );
    if (res.rowCount === 0) return err("USER_004", "사용자를 찾을 수 없습니다.", 404);
    return ok(res.rows[0]);
  } finally {
    client.release();
  }
}

// 생년월일 / 성별 / 이메일 / 직군 / 거주지 / 희망 근무지역 수정
export async function PATCH(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return err("AUTH_001", "인증이 필요합니다.", 401);
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return err("AUTH_001", "유효하지 않은 토큰입니다.", 401);
  }
  if (payload.owner_type !== "user") {
    return err("AUTH_002", "사용자 권한이 필요합니다.", 403);
  }
  const body = await req.json();
  const {
    birth, gender, email, office_job_areas,
    address_road, address_detail, region_sido, region_sigungu, preferred_regions,
  } = body;
  const sets: string[] = [];
  const params: any[] = [];
  let idx = 1;

  // 생년월일 (YYYYMMDD 8자리)
  if (birth !== undefined) {
    const birthDate = typeof birth === "string" && /^\d{8}$/.test(birth) ? birth : null;
    if (!birthDate) {
      return err("USER_002", "생년월일은 YYYYMMDD 8자리로 입력해주세요.", 400);
    }
    sets.push(`birth_date = TO_DATE($${idx++}, 'YYYYMMDD')`);
    params.push(birthDate);
  }

  // 성별 (남성/여성)
  if (gender !== undefined) {
    const genderVal = gender === "남성" || gender === "여성" ? gender : null;
    if (!genderVal) {
      return err("USER_002", "성별 값이 올바르지 않습니다.", 400);
    }
    sets.push(`gender = $${idx++}`);
    params.push(genderVal);
  }

  // 이메일
  if (email !== undefined) {
    const emailVal = typeof email === "string" ? email.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      return err("USER_002", "이메일 형식이 올바르지 않습니다.", 400);
    }
    sets.push(`email = $${idx++}`);
    params.push(emailVal);
  }

  // 직군 영역 (text[])
  if (office_job_areas !== undefined) {
    sets.push(`office_job_areas = $${idx++}`);
    params.push(office_job_areas);
  }

  // 거주지 도로명주소
  if (address_road !== undefined) {
    sets.push(`address_road = $${idx++}`);
    params.push(typeof address_road === "string" ? address_road : null);
  }

  // 상세주소
  if (address_detail !== undefined) {
    sets.push(`address_detail = $${idx++}`);
    params.push(typeof address_detail === "string" ? address_detail : null);
  }

  // 거주지 시/도
  if (region_sido !== undefined) {
    sets.push(`region_sido = $${idx++}`);
    params.push(typeof region_sido === "string" ? region_sido : null);
  }

  // 거주지 시/군/구
  if (region_sigungu !== undefined) {
    sets.push(`region_sigungu = $${idx++}`);
    params.push(typeof region_sigungu === "string" ? region_sigungu : null);
  }

  // 희망 근무지역 (jsonb) — 최대 5개, [{sido, sigungu}]
  if (preferred_regions !== undefined) {
    if (!Array.isArray(preferred_regions) || preferred_regions.length > 5) {
      return err("USER_002", "희망 근무지역은 최대 5개까지 가능합니다.", 400);
    }
    sets.push(`preferred_regions = $${idx++}::jsonb`);
    params.push(JSON.stringify(preferred_regions));
  }

  if (sets.length === 0) {
    return err("USER_002", "수정할 항목이 없습니다.", 400);
  }
  sets.push("updated_at = NOW()");
  params.push(payload.sub);

  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${idx}
       RETURNING id, name, email, birth_date, gender,
                 address_road, address_detail, region_sido, region_sigungu, preferred_regions`,
      params
    );
    if (res.rowCount === 0) return err("USER_004", "사용자를 찾을 수 없습니다.", 404);
    return ok(res.rows[0]);
  } catch (e: any) {
    if (e?.code === "23505") {
      return err("USER_003", "이미 사용 중인 이메일입니다.", 409);
    }
    throw e;
  } finally {
    client.release();
  }
}
