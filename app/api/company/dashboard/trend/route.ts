export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, requireAuth } from '@/lib/api'

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'company')
  if (authErr) return authErr

  const companyId = auth!.sub
  const sp = new URL(req.url).searchParams
  const rangeParam = sp.get('range')
  const range = rangeParam === '1m' ? '1m' : rangeParam === '3m' ? '3m' : '7d'
  const jobTypeParam = sp.get('job_type') // OFFICE | STORE | null
  const jobTypeFilter = jobTypeParam === 'OFFICE' || jobTypeParam === 'STORE'
    ? ` AND job_type = '${jobTypeParam}'`
    : ''

  // 기간별 버킷 (7일=일별, 1·3개월=주별) — 관리자 추이와 동일
  const cfg =
    range === '3m'
      ? { start: "date_trunc('week', now()) - interval '12 week'", step: "interval '1 week'", trunc: 'week' }
    : range === '1m'
      ? { start: "date_trunc('week', now()) - interval '3 week'", step: "interval '1 week'", trunc: 'week' }
      : { start: "now()::date - interval '6 day'", step: "interval '1 day'", trunc: 'day' }

  const q = await pool.query(
    `SELECT d::date AS day,
       (SELECT COUNT(*)::int FROM applications a
         WHERE date_trunc('${cfg.trunc}', a.applied_at) = d
           AND a.job_posting_id IN (SELECT id FROM job_postings WHERE company_id = $1${jobTypeFilter})
       ) AS value
     FROM generate_series(${cfg.start}, date_trunc('${cfg.trunc}', now()), ${cfg.step}) d
     ORDER BY day`,
    [companyId]
  )

  return ok({ range, rows: q.rows })
}
