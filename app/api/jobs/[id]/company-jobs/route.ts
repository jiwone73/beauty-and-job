export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // 현재 공고를 올린 회사의, 다른 진행중 공고 개수 (자기 자신·비활성·마감 제외)
  const result = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM job_postings jp
     WHERE jp.company_id = (SELECT company_id FROM job_postings WHERE id = $1)
       AND jp.id <> $1
       AND jp.status = 'ACTIVE'
       AND (jp.deadline IS NULL OR jp.deadline >= NOW())`,
    [id]
  );

  return ok({ total: result.rows[0]?.total ?? 0 });
}
