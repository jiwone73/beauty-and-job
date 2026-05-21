export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, 'user')
  if (authErr) return authErr

  const { id: jobPostingId } = params
  const body = await req.json().catch(() => ({}))
  const { resume_id, cover_letter } = body

  // 공고 존재 + 활성 상태 확인
  const jobRes = await pool.query(
    `SELECT id, status, deadline FROM job_postings WHERE id = $1`,
    [jobPostingId]
  )

  if (jobRes.rowCount === 0) {
    return err('JOB_001', '공고를 찾을 수 없습니다.', 404)
  }

  const job = jobRes.rows[0]
  if (job.status !== 'ACTIVE') {
    return err('JOB_001', '마감된 공고입니다.', 400)
  }
  if (job.deadline && new Date(job.deadline) < new Date()) {
    return err('JOB_001', '지원 기간이 종료되었습니다.', 400)
  }

  // 중복 지원 체크
  const dupRes = await pool.query(
    `SELECT id FROM applications WHERE job_posting_id = $1 AND user_id = $2`,
    [jobPostingId, auth!.sub]
  )
  if (dupRes.rowCount && dupRes.rowCount > 0) {
    return err('APP_001', '이미 지원하신 공고입니다.', 409)
  }

  // 지원 등록
  const result = await pool.query(
    `INSERT INTO applications (job_posting_id, user_id, resume_id, cover_letter, status)
     VALUES ($1, $2, $3, $4, 'APPLIED')
     RETURNING id, status, applied_at`,
    [jobPostingId, auth!.sub, resume_id || null, cover_letter || null]
  )

  // 공고의 application_count 증가
  await pool.query(
    `UPDATE job_postings SET application_count = application_count + 1 WHERE id = $1`,
    [jobPostingId]
  )

  return ok(result.rows[0], 201)
}
