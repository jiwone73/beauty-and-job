export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, requireAuth } from "@/lib/api";

// 못 보낸 메일 — 최근 것부터. 「메일이 안 왔다」는 문의에 답할 근거.
export async function GET(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const [items, total] = await Promise.all([
    pool.query(`SELECT to_addr, subject, reason, created_at FROM email_failures ORDER BY created_at DESC LIMIT 30`),
    pool.query(`SELECT count(*)::int AS n FROM email_failures`),
  ]);
  return ok({ total: total.rows[0].n, items: items.rows });
}
