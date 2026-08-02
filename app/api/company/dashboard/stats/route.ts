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

  // 4가지 통계 한 번에 조회
  const [activeJobs, totalApplications, todayApplications, scrappedTalents] = await Promise.all([
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
       AND a.hidden_by_company = false AND a.status <> 'WITHDRAWN'
       AND a.job_posting_id IN (SELECT id FROM job_postings WHERE company_id = $1${jobTypeFilterNoAlias})
     GROUP BY d.day
     ORDER BY d.day`,
    [companyId]
  )

  // 지원자 처리 현황 (상태별 분포 + 미열람)
  const [statusRes, unviewedRes] = await Promise.all([
    pool.query(
      `SELECT a.status AS status, COUNT(*)::int AS cnt
       FROM applications a
       JOIN job_postings jp ON jp.id = a.job_posting_id
       WHERE jp.company_id = $1 AND a.hidden_by_company = false AND a.status <> 'WITHDRAWN'${jobTypeFilter}
       GROUP BY a.status`,
      [companyId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM applications a
       JOIN job_postings jp ON jp.id = a.job_posting_id
       WHERE jp.company_id = $1 AND a.hidden_by_company = false AND a.status <> 'WITHDRAWN' AND a.viewed_at IS NULL${jobTypeFilter}`,
      [companyId]
    ),
  ])

  const statusMap: Record<string, number> = {}
  for (const r of statusRes.rows) statusMap[r.status] = r.cnt
  const status_breakdown = {
    new: statusMap['APPLIED'] ?? 0,
    reviewing: statusMap['VIEWED'] ?? 0,
    passed: statusMap['PASSED'] ?? 0,
    rejected: statusMap['REJECTED'] ?? 0,
  }

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

  // 직군별 지원 분포 (공고 대표 직군 = categories[1] 기준)
  const groupDistRes = await pool.query(
    `SELECT COALESCE(jp.categories[1], '미분류') AS name, COUNT(*)::int AS value
     FROM applications a
     JOIN job_postings jp ON jp.id = a.job_posting_id
     WHERE jp.company_id = $1${jobTypeFilter}
     GROUP BY COALESCE(jp.categories[1], '미분류')
     ORDER BY value DESC`,
    [companyId]
  )
  const gdRows = groupDistRes.rows as { name: string; value: number }[]
  let job_group_dist = gdRows
  if (gdRows.length > 6) {
    const top = gdRows.slice(0, 5)
    const etc = gdRows.slice(5).reduce((sum, r) => sum + r.value, 0)
    job_group_dist = [...top, { name: '기타', value: etc }]
  }

  // 마감 임박/지난 공고 (진행중, 마감일 3일 이내 또는 지남)
  const deadlineRes = await pool.query(
    `SELECT id, title, deadline, (deadline::date - CURRENT_DATE)::int AS days_left
     FROM job_postings
     WHERE company_id = $1 AND status = 'ACTIVE' AND deadline IS NOT NULL
       AND deadline::date <= CURRENT_DATE + 3${jobTypeFilterNoAlias}
     ORDER BY deadline ASC
     LIMIT 6`,
    [companyId]
  )
  const deadline_alerts = deadlineRes.rows

  return ok({
    active_jobs: activeJobs.rows[0].cnt,
    total_applications: totalApplications.rows[0].cnt,
    today_applications: todayApplications.rows[0].cnt,
    scrapped_talents: scrappedTalents.rows[0].cnt,
    trends: trendsRes.rows,
    status_breakdown,
    unviewed: unviewedRes.rows[0].cnt,
    job_conversion,
    job_group_dist,
    deadline_alerts,
  })
}
