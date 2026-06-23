export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

// 입사지원 목록 (지원자 + 공고 + 기업 조인)
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT
        a.id, a.status, a.applied_at, a.cover_letter, a.resume_snapshot,
        u.name AS applicant_name,
        u.avatar_url,
        COALESCE(a.resume_id, (SELECT r.id FROM resumes r WHERE r.user_id = u.id ORDER BY r.updated_at DESC LIMIT 1)) AS resume_id,
        jp.title AS position,
        c.company_name,
        jc.name AS job_category
      FROM applications a
      JOIN users u ON u.id = a.user_id
      JOIN job_postings jp ON jp.id = a.job_posting_id
      JOIN companies c ON c.id = jp.company_id
      LEFT JOIN job_categories jc ON jc.id = jp.job_category_id
      ORDER BY a.applied_at DESC
    `)
    return ok({ items: result.rows })
  } finally {
    client.release()
  }
}

// 지원 상태 변경
export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const { id, status } = await req.json()
  if (!id || !status) return err('BAD_REQUEST', 'id, status 필요', 400)
  if (!['APPLIED', 'VIEWED', 'INTERVIEW', 'PASSED', 'REJECTED', 'WITHDRAWN'].includes(status))
    return err('BAD_REQUEST', '잘못된 status', 400)

  const client = await pool.connect()
  try {
    await client.query(`UPDATE applications SET status = $1::app_status, status_updated_at = now(), updated_at = now() WHERE id = $2`, [status, id])
    return ok({ success: true })
  } finally {
    client.release()
  }
}