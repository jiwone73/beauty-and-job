export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'
// 회원 목록 조회 (개인)
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT
        u.id, u.name, u.email::text AS email, u.phone, u.job_type, u.status,
        u.kakao_id, u.naver_id, u.gender, u.birth_date, u.region_sido, u.region_sigungu,
        u.office_job_areas, u.portfolio_url, u.last_login_at, u.created_at, u.avatar_url,
        (SELECT r.id FROM resumes r WHERE r.user_id = u.id ORDER BY r.updated_at DESC LIMIT 1) AS resume_id,
        (SELECT r.career_type FROM resumes r WHERE r.user_id = u.id ORDER BY r.updated_at DESC LIMIT 1) AS career_type,
        (SELECT COUNT(*)::int FROM company_talent_scraps s WHERE s.user_id = u.id) AS scrap_count,
        (SELECT uc.company FROM user_careers uc WHERE uc.user_id = u.id
          ORDER BY uc.start_date DESC NULLS LAST LIMIT 1) AS recent_company,
        (SELECT uc.position FROM user_careers uc WHERE uc.user_id = u.id
          ORDER BY uc.start_date DESC NULLS LAST LIMIT 1) AS recent_position,
        (SELECT uc.start_date FROM user_careers uc WHERE uc.user_id = u.id
          ORDER BY uc.start_date DESC NULLS LAST LIMIT 1) AS recent_start_date,
        (SELECT uc.end_date FROM user_careers uc WHERE uc.user_id = u.id
          ORDER BY uc.start_date DESC NULLS LAST LIMIT 1) AS recent_end_date
      FROM users u
      ORDER BY u.created_at DESC
    `)
    return ok({ items: result.rows })
  } finally {
    client.release()
  }
}
// 회원 상태 변경
export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr
  const { id, status } = await req.json()
  if (!id || !status) return err('BAD_REQUEST', 'id, status 필요', 400)
  if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status))
    return err('BAD_REQUEST', '잘못된 status', 400)
  const client = await pool.connect()
  try {
    await client.query(`UPDATE users SET status = $1::user_status, updated_at = now() WHERE id = $2`, [status, id])
    return ok({ success: true })
  } finally {
    client.release()
  }
}
// 회원 삭제
export async function DELETE(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return err('BAD_REQUEST', 'id 필요', 400)
  const client = await pool.connect()
  try {
    await client.query(`DELETE FROM users WHERE id = $1`, [id])
    return ok({ success: true })
  } finally {
    client.release()
  }
}