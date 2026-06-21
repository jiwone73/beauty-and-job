export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, requireAuth } from '@/lib/api'

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const sp = new URL(req.url).searchParams
  const type = sp.get('type') || 'signup'
  const rangeParam = sp.get('range')
  const range = rangeParam === '1m' ? '1m' : rangeParam === '3m' ? '3m' : rangeParam === '1y' ? '1y' : '7d'

  const cfg =
    range === '1y'
      ? { start: "date_trunc('month', now()) - interval '11 month'", step: "interval '1 month'", trunc: 'month' }
    : range === '3m'
      ? { start: "date_trunc('week', now()) - interval '12 week'", step: "interval '1 week'", trunc: 'week' }
    : range === '1m'
      ? { start: "date_trunc('week', now()) - interval '3 week'", step: "interval '1 week'", trunc: 'week' }
      : { start: "now()::date - interval '6 day'", step: "interval '1 day'", trunc: 'day' }

  const series = `generate_series(${cfg.start}, date_trunc('${cfg.trunc}', now()), ${cfg.step}) d`

  const client = await pool.connect()
  try {
    let rows = []

    if (type === 'signup') {
      const q = await client.query(`
        SELECT d::date AS day,
          (SELECT COUNT(*) FROM users WHERE date_trunc('${cfg.trunc}', created_at) = d) AS users,
          (SELECT COUNT(*) FROM users WHERE date_trunc('${cfg.trunc}', created_at) = d AND job_type = 'STORE') AS users_store,
          (SELECT COUNT(*) FROM users WHERE date_trunc('${cfg.trunc}', created_at) = d AND job_type = 'OFFICE') AS users_office
        FROM ${series} ORDER BY day
      `)
      rows = q.rows
    } else if (type === 'company') {
      const q = await client.query(`
        SELECT d::date AS day,
          (SELECT COUNT(*) FROM companies WHERE date_trunc('${cfg.trunc}', created_at) = d) AS companies,
          (SELECT COUNT(*) FROM companies WHERE date_trunc('${cfg.trunc}', created_at) = d AND company_type = 'STORE') AS companies_store,
          (SELECT COUNT(*) FROM companies WHERE date_trunc('${cfg.trunc}', created_at) = d AND company_type = 'OFFICE') AS companies_office,
          (SELECT COUNT(*) FROM companies WHERE date_trunc('${cfg.trunc}', created_at) = d AND company_type = 'BOTH') AS companies_both
        FROM ${series} ORDER BY day
      `)
      rows = q.rows
    } else if (type === 'apply') {
      const q = await client.query(`
        SELECT d::date AS day,
          (SELECT COUNT(*) FROM applications WHERE date_trunc('${cfg.trunc}', applied_at) = d) AS count
        FROM ${series} ORDER BY day
      `)
      rows = q.rows
    } else if (type === 'job') {
      const q = await client.query(`
        SELECT d::date AS day,
          (SELECT COUNT(*) FROM job_postings WHERE date_trunc('${cfg.trunc}', created_at) = d) AS total,
          (SELECT COUNT(*) FROM job_postings WHERE date_trunc('${cfg.trunc}', created_at) = d AND job_type = 'STORE') AS store,
          (SELECT COUNT(*) FROM job_postings WHERE date_trunc('${cfg.trunc}', created_at) = d AND job_type = 'OFFICE') AS office,
          (SELECT COUNT(*) FROM job_postings jp JOIN companies c2 ON c2.id = jp.company_id WHERE date_trunc('${cfg.trunc}', jp.created_at) = d AND c2.company_type = 'BOTH') AS both
        FROM ${series} ORDER BY day
      `)
      rows = q.rows
    }

    return ok({ type, range, rows })
  } finally {
    client.release()
  }
}
