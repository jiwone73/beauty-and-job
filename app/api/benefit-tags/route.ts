export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 복리후생 태그 마스터 — 공고등록 폼의 검색/자동완성 + 새 태그 소프트 등록.
// 테이블: benefit_tags (migrations/2026-08-10_benefit_tags.sql)

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

// 태그 조회(검색/자동완성). job_type=STORE|OFFICE → 해당 + BOTH 노출.
export async function GET(req: NextRequest) {
  const { res: authErr } = requireAuth(req); // 관리자·기업회원 모두 허용
  if (authErr) return authErr;
  const sp = new URL(req.url).searchParams;
  const jt = (sp.get("job_type") || "").toUpperCase();
  const q = norm(sp.get("q") || "");

  const where: string[] = [];
  const params: unknown[] = [];
  if (jt === "STORE" || jt === "OFFICE") { params.push(jt); where.push(`(job_type = $${params.length} OR job_type = 'BOTH')`); }
  if (q) { params.push(`%${q}%`); where.push(`name ILIKE $${params.length}`); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const r = await pool.query(
    `SELECT name, job_type, is_curated FROM benefit_tags ${whereSql}
     ORDER BY is_curated DESC, usage_count DESC, name ASC LIMIT 100`,
    params
  );
  return ok({ items: r.rows });
}

// 새 태그 소프트 등록(기업이 목록에 없는 복리후생 추가). is_curated=false로 저장, 관리자가 나중에 정규화.
export async function POST(req: NextRequest) {
  const { res: authErr } = requireAuth(req);
  if (authErr) return authErr;
  const body = await req.json().catch(() => ({}));
  const name = norm(String(body.name || ""));
  let jt = String(body.job_type || "BOTH").toUpperCase();
  if (!["STORE", "OFFICE", "BOTH"].includes(jt)) jt = "BOTH";
  if (name.length < 1 || name.length > 40) return err("BAD_REQUEST", "태그는 1~40자여야 합니다.", 400);

  // 이미 있으면 사용횟수만 +1, 없으면 미검수 태그로 삽입
  const r = await pool.query(
    `INSERT INTO benefit_tags (name, job_type, is_curated, usage_count)
     VALUES ($1, $2, false, 1)
     ON CONFLICT (name, job_type) DO UPDATE SET usage_count = benefit_tags.usage_count + 1
     RETURNING name, job_type, is_curated`,
    [name, jt]
  );
  return ok(r.rows[0]);
}
