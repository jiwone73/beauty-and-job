export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // 현재 공고의 직군·지역 조회
  const cur = await pool.query(
    `SELECT job_type, location FROM job_postings WHERE id = $1`,
    [id]
  );
  if (cur.rowCount === 0) {
    return err("JOB_001", "공고를 찾을 수 없습니다.", 404);
  }
  const { job_type, location } = cur.rows[0];

  // 지역 앞부분(시/도) 추출 - location이 "서울특별시 강남구 ..." 형태
  const sidoPrefix = location ? String(location).trim().slice(0, 2) : "";

  // 같은 직군 + (같은 시/도 우선) 다른 공고, 자기 자신·비활성 제외
  const result = await pool.query(
    `SELECT jp.id, jp.title, jp.location, jp.experience_level,
            c.brand_name, c.company_name, c.logo_url,
            CASE WHEN jp.location ILIKE $3 THEN 1 ELSE 0 END AS region_match
     FROM job_postings jp
     JOIN companies c ON c.id = jp.company_id
     WHERE jp.id <> $1
       AND jp.job_type = $2
       AND jp.status = 'ACTIVE'
       AND (jp.deadline IS NULL OR jp.deadline >= NOW())
     ORDER BY region_match DESC, jp.created_at DESC
     LIMIT 4`,
    [id, job_type, sidoPrefix ? `${sidoPrefix}%` : "%"]
  );

  return ok({ related: result.rows });
}
