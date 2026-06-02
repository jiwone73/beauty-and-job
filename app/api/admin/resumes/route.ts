export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

// 이력서 목록 (지원자 정보 + 스킬 + 최신 학력 조인)
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT
        r.id, r.title, r.is_public, r.status,
        r.desired_location, r.desired_salary_min, r.desired_salary_max, r.desired_salary_type,
        r.career_type, r.created_at, r.updated_at,
        u.name, u.email::text AS email, u.phone, u.gender, u.birth_date,
        jc.name AS job_category,
        COALESCE(sk.skills, '[]'::json) AS skills,
        edu.school_name, edu.degree, edu.graduation_status
      FROM resumes r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN job_categories jc ON jc.id = r.desired_job_category_id
      LEFT JOIN LATERAL (
        SELECT json_agg(s.name ORDER BY s.created_at) AS skills
        FROM resume_skills s WHERE s.resume_id = r.id
      ) sk ON true
      LEFT JOIN LATERAL (
        SELECT school_name, degree, graduation_status
        FROM resume_educations e WHERE e.resume_id = r.id
        ORDER BY e.sort_order, e.created_at DESC LIMIT 1
      ) edu ON true
      ORDER BY r.updated_at DESC
    `)
    return ok({ items: result.rows })
  } finally {
    client.release()
  }
}

// 이력서 공개여부 변경
export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const { id, is_public } = await req.json()
  if (!id || typeof is_public !== 'boolean') return err('BAD_REQUEST', 'id, is_public 필요', 400)

  const client = await pool.connect()
  try {
    await client.query(`UPDATE resumes SET is_public = $1, updated_at = now() WHERE id = $2`, [is_public, id])
    return ok({ success: true })
  } finally {
    client.release()
  }
}

// 이력서 삭제
export async function DELETE(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return err('BAD_REQUEST', 'id 필요', 400)

  const client = await pool.connect()
  try {
    await client.query(`DELETE FROM resume_skills WHERE resume_id = $1`, [id])
    await client.query(`DELETE FROM resume_careers WHERE resume_id = $1`, [id])
    await client.query(`DELETE FROM resume_educations WHERE resume_id = $1`, [id])
    await client.query(`DELETE FROM resumes WHERE id = $1`, [id])
    return ok({ success: true })
  } finally {
    client.release()
  }
}