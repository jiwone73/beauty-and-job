export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, requireAuth } from '@/lib/api'

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'company')
  if (authErr) return authErr

  const companyId = auth!.sub
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('job_id')
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = (page - 1) * limit

  const where: string[] = ['jp.company_id = $1']
  const params: any[] = [companyId]
  let idx = 2

  if (jobId) {
    where.push(`a.job_posting_id = $${idx++}`)
    params.push(jobId)
  }
  if (status) {
    where.push(`a.status = $${idx++}`)
    params.push(status)
  }

  const whereClause = where.join(' AND ')

  const result = await pool.query(
    `SELECT
       a.id, a.status, a.applied_at, a.viewed_at, a.cover_letter,
       COALESCE(a.resume_id, (SELECT r.id FROM resumes r WHERE r.user_id = u.id ORDER BY r.updated_at DESC LIMIT 1)) AS resume_id,
       u.name AS user_name,
       u.email AS user_email,
       u.phone AS user_phone,
       u.gender AS user_gender,
       u.job_type AS user_job_type,
       u.avatar_url AS user_avatar_url,
       u.portfolio_url, u.portfolio_filename,
       EXISTS(SELECT 1 FROM company_talent_scraps s WHERE s.company_id = $1 AND s.user_id = u.id) AS scrapped,
       jp.id AS job_id, jp.title AS job_title,
       jp.experience_level
     FROM applications a
     JOIN job_postings jp ON jp.id = a.job_posting_id
     JOIN users u ON u.id = a.user_id
     WHERE ${whereClause}
     ORDER BY a.applied_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  )

  return ok(result.rows)
}
