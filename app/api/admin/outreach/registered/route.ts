export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, requireAuth } from "@/lib/api";
import { normalizeSourceUrl } from "@/lib/sourceUrl";

// 이미 등록을 마친 원문 주소 목록.
// 외부업체 리스트에서 '이건 벌써 올린 공고'를 흐리게 표시하는 데 쓴다.
// 예전에 등록한 것까지 모두 포함해야 하므로 조건 없이 전부 내려 준다.
export async function GET(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const { rows } = await pool.query(
    `SELECT DISTINCT source_url FROM job_postings
      WHERE source_url IS NOT NULL AND source_url <> ''`
  );

  const urls = Array.from(
    new Set(rows.map((r: any) => normalizeSourceUrl(r.source_url)).filter(Boolean))
  );
  return ok({ urls });
}
