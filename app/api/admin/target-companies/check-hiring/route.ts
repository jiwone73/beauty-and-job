export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // findByCompany 가 euc-kr TextDecoder 사용 → nodejs 고정

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { checkHiringFor } from "@/lib/external/checkHiring";

// 채용유무 자동확인: 브랜드명으로 7개 채용사이트를 조회(무료)해서
// is_hiring / found_jobs / found_count / last_checked_at 를 갱신한다.
// body: { id: "..." }  또는  { ids: ["...", ...] }  (일괄, 최대 50건/요청)

const MAX_IDS = 50;

export async function POST(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const b = await req.json().catch(() => ({}));
  let ids: string[] = [];
  if (typeof b.id === "string" && b.id.trim()) ids = [b.id.trim()];
  else if (Array.isArray(b.ids)) ids = b.ids.filter((x: unknown) => typeof x === "string" && x).map((x: string) => x.trim());
  if (!ids.length) return err("VALIDATION_001", "id 또는 ids가 필요합니다.", 400);
  if (ids.length > MAX_IDS) return err("VALIDATION_001", `한 번에 최대 ${MAX_IDS}건까지 조회할 수 있습니다.`, 400);

  try {
    const rows = (await pool.query(
      `SELECT id, brand_name FROM target_companies WHERE id = ANY($1::uuid[])`,
      [ids]
    )).rows as { id: string; brand_name: string }[];

    // 직접 누르는 조회는 3쪽까지 본다 — 활성공고 "총 건수"까지 정확해야 하기 때문.
    const { updated } = await checkHiringFor(rows);

    return ok({ items: updated, checked: updated.length });
  } catch (e) {
    console.error("[check-hiring]", e);
    return err("SERVER_001", "조회 중 오류가 발생했습니다.", 500);
  }
}
