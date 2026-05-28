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
        id, email, name, phone, job_type, status, created_at,
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
  const { birth } = body;

  // 생년월일 정규화 (YYYYMMDD 8자리만 허용)
  const birthDate = typeof birth === "string" && /^\d{8}$/.test(birth) ? birth : null;
  if (!birthDate) {
    return err("USER_002", "생년월일은 YYYYMMDD 8자리로 입력해주세요.", 400);
  }

  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE users
       SET birth_date = TO_DATE($1, 'YYYYMMDD'), updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, birth_date`,
      [birthDate, payload.sub]
    );
    if (res.rowCount === 0) return err("USER_004", "사용자를 찾을 수 없습니다.", 404);
    return ok(res.rows[0]);
  } finally {
    client.release();
  }
}