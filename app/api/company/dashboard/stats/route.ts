export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, requireAuth } from '@/lib/api'

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'company')
  if (authErr) return authErr

  const companyId = auth!.sub
  const jobTypeParam = req.nextUrl.searchParams.get('job_type') // OFFICE | STORE | null
  const jobTypeFilter = jobTypeParam === 'OFFICE' || jobTypeParam === 'STORE'
    ? ` AND jp.job_type = '${jobTypeParam}'`
    : ''
  // job_postings 단독 쿼리용 (별칭 없음)
  const jobTypeFilterNoAlias = jobTypeParam === 'OFFICE' || jobTypeParam === 'STORE'
    ? ` AND job_type = '${jobTypeParam}'`
    : ''

  // 상단 통계 카운터 한 번에 조회
  const [activeJobs, totalApplications, todayApplications] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS cnt FROM job_postings 
       WHERE company_id = $1 AND status = 'ACTIVE'${jobTypeFilterNoAlias}`,
      [companyId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS cnt FROM applications a
       JOIN job_postings jp ON jp.id = a.job_posting_id
       WHERE jp.company_id = $1 AND a.hidden_by_company = false AND a.status <> 'WITHDRAWN'${jobTypeFilter}`,
      [companyId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS cnt FROM applications a
       JOIN job_postings jp ON jp.id = a.job_posting_id
       WHERE jp.company_id = $1 AND a.hidden_by_company = false AND a.status <> 'WITHDRAWN' AND a.applied_at::date = CURRENT_DATE${jobTypeFilter}`,
      [companyId]
    ),
  ])

  // 최근 7일 일별 지원자 추이
  const trendsRes = await pool.query(
    `SELECT TO_CHAR(d.day, 'MM/DD') AS label, COUNT(a.id)::int AS value
     FROM (SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS day) d
     LEFT JOIN applications a
       ON a.applied_at::date = d.day
       AND a.hidden_by_company = false AND a.status <> 'WITHDRAWN'
       AND a.job_posting_id IN (SELECT id FROM job_postings WHERE company_id = $1${jobTypeFilterNoAlias})
     GROUP BY d.day
     ORDER BY d.day`,
    [companyId]
  )

  // 공고별 지원 전환율 (진행중 공고, 조회수 높은 순)
  const conversionRes = await pool.query(
    `SELECT id, title, view_count::int AS view_count,
            (SELECT COUNT(*)::int FROM applications a
               WHERE a.job_posting_id = job_postings.id AND a.hidden_by_company = false AND a.status <> 'WITHDRAWN') AS application_count
     FROM job_postings
     WHERE company_id = $1 AND status = 'ACTIVE'${jobTypeFilterNoAlias}
     ORDER BY view_count DESC
     LIMIT 6`,
    [companyId]
  )
  const job_conversion = conversionRes.rows.map((r) => ({
    id: r.id,
    title: r.title,
    view_count: r.view_count,
    application_count: r.application_count,
    rate: r.view_count > 0 ? Math.round((r.application_count / r.view_count) * 1000) / 10 : null,
  }))

  // 오늘 마감 — 오늘 안에 손쓰지 않으면 내려가는 공고. '3일 내'는 오늘 할 일과 섞여 급한 정도가 흐려진다.
  const deadlineTodayRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt
     FROM job_postings
     WHERE company_id = $1 AND status = 'ACTIVE' AND deadline IS NOT NULL
       AND deadline::date = CURRENT_DATE${jobTypeFilterNoAlias}`,
    [companyId]
  )

  return ok({
    active_jobs: activeJobs.rows[0].cnt,
    total_applications: totalApplications.rows[0].cnt,
    today_applications: todayApplications.rows[0].cnt,
    trends: trendsRes.rows,
    job_conversion,
    deadline_today: deadlineTodayRes.rows[0].cnt,
  })
}
