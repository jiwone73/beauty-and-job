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
        id, email, name, phone, job_type, office_job_areas, status, created_at,
        portfolio_url, portfolio_filename, portfolio_uploaded_at,
        avatar_url, birth_date
       FROM users WHERE id = $1`,
      [payload.sub]
    );
    if (res.rowCount === 0) return err("USER_004", "사용자를 찾을 수 없습니다.", 404);
    return ok(res.rows[0]);
  } finally {
    client.release();
  }
}

// 생년월일 등 users 정보 수정
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
  const { birth, gender } = body;

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

  if (sets.length === 0) {
    return err("USER_002", "수정할 항목이 없습니다.", 400);
  }

  sets.push("updated_at = NOW()");
  params.push(payload.sub);

  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${idx}
       RETURNING id, name, birth_date, gender`,
      params
    );
    if (res.rowCount === 0) return err("USER_004", "사용자를 찾을 수 없습니다.", 404);
    return ok(res.rows[0]);
  } finally {
    client.release();
  }
}