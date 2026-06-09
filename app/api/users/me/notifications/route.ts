export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { verifyAccessToken } from "@/lib/jwt";

function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return null;
  try {
    const payload = verifyAccessToken(token);
    if (payload.owner_type !== "user") return null;
    return payload.sub as string;
  } catch {
    return null;
  }
}

// 내 알림 목록 + 안읽은 수
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return err("AUTH_001", "인증이 필요합니다.", 401);

  const list = await pool.query(
    `SELECT id, type, title, message, is_read, related_id, related_type, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  );
  const unread = await pool.query(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return ok({ notifications: list.rows, unread: unread.rows[0].count });
}

// 전체 읽음
export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return err("AUTH_001", "인증이 필요합니다.", 401);

  await pool.query(
    `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return ok({ updated: true });
}
