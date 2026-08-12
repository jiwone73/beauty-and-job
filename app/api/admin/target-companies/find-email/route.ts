export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // 외부 홈페이지 fetch + euc-kr 디코딩

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { findRecruitEmailFromHomepage } from "@/lib/external/recruitEmail";

// 회사 홈페이지에서 '본사 채용담당 이메일'을 찾아 target_companies.email 갱신.
// body: { id } 또는 { ids, overwrite? }  (일괄, 최대 50건/요청)
//   overwrite=false(기본)면 이미 이메일이 있는 업체는 건너뜀.

const MAX_IDS = 50;
const CONCURRENCY = 5;

async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); }
  }));
  return out;
}

export async function POST(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const b = await req.json().catch(() => ({}));
  const single = typeof b.id === "string" && b.id.trim();
  let ids: string[] = [];
  if (single) ids = [b.id.trim()];
  else if (Array.isArray(b.ids)) ids = b.ids.filter((x: unknown) => typeof x === "string" && x).map((x: string) => x.trim());
  if (!ids.length) return err("VALIDATION_001", "id 또는 ids가 필요합니다.", 400);
  if (ids.length > MAX_IDS) return err("VALIDATION_001", `한 번에 최대 ${MAX_IDS}건까지 조회할 수 있습니다.`, 400);
  const overwrite = single ? true : b.overwrite === true; // 단건은 명시적 요청이므로 덮어씀

  const rows = (await pool.query(
    `SELECT id, homepage, email FROM target_companies WHERE id = ANY($1::uuid[])`,
    [ids]
  )).rows as { id: string; homepage: string | null; email: string | null }[];

  const results = await mapLimit(rows, CONCURRENCY, async (row) => {
    if (!row.homepage?.trim()) return { id: row.id, email: null, status: "no_homepage" };
    if (!overwrite && row.email?.trim()) return { id: row.id, email: row.email, status: "kept" };
    let found: { email: string; source: string } | null = null;
    try { found = await findRecruitEmailFromHomepage(row.homepage); } catch { found = null; }
    if (found?.email) {
      const up = await pool.query(
        `UPDATE target_companies SET email = $1, updated_at = now() WHERE id = $2 RETURNING *`,
        [found.email, row.id]
      );
      return { id: row.id, email: found.email, source: found.source, status: "found", row: up.rows[0] };
    }
    return { id: row.id, email: null, status: "not_found" };
  });

  const items = results.filter((r: any) => r.row).map((r: any) => r.row);
  const foundCount = results.filter((r: any) => r.status === "found").length;
  return ok({ items, results: results.map(({ row, ...r }: any) => r), found: foundCount, checked: results.length });
}
