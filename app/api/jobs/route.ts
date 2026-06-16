export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok } from '@/lib/api'

const TYPE_MAP: Record<string, string> = {
  "기업": "OFFICE",
  "매장": "STORE",
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jobType = searchParams.get('job_type')
  const location = searchParams.get('location')
  const type = searchParams.get('type')
  const sido = searchParams.get('sido')
  const sigungu = searchParams.get('sigungu')
  const regions = searchParams.get('regions')
  const q = searchParams.get('q')
  const active = searchParams.get('active')
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
    where.push(`job_type = $${idx++}`)
    params.push(TYPE_MAP[type])
  }
  if (regions) {
    const list = regions.split(',').map((s) => s.trim()).filter(Boolean)
    if (list.length) {
      const ors = list.map((r) => {
        const keyword = r.endsWith(' 전체') ? r.replace(' 전체', '').slice(0, 2) : r.split(' ').pop()
        params.push(`%${keyword}%`)
        return `location ILIKE $${idx++}`
      })
      where.push(`(${ors.join(' OR ')})`)
    }
  } else if (sigungu) {
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
  if (active) {
    where.push(`deadline IS NOT NULL`)
    where.push(`deadline::date >= CURRENT_DATE`)
    where.push(`deadline::date <= CURRENT_DATE + 14`)
    where.push(`(deadline::date - created_at::date) <= 30`)
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  // active 모드: 2단계 정렬 (1단계 마감임박 + 2단계 기업 적극성)
  const activeOrderBy = `
    deadline::date ASC,
    CASE
      WHEN app_stats.total_apps >= 3
      THEN COALESCE(app_stats.view_rate, 0.5)
      ELSE 0.5
    END DESC,
    created_at DESC
  `

  const listQuery = active ? `
    SELECT j.id, j.title, j.job_type, j.company_id, j.company_name, j.brand_name, j.logo_url, j.company_type,
           j.location, j.work_type, j.employment_type, j.salary_min, j.salary_max, j.salary_type,
           j.experience_level, j.is_featured, j.deadline, j.created_at, j.categories, j.benefit_tags
    FROM v_active_jobs j
    LEFT JOIN (
      SELECT
        job_id,
        COUNT(*) AS total_apps,
        COUNT(viewed_at) AS viewed_apps,
        CASE WHEN COUNT(*) > 0
          THEN COUNT(viewed_at)::float / COUNT(*)
          ELSE 0.5
        END AS view_rate
      FROM applications
      GROUP BY job_id
    ) app_stats ON app_stats.job_id = j.id
    ${whereClause}
    ORDER BY ${activeOrderBy}
    LIMIT $${idx++} OFFSET $${idx++}
  ` : `
    SELECT id, title, job_type, company_id, company_name, brand_name, logo_url, company_type,
           location, work_type, employment_type, salary_min, salary_max, salary_type,
           experience_level, is_featured, deadline, created_at, categories, benefit_tags
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