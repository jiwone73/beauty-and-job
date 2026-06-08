export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, requireAuth } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const list = await pool.query(
    `SELECT id, type, title, message, is_read, related_id, related_type, created_at
     FROM notifications
     WHERE company_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [auth!.sub]
  );
  const unread = await pool.query(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE company_id = $1 AND is_read = false`,
    [auth!.sub]
  );

  return ok({ notifications: list.rows, unread: unread.rows[0].count });
}

// 전체 읽음 처리
export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  await pool.query(
    `UPDATE notifications SET is_read = true WHERE company_id = $1 AND is_read = false`,
    [auth!.sub]
  );
  return ok({ updated: true });
}
