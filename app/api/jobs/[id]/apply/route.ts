export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'
import { sendApplicationCompleteEmail, sendNewApplicantEmail } from '@/lib/email'
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, 'user')
  if (authErr) return authErr
  const { id: jobPostingId } = params
  const body = await req.json().catch(() => ({}))
  const { resume_id, cover_letter } = body
  const jobRes = await pool.query(
    `SELECT jp.id, jp.status, jp.deadline, jp.company_id, jp.title,
            c.company_name, c.email AS company_email
     FROM job_postings jp
     JOIN companies c ON c.id = jp.company_id
     WHERE jp.id = $1`,
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
  const dupRes = await pool.query(
    `SELECT id FROM applications WHERE job_posting_id = $1 AND user_id = $2`,
    [jobPostingId, auth!.sub]
  )
  if (dupRes.rowCount && dupRes.rowCount > 0) {
    return err('APP_001', '이미 지원하신 공고입니다.', 409)
  }
  const profileCheck = await pool.query(
    `SELECT name, phone, birth_date, gender, email, region_sido, preferred_regions, job_type
     FROM users WHERE id = $1`,
    [auth!.sub]
  )
  const p = profileCheck.rows[0] || {}
  const missing: string[] = []
  if (!p.phone) missing.push('휴대전화')
  if (!p.birth_date) missing.push('생년월일')
  if (!p.gender) missing.push('성별')
  if (!p.email) missing.push('이메일')
  if (!p.region_sido) missing.push('거주지')
  if (!Array.isArray(p.preferred_regions) || p.preferred_regions.length === 0) missing.push('희망 근무지역')
  if (!p.job_type) missing.push('직군')
  if (missing.length > 0) {
    return err('APP_002', `지원하려면 프로필을 완성해주세요. (미입력: ${missing.join(', ')})`, 422)
  }
  // 이력서 필수: 이력서가 없으면 지원 불가
  const resumeRes = await pool.query(
    `SELECT id FROM resumes
     WHERE user_id = $1
     ORDER BY (status = 'PUBLISHED') DESC, is_primary DESC, updated_at DESC
     LIMIT 1`,
    [auth!.sub]
  )
  if (resumeRes.rowCount === 0) {
    return err('APP_003', '지원하려면 이력서를 먼저 작성해주세요.', 422)
  }
  let finalResumeId = resumeRes.rows[0].id
  if (resume_id) {
    const own = await pool.query(
      `SELECT id FROM resumes WHERE id = $1 AND user_id = $2`,
      [resume_id, auth!.sub]
    )
    if (own.rowCount && own.rowCount > 0) finalResumeId = resume_id
  }
  const result = await pool.query(
    `INSERT INTO applications (job_posting_id, user_id, resume_id, cover_letter, status)
     VALUES ($1, $2, $3, $4, 'APPLIED')
     RETURNING id, status, applied_at`,
    [jobPostingId, auth!.sub, finalResumeId, cover_letter || null]
  )
  await pool.query(
    `UPDATE job_postings SET application_count = application_count + 1 WHERE id = $1`,
    [jobPostingId]
  )
  try {
    await pool.query(
      `INSERT INTO notifications (company_id, type, title, message, related_id, related_type)
       VALUES ($1, 'NEW_APPLICANT', $2, $3, $4, 'application')`,
      [job.company_id, '새 지원자가 있어요', `${p.name || '지원자'}님이 '${job.title}'에 지원했어요.`, result.rows[0].id]
    )
  } catch (e) {
    console.error('[notification] NEW_APPLICANT 생성 실패', e)
  }
  const appliedDate = new Date().toLocaleDateString('ko-KR')
  const jobTypeLabel = p.job_type === 'STORE' ? '매장직' : '사무직'
  sendApplicationCompleteEmail(p.email, p.name || '회원', job.title, job.company_name, appliedDate)
    .catch((e) => console.error('[email] 지원완료 발송 실패', e))
  if (job.company_email) {
    sendNewApplicantEmail(job.company_email, job.company_name, p.name || '지원자', jobTypeLabel, job.title, appliedDate)
      .catch((e) => console.error('[email] 새 지원자 발송 실패', e))
  }
  return ok(result.rows[0], 201)
}
