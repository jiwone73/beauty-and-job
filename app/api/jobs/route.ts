export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok } from '@/lib/api'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jobType = searchParams.get('job_type')
  const location = searchParams.get('location')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  // 동적 WHERE 절 조립
  const where: string[] = []
  const params: any[] = []
  let idx = 1

  if (jobType) {
    where.push(`job_type = $${idx++}`)
    params.push(jobType)
  }
  if (location) {
    where.push(`location ILIKE $${idx++}`)
    params.push(`%${location}%`)
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  // 목록 조회
  const listQuery = `
    SELECT id, title, job_type, company_id, company_name, brand_name, logo_url, company_type,
           location, work_type, salary_min, salary_max, salary_type,
           is_featured, deadline, created_at
    FROM v_active_jobs
    ${whereClause}
    ORDER BY is_featured DESC, created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `
  params.push(limit, offset)

  // 카운트
  const countQuery = `SELECT COUNT(*)::int AS total FROM v_active_jobs ${whereClause}`
  const countParams = params.slice(0, params.length - 2)

  const [listRes, countRes] = await Promise.all([
    pool.query(listQuery, params),
    pool.query(countQuery, countParams)
  ])

  return ok(listRes.rows, 200, {
    page,
    limit,
    total: countRes.rows[0].total
  })
}
