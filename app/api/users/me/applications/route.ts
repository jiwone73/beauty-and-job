export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, requireAuth } from '@/lib/api'

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'user')
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  const where: string[] = ['a.user_id = $1', 'a.hidden_by_user IS NOT TRUE']
  const params: any[] = [auth!.sub]
  let idx = 2

  if (status) {
    where.push(`a.status = $${idx++}`)
    params.push(status)
  }

  const listQuery = `
    SELECT
      a.id, a.status, a.applied_at, a.viewed_at,
      jp.id AS job_id, jp.title AS job_title, jp.location, jp.deadline,
      c.company_name, c.brand_name, c.logo_url
    FROM applications a
    JOIN job_postings jp ON jp.id = a.job_posting_id
    JOIN companies c ON c.id = jp.company_id
    WHERE ${where.join(' AND ')}
    ORDER BY a.applied_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `
  params.push(limit, offset)

  const countQuery = `SELECT COUNT(*)::int AS total FROM applications a WHERE ${where.join(' AND ')}`
  const countParams = params.slice(0, params.length - 2)

  const [listRes, countRes] = await Promise.all([
    pool.query(listQuery, params),
    pool.query(countQuery, countParams)
  ])

  return ok(listRes.rows, 200, { page, limit, total: countRes.rows[0].total })
}
