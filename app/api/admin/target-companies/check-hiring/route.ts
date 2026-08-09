export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // findByCompany 가 euc-kr TextDecoder 사용 → nodejs 고정

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { findJobsForCompany } from "@/lib/external/findByCompany";

// 채용유무 자동확인: 브랜드명으로 9개 채용사이트를 조회(무료)해서
// is_hiring / found_jobs / found_count / last_checked_at 를 갱신한다.
// body: { id: "..." }  또는  { ids: ["...", ...] }  (일괄, 최대 50건/요청)

const MAX_IDS = 50;

// 검색용 정규화: 괄호(영문/구버전명) 제거 → 대표 브랜드명만 (예: "리안헤어 (RIAHN)" → "리안헤어")
function coreName(brand: string): string {
  const cut = brand.replace(/[\(（].*$/g, "").replace(/\s*\/.*$/g, "").trim();
  return cut || brand.trim();
}

export async function POST(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const b = await req.json().catch(() => ({}));
  let ids: string[] = [];
  if (typeof b.id === "string" && b.id.trim()) ids = [b.id.trim()];
  else if (Array.isArray(b.ids)) ids = b.ids.filter((x: unknown) => typeof x === "string" && x).map((x: string) => x.trim());
  if (!ids.length) return err("VALIDATION_001", "id 또는 ids가 필요합니다.", 400);
  if (ids.length > MAX_IDS) return err("VALIDATION_001", `한 번에 최대 ${MAX_IDS}건까지 조회할 수 있습니다.`, 400);

  const client = await pool.connect();
  try {
    // 대상 로드
    const rows = (await client.query(
      `SELECT id, brand_name FROM target_companies WHERE id = ANY($1::uuid[])`,
      [ids]
    )).rows as { id: string; brand_name: string }[];

    const updated: unknown[] = [];
    // 외부 사이트 부하를 고려해 순차 처리 (각 건 내부에서 8개 소스 병렬)
    for (const row of rows) {
      const company = coreName(row.brand_name);
      let jobs: { idx: number; title: string; url: string; source: string }[] = [];
      try {
        const r = await findJobsForCompany(company, { maxPages: 3, strict: true });
        jobs = r.jobs.slice(0, 30);
      } catch {
        jobs = [];
      }
      const hiring = jobs.length > 0 ? "채용중" : "없음";
      const up = await client.query(
        `UPDATE target_companies
            SET is_hiring = $1, found_jobs = $2::jsonb, found_count = $3, last_checked_at = now()
          WHERE id = $4 RETURNING *`,
        [hiring, JSON.stringify(jobs), jobs.length, row.id]
      );
      if (up.rows.length) updated.push(up.rows[0]);
    }
    return ok({ items: updated, checked: updated.length });
  } finally {
    client.release();
  }
}
