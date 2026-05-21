export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, requireAuth } from '@/lib/api'

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'company')
  if (authErr) return authErr

  const companyId = auth!.sub
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '10')

  const result = await pool.query(
    `SELECT 
       a.id, a.status, a.applied_at, a.viewed_at,
       u.name AS user_name,
       jp.id AS job_id, jp.title AS job_title,
       jp.experience_level
     FROM applications a
     JOIN job_postings jp ON jp.id = a.job_posting_id
     JOIN users u ON u.id = a.user_id
     WHERE jp.company_id = $1
     ORDER BY a.applied_at DESC
     LIMIT $2`,
    [companyId, limit]
  )

  return ok(result.rows)
}
