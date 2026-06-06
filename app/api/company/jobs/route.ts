export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

// 내 공고 목록
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'company')
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  const where: string[] = ['company_id = $1']
  const params: any[] = [auth!.sub]
  let idx = 2

  if (status) {
    where.push(`status = $${idx++}`)
    params.push(status)
  }

  const whereClause = where.join(' AND ')

  const listQuery = `
    SELECT id, title, job_type, status, view_count, application_count,
           deadline, is_featured, created_at, closed_at
    FROM job_postings
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `
  params.push(limit, offset)

  const countQuery = `SELECT COUNT(*)::int AS total FROM job_postings WHERE ${whereClause}`
  const countParams = params.slice(0, params.length - 2)

  const [listRes, countRes] = await Promise.all([
    pool.query(listQuery, params),
    pool.query(countQuery, countParams)
  ])

  return ok(listRes.rows, 200, {
    page, limit, total: countRes.rows[0].total
  })
}

// 공고 등록
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'company')
  if (authErr) return authErr

  const body = await req.json()
  const {
    title, job_type, job_category_id, description, requirements,
    preferred_qualifications, salary_min, salary_max, salary_type,
    location, address, work_type, experience_level, deadline, categories,
    detail_images, hiring_process, notes, benefits
  } = body

  if (!title || !job_type) {
    return err('JOB_002', '제목과 직군 유형은 필수입니다.')
  }

  const result = await pool.query(
    `INSERT INTO job_postings (
       company_id, title, job_type, job_category_id, description,
       requirements, preferred_qualifications, salary_min, salary_max,
       salary_type, location, address, work_type, experience_level,
       deadline, categories, detail_images, hiring_process, notes, benefits, status
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'ACTIVE'
     ) RETURNING id, title, status, created_at`,
    [
      auth!.sub, title, job_type, job_category_id || null, description || null,
      requirements || null, preferred_qualifications || null,
      salary_min || null, salary_max || null, salary_type || null,
      location || null, address || null, work_type || null,
      experience_level || 'ANY', deadline || null, categories || [],
      JSON.stringify(detail_images || []),
      JSON.stringify(hiring_process || []),
      notes || null,
      benefits || null
    ]
  )
  return ok(result.rows[0], 201)
}
