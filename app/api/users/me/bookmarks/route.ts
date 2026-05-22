export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// GET: 북마크 목록 (공고 정보 포함)
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  const result = await pool.query(
    `SELECT
       b.id, b.created_at, b.job_posting_id,
       jp.title, jp.location, jp.deadline, jp.status, jp.job_type,
       c.company_name, c.brand_name, c.logo_url
     FROM bookmarks b
     JOIN job_postings jp ON jp.id = b.job_posting_id
     JOIN companies c ON c.id = jp.company_id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
    [auth!.sub]
  );
  return ok(result.rows);
}

// POST: 북마크 추가
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const { job_posting_id } = body;

  if (!job_posting_id) {
    return err("VALIDATION_001", "job_posting_id가 필요합니다.", 400);
  }

  // 공고 존재 확인
  const jobRes = await pool.query(
    `SELECT id FROM job_postings WHERE id = $1`,
    [job_posting_id]
  );
  if (jobRes.rowCount === 0) {
    return err("JOB_001", "공고를 찾을 수 없습니다.", 404);
  }

  // 중복 체크
  const existRes = await pool.query(
    `SELECT id FROM bookmarks WHERE user_id = $1 AND job_posting_id = $2`,
    [auth!.sub, job_posting_id]
  );
  if (existRes.rowCount && existRes.rowCount > 0) {
    return ok({ id: existRes.rows[0].id, already: true });
  }

  // 추가
  const result = await pool.query(
    `INSERT INTO bookmarks (user_id, job_posting_id) VALUES ($1, $2) RETURNING id, created_at`,
    [auth!.sub, job_posting_id]
  );
  return ok(result.rows[0], 201);
}

// DELETE: 북마크 해제
export async function DELETE(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const job_posting_id = searchParams.get("job_posting_id");

  if (!job_posting_id) {
    return err("VALIDATION_001", "job_posting_id가 필요합니다.", 400);
  }

  await pool.query(
    `DELETE FROM bookmarks WHERE user_id = $1 AND job_posting_id = $2`,
    [auth!.sub, job_posting_id]
  );
  return ok({ deleted: true });
}