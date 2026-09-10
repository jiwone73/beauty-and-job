export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

const 상태들 = ["todo", "doing", "done", "blocked"];

export async function GET(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const r = await pool.query(`SELECT * FROM launch_tasks`);
  return ok({ items: r.rows });
}

// 어디까지 했나만 적는다. 항목 자체는 코드(lib/launchPlan.ts)에 있다.
export async function PATCH(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const b = await req.json().catch(() => ({}));
  const id = String(b.id || "").trim();
  const status = String(b.status || "").trim();
  if (!id) return err("VALIDATION_001", "id 가 없습니다.", 400);
  if (!상태들.includes(status)) return err("VALIDATION_001", "상태가 올바르지 않습니다.", 400);
  const r = await pool.query(
    `INSERT INTO launch_tasks (id, status, note, done_at, updated_at)
     VALUES ($1, $2, $3, CASE WHEN $2 = 'done' THEN now() ELSE NULL END, now())
     ON CONFLICT (id) DO UPDATE
       SET status = EXCLUDED.status, note = COALESCE(EXCLUDED.note, launch_tasks.note),
           done_at = CASE WHEN EXCLUDED.status = 'done' THEN now() ELSE NULL END,
           updated_at = now()
     RETURNING *`,
    [id, status, typeof b.note === "string" ? b.note.trim() || null : null]
  );
  return ok(r.rows[0]);
}
