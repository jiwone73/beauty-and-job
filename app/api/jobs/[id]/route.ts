export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, getAuth } from '@/lib/api'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const auth = getAuth(req)

  // 공고 + 기업 정보 조회
  const jobRes = await pool.query(
    `SELECT 
       jp.*,
       c.id AS company_id,
       c.company_name,
       c.brand_name,
       c.logo_url,
       c.company_type,
       c.description AS company_description,
       c.website_url
     FROM job_postings jp
     JOIN companies c ON c.id = jp.company_id
     WHERE jp.id = $1 AND jp.status = 'ACTIVE'`,
    [id]
  )

  if (jobRes.rowCount === 0) {
    return err('JOB_001', '공고를 찾을 수 없거나 마감되었습니다.', 404)
  }

  const job = jobRes.rows[0]

  // 조회수 +1 (비동기로 처리, 응답 지연 안 시킴)
  pool.query(
    'UPDATE job_postings SET view_count = view_count + 1 WHERE id = $1',
    [id]
  ).catch(e => console.error('[view_count update]', e))

  // 로그인 유저의 경우: 북마크 / 지원 여부 추가 조회
  let is_bookmarked = false
  let has_applied = false

  if (auth?.owner_type === 'user') {
    const [bookmarkRes, applyRes] = await Promise.all([
      pool.query(
        'SELECT id FROM bookmarks WHERE user_id = $1 AND job_posting_id = $2',
        [auth.sub, id]
      ),
      pool.query(
        'SELECT id FROM applications WHERE user_id = $1 AND job_posting_id = $2',
        [auth.sub, id]
      )
    ])
    is_bookmarked = (bookmarkRes.rowCount ?? 0) > 0
    has_applied = (applyRes.rowCount ?? 0) > 0
  }

  // 응답 구조 정리
  const response = {
    id: job.id,
    title: job.title,
    job_type: job.job_type,
    description: job.description,
    requirements: job.requirements,
    preferred_qualifications: job.preferred_qualifications,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    salary_type: job.salary_type,
    location: job.location,
    address: job.address,
    work_type: job.work_type,
    experience_level: job.experience_level,
    deadline: job.deadline,
    detail_images: job.detail_images || [],
    view_count: job.view_count,
    application_count: job.application_count,
    created_at: job.created_at,
    company: {
      id: job.company_id,
      company_name: job.company_name,
      brand_name: job.brand_name,
      logo_url: job.logo_url,
      company_type: job.company_type,
      description: job.company_description,
      website_url: job.website_url
    },
    is_bookmarked,
    has_applied
  }

  return ok(response)
}
