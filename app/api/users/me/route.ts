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
        portfolio_url, portfolio_filename, portfolio_uploaded_at
       FROM users WHERE id = $1`,
      [payload.sub]
    );
    if (res.rowCount === 0) return err("USER_004", "사용자를 찾을 수 없습니다.", 404);
    return ok(res.rows[0]);
  } finally {
    client.release();
  }
}