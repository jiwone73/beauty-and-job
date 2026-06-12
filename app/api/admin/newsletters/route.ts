export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const r = await pool.query(
    `SELECT id, title, content_html, status, sent_at, sent_count, created_at
     FROM newsletters ORDER BY created_at DESC LIMIT 50`
  );
  return ok(r.rows);
}

export async function DELETE(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  if (!ids.length) return err("REQ_001", "삭제할 항목이 없습니다.", 400);
  await pool.query(`DELETE FROM newsletters WHERE id = ANY($1::uuid[])`, [ids]);
  return ok({ deleted: ids.length });
}