export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, requireAuth } from '@/lib/api'

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'company')
  if (authErr) return authErr

  const companyId = auth!.sub

  // 4가지 통계 한 번에 조회
  const [activeJobs, totalApplications, todayApplications, scrappedTalents] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS cnt FROM job_postings 
       WHERE company_id = $1 AND status = 'ACTIVE'`,
      [companyId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS cnt FROM applications a
       JOIN job_postings jp ON jp.id = a.job_posting_id
       WHERE jp.company_id = $1`,
      [companyId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS cnt FROM applications a
       JOIN job_postings jp ON jp.id = a.job_posting_id
       WHERE jp.company_id = $1 AND a.applied_at::date = CURRENT_DATE`,
      [companyId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS cnt FROM talent_scraps WHERE company_id = $1`,
      [companyId]
    ).catch(() => ({ rows: [{ cnt: 0 }] }))
  ])

  // 최근 7일 일별 지원자 추이
  const trendsRes = await pool.query(
    `SELECT TO_CHAR(d.day, 'MM/DD') AS label, COUNT(a.id)::int AS value
     FROM (SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS day) d
     LEFT JOIN applications a 
       ON a.applied_at::date = d.day 
       AND a.job_posting_id IN (SELECT id FROM job_postings WHERE company_id = $1)
     GROUP BY d.day
     ORDER BY d.day`,
    [companyId]
  )

  return ok({
    active_jobs: activeJobs.rows[0].cnt,
    total_applications: totalApplications.rows[0].cnt,
    today_applications: todayApplications.rows[0].cnt,
    scrapped_talents: scrappedTalents.rows[0].cnt,
    trends: trendsRes.rows
  })
}
