export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { verifyAccessToken } from "@/lib/jwt";

function ok(data: any) {
  return NextResponse.json({ success: true, data });
}
function err(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, code, message }, { status });
}

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
      `SELECT id, email, name, phone, gender, job_type, office_job_areas, status, created_at, avatar_url,
              birth_date, address_road, address_detail, region_sido, region_sigungu, preferred_regions,
              portfolio_url, portfolio_filename, resume_file_url, resume_file_name, resume_file_size,
              (password_hash IS NOT NULL) AS has_password, (kakao_id IS NOT NULL) AS is_kakao
       FROM users WHERE id = $1`,
      [payload.sub]
    );
    if (res.rowCount === 0) return err("USER_004", "사용자를 찾을 수 없습니다.", 404);
    return ok(res.rows[0]);
  } finally {
    client.release();
  }
}

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
    job_type,
    birth, gender, email, office_job_areas,
    address_road, address_detail, region_sido, region_sigungu, preferred_regions,
  } = body;
  const sets: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (job_type !== undefined) {
    if (job_type !== "OFFICE" && job_type !== "STORE") {
      return err("USER_002", "job_type은 OFFICE 또는 STORE만 가능합니다.", 400);
    }
    sets.push("job_type = $" + idx++);
    params.push(job_type);
  }
  if (birth !== undefined) {
    const birthDate = typeof birth === "string" && /^\d{8}$/.test(birth) ? birth : null;
    if (!birthDate) {
      return err("USER_002", "생년월일은 YYYYMMDD 8자리로 입력해주세요.", 400);
    }
    sets.push("birth_date = TO_DATE($" + idx++ + ", 'YYYYMMDD')");
    params.push(birthDate);
  }
  if (gender !== undefined) {
    const genderVal = gender === "남성" || gender === "여성" ? gender : null;
    if (!genderVal) {
      return err("USER_002", "성별 값이 올바르지 않습니다.", 400);
    }
    sets.push("gender = $" + idx++);
    params.push(genderVal);
  }
  if (email !== undefined) {
    const emailVal = typeof email === "string" ? email.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      return err("USER_002", "이메일 형식이 올바르지 않습니다.", 400);
    }
    sets.push("email = $" + idx++);
    params.push(emailVal);
  }
  if (office_job_areas !== undefined) {
    sets.push("office_job_areas = $" + idx++);
    params.push(office_job_areas);
  }
  if (address_road !== undefined) {
    sets.push("address_road = $" + idx++);
    params.push(typeof address_road === "string" ? address_road : null);
  }
  if (address_detail !== undefined) {
    sets.push("address_detail = $" + idx++);
    params.push(typeof address_detail === "string" ? address_detail : null);
  }
  if (region_sido !== undefined) {
    sets.push("region_sido = $" + idx++);
    params.push(typeof region_sido === "string" ? region_sido : null);
  }
  if (region_sigungu !== undefined) {
    sets.push("region_sigungu = $" + idx++);
    params.push(typeof region_sigungu === "string" ? region_sigungu : null);
  }
  if (preferred_regions !== undefined) {
    if (!Array.isArray(preferred_regions) || preferred_regions.length > 5) {
      return err("USER_002", "희망 근무지역은 최대 5개까지 가능합니다.", 400);
    }
    sets.push("preferred_regions = $" + idx++ + "::jsonb");
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
      "UPDATE users SET " + sets.join(", ") + " WHERE id = $" + idx +
      " RETURNING id, name, email, birth_date, gender, job_type, address_road, address_detail, region_sido, region_sigungu, preferred_regions",
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
export async function DELETE(req: NextRequest) {
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
  const body = await req.json().catch(() => ({}));
  const password = body?.password || "";
  const client = await pool.connect();
  try {
    const u = await client.query(
      `SELECT password_hash FROM users WHERE id = $1 AND status = 'ACTIVE'`,
      [payload.sub]
    );
    if (u.rowCount === 0) return err("USER_004", "처리할 수 없는 계정입니다.", 400);
    const hash = u.rows[0].password_hash;
    if (hash) {
      // 비밀번호 로그인 계정: 비밀번호 확인 (소셜 로그인 계정은 비밀번호가 없어 생략)
      if (!password) return err("VALIDATION_001", "비밀번호를 입력해주세요.", 400);
      const valid = await bcrypt.compare(password, hash);
      if (!valid) return err("AUTH_003", "비밀번호가 일치하지 않습니다.", 401);
    }
    const upd = await client.query(
      `UPDATE users SET status = 'WITHDRAWN', withdrawn_at = NOW() WHERE id = $1 AND status = 'ACTIVE'`,
      [payload.sub]
    );
    if (upd.rowCount === 0) return err("USER_004", "처리할 수 없는 계정입니다.", 400);
    return ok({ withdrawn: true });
  } finally {
    client.release();
  }
}