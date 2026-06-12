export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, requireAuth } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const r = await pool.query(
    `SELECT id, title, content_html, status, sent_at, sent_count, created_at
     FROM newsletters ORDER BY created_at DESC LIMIT 50`
  );
  return ok(r.rows);
}