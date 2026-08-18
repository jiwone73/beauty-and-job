export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { collectCafeLeads, saveLeads } from "@/lib/external/naverCafe";

// 카페에서 찾은 구인글 목록 — 알바가 아침에 여는 '오늘 확인할 것'.
export async function GET(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const sp = new URL(req.url).searchParams;
  const status = (sp.get("status") || "NEW").toUpperCase();
  const q = (sp.get("q") || "").trim();

  const params: any[] = [];
  const where: string[] = [];
  if (status !== "ALL") { params.push(status); where.push(`status = $${params.length}`); }
  if (q) { params.push(`%${q}%`); where.push(`(title ILIKE $${params.length} OR summary ILIKE $${params.length} OR cafe_name ILIKE $${params.length})`); }

  const { rows } = await pool.query(
    `SELECT link, title, summary, cafe_name, cafe_url, keyword, status, skip_reason, job_id, first_seen_at
       FROM cafe_leads
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY first_seen_at DESC
      LIMIT 300`,
    params
  );
  const counts = await pool.query(
    `SELECT status, count(*)::int n FROM cafe_leads GROUP BY status`
  );
  return ok({
    items: rows,
    counts: Object.fromEntries(counts.rows.map((r: any) => [r.status, r.n])),
  });
}

// 지금 바로 한 번 모으기(관리자 버튼). 정기 수집은 크론이 한다.
export async function POST(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const leads = await collectCafeLeads();
  const added = await saveLeads(leads);
  return ok({ found: leads.length, added });
}

// 상태 바꾸기 — 등록완료 / 제외
export async function PATCH(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const { link, status, skip_reason, job_id } = await req.json();
  if (!link) return err("VALIDATION_001", "대상을 지정해주세요.");
  const st = String(status || "").toUpperCase();
  if (!["NEW", "DONE", "SKIP"].includes(st)) return err("VALIDATION_001", "상태 값이 올바르지 않습니다.");

  await pool.query(
    `UPDATE cafe_leads
        SET status = $2, skip_reason = $3, job_id = COALESCE($4, job_id), updated_at = now()
      WHERE link = $1`,
    [link, st, (skip_reason || "").trim() || null, job_id || null]
  );
  return ok({ link, status: st });
}
