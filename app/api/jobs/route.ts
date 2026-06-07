export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok } from '@/lib/api'

const TYPE_MAP: Record<string, string[]> = {
  "기업": ["OFFICE", "BOTH"],
  "매장": ["STORE", "BOTH"],
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jobType = searchParams.get('job_type')
  const location = searchParams.get('location')
  const type = searchParams.get('type')
  const sido = searchParams.get('sido')
  const sigungu = searchParams.get('sigungu')
  const q = searchParams.get('q')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

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
  if (type && TYPE_MAP[type]) {
    const types = TYPE_MAP[type]
    const placeholders = types.map(() => `$${idx++}`).join(', ')
    where.push(`company_type IN (${placeholders})`)
    params.push(...types)
  }
  if (sigungu) {
    where.push(`location ILIKE $${idx++}`)
    params.push(`%${sigungu}%`)
  } else if (sido) {
    where.push(`location ILIKE $${idx++}`)
    params.push(`%${sido.slice(0, 2)}%`)
  }
  if (q) {
    const kw = `%${q}%`
    where.push(`(title ILIKE $${idx} OR brand_name ILIKE $${idx + 1} OR company_name ILIKE $${idx + 2})`)
    params.push(kw, kw, kw)
    idx += 3
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const listQuery = `
    SELECT id, title, job_type, company_id, company_name, brand_name, logo_url, company_type,
           location, work_type, salary_min, salary_max, salary_type,
           experience_level, is_featured, deadline, created_at, categories
    FROM v_active_jobs
    ${whereClause}
    ORDER BY is_featured DESC, created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `
  params.push(limit, offset)

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
