export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

// 공고 목록 조회
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const jobType = searchParams.get('job_type')
  const search = searchParams.get('search')

  const where: string[] = []
  const params: any[] = []
  let idx = 1

  if (status) { where.push(`jp.status = $${idx++}`); params.push(status) }
  if (jobType) { where.push(`jp.job_type = $${idx++}`); params.push(jobType) }
  if (search) {
    where.push(`(jp.title ILIKE $${idx} OR c.company_name ILIKE $${idx})`)
    params.push(`%${search}%`); idx++
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT
        jp.id, jp.title, jp.job_type, jp.status, jp.location,
        jp.experience_level, jp.view_count, jp.application_count, jp.created_at,
        c.company_name,
        jc.name AS category_name
      FROM job_postings jp
      JOIN companies c ON c.id = jp.company_id
      LEFT JOIN job_categories jc ON jc.id = jp.job_category_id
      ${whereClause}
      ORDER BY jp.created_at DESC
    `, params)
    return ok({ items: result.rows })
  } finally {
    client.release()
  }
}

// 공고 직접 등록 (관리자 — company_id를 직접 받음)
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const body = await req.json()
  const {
    company_id, title, job_type, job_category_id, description, requirements,
    preferred_qualifications, salary_min, salary_max, salary_type,
    location, address, work_type, experience_level, deadline, categories,
    detail_images, hiring_process, notes, benefits
  } = body

  if (!company_id) return err('JOB_001', '기업을 선택해주세요.')
  if (!title || !job_type) return err('JOB_002', '제목과 채용유형은 필수입니다.')

  const client = await pool.connect()
  try {
    const result = await client.query(
      `INSERT INTO job_postings (
         company_id, title, job_type, job_category_id, description,
         requirements, preferred_qualifications, salary_min, salary_max,
         salary_type, location, address, work_type, experience_level,
         deadline, categories, detail_images, hiring_process, notes, benefits, status
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'ACTIVE'
       ) RETURNING id, title, status, created_at`,
      [
        company_id, title, job_type, job_category_id || null, description || null,
        requirements || null, preferred_qualifications || null,
        salary_min || null, salary_max || null, salary_type || null,
        location || null, address || null, work_type || null,
        experience_level || 'ANY', deadline || null, categories || [],
        JSON.stringify(detail_images || []),
        JSON.stringify(hiring_process || []),
        notes || null, benefits || null
      ]
    )
    return ok(result.rows[0], 201)
  } finally {
    client.release()
  }
}

// 공고 상태 변경
export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const { id, status } = await req.json()
  if (!id || !status) return err('BAD_REQUEST', 'id, status 필요', 400)
  if (!['ACTIVE', 'DRAFT', 'CLOSED', 'HIDDEN', 'EXPIRED'].includes(status))
    return err('BAD_REQUEST', '잘못된 status', 400)

  const client = await pool.connect()
  try {
    await client.query(`UPDATE job_postings SET status = $1, updated_at = now() WHERE id = $2`, [status, id])
    return ok({ success: true })
  } finally {
    client.release()
  }
}

// 공고 삭제
export async function DELETE(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return err('BAD_REQUEST', 'id 필요', 400)

  const client = await pool.connect()
  try {
    await client.query(`DELETE FROM applications WHERE job_posting_id = $1`, [id])
    await client.query(`DELETE FROM job_postings WHERE id = $1`, [id])
    return ok({ success: true })
  } finally {
    client.release()
  }
}