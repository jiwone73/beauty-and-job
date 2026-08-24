export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'
import { sendApplicationCompleteEmail, sendNewApplicantEmail } from '@/lib/email'
import { buildResumeSnapshot } from '@/lib/resumeSnapshot'
import { 이력서쓰기 } from '@/lib/resumeWrite'
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, 'user')
  if (authErr) return authErr
  const { id: jobPostingId } = params
  const body = await req.json().catch(() => ({}))
  const { resume_id, cover_letter, third_party_consent, resume } = body
  const jobRes = await pool.query(
    `SELECT jp.id, jp.status, jp.deadline, jp.company_id, jp.title,
            jp.description, jp.location, jp.address, jp.work_type, jp.experience_level,
            jp.salary_min, jp.salary_max, jp.salary_type,
            c.company_name, c.email AS company_email, c.brand_name,
            c.region_sido AS company_region_sido, c.region_sigungu AS company_region_sigungu,
            c.address AS company_address,
            jp.source, jp.apply_method, c.is_member
     FROM job_postings jp
     LEFT JOIN companies c ON c.id = jp.company_id
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
  const isExternal = job.source === 'EXTERNAL' || job.is_member === false
  if (isExternal && job.apply_method === 'REDIRECT') {
    return err('JOB_004', '이 공고는 기업 채용페이지에서 지원해주세요.', 400)
  }
  const companyNameDisplay = job.company_name || '외부 기업'

  const dupRes = await pool.query(
    `SELECT id, status FROM applications WHERE job_posting_id = $1 AND user_id = $2`,
    [jobPostingId, auth!.sub]
  )
  const existingApp = dupRes.rows[0]
  // 취소(WITHDRAWN)한 이력이 있으면 재지원 허용 → 기존 행을 되살린다.
  // 그 외 상태(신규/검토중/합격/불합격)면 중복 지원으로 차단.
  if (existingApp && existingApp.status !== 'WITHDRAWN') {
    return err('APP_001', '이미 지원하신 공고입니다.', 409)
  }
  const reactivateId: string | null =
    existingApp && existingApp.status === 'WITHDRAWN' ? existingApp.id : null
  const profileCheck = await pool.query(
    `SELECT name, phone, birth_date, gender, email, region_sido, preferred_regions, job_type,
            resume_file_url, resume_file_name, resume_file_size
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
  // 지원 시점 이력서 박제 (스냅샷).
  //
  // resume 가 함께 오면 그것은 지원자가 이 공고에 맞게 고친 사본이다.
  // 기본 이력서는 이력서 페이지에서만 바뀐다 — 여기서 저장해 버리면
  // 이 공고에 맞춘 손질이 다음 지원에도, 인재검색에도 그대로 따라간다.
  // 그래서 트랜잭션 안에 사본을 잠깐 써 놓고 같은 연결로 읽어 박제한 뒤
  // 되돌린다. 남는 것은 스냅샷뿐이고 사람의 행은 손대지 않은 채다.
  let snapshot = null
  if (resume) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await 이력서쓰기(client, auth!.sub, resume)
      snapshot = await buildResumeSnapshot(auth!.sub, finalResumeId, client)
      await client.query('ROLLBACK')
    } catch (e) {
      try { await client.query('ROLLBACK') } catch {}
      console.error('[apply] 사본 스냅샷 생성 실패', e)
    } finally {
      client.release()
    }
  }
  if (!snapshot) {
    try {
      snapshot = await buildResumeSnapshot(auth!.sub, finalResumeId)
    } catch (e) {
      console.error('[apply] 이력서 스냅샷 생성 실패', e)
    }
  }

  // 지원 시점 채용공고 박제 (스냅샷) — 이후 공고가 수정·마감·삭제돼도 증빙 가능
  const jobSnapshot = {
    title: job.title,
    description: job.description || '',
    location: job.location || '',
    address: job.address || '',
    deadline: job.deadline || null,
    work_type: job.work_type || '',
    experience_level: job.experience_level || '',
    salary_min: job.salary_min ?? null,
    salary_max: job.salary_max ?? null,
    salary_type: job.salary_type || '',
    company: {
      company_name: companyNameDisplay || '',
      brand_name: job.brand_name || '',
      region_sido: job.company_region_sido || '',
      region_sigungu: job.company_region_sigungu || '',
      address: job.company_address || '',
    },
    captured_at: new Date().toISOString(),
  }

  const applyParams = [
    finalResumeId,
    cover_letter || null,
    snapshot ? JSON.stringify(snapshot) : null,
    p.resume_file_url || null,
    p.resume_file_name || null,
    p.resume_file_size || null,
    JSON.stringify(jobSnapshot),
    isExternal ? 'PENDING' : null,
    isExternal ? true : false,
  ]
  const result = reactivateId
    ? await pool.query(
        // 취소 이력 되살리기: 새 행을 만들지 않고 기존 행을 신규 지원으로 복원
        `UPDATE applications
           SET resume_id = $3, cover_letter = $4, resume_snapshot = $5,
               resume_file_url = $6, resume_file_name = $7, resume_file_size = $8,
               job_snapshot = $9, delivery_status = $10, third_party_consent = $11,
               status = 'APPLIED', applied_at = now(), viewed_at = null,
               status_updated_at = now(), updated_at = now()
         WHERE id = $1 AND user_id = $2
         RETURNING id, status, applied_at`,
        [reactivateId, auth!.sub, ...applyParams]
      )
    : await pool.query(
        `INSERT INTO applications (job_posting_id, user_id, resume_id, cover_letter, resume_snapshot,
                                    resume_file_url, resume_file_name, resume_file_size, job_snapshot,
                                    delivery_status, third_party_consent, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'APPLIED')
         RETURNING id, status, applied_at`,
        [jobPostingId, auth!.sub, ...applyParams]
      )
  // 지원자 수 +1 (취소 시 -1 되어 있으므로 재지원도 대칭으로 +1)
  await pool.query(
    `UPDATE job_postings SET application_count = application_count + 1 WHERE id = $1`,
    [jobPostingId]
  )
  // 임시저장해 둔 사본은 여기서 지운다(클라이언트가 따로 안 지워도 되게).
  // 남겨 두면 다음에 이 공고를 다시 열 때 이미 낸 사본이 초안이라며 되살아난다.
  pool.query(
    `DELETE FROM application_drafts WHERE user_id = $1 AND job_posting_id = $2`,
    [auth!.sub, jobPostingId]
  ).catch((e) => console.error('[apply] 초안 정리 실패', e))
  if (!isExternal && job.company_id) {
    try {
      await pool.query(
        `INSERT INTO notifications (company_id, type, title, message, related_id, related_type)
         VALUES ($1, 'NEW_APPLICANT', $2, $3, $4, 'application')`,
        [job.company_id, '새 지원자가 있어요', `${p.name || '지원자'}님이 '${job.title}'에 지원했어요.`, result.rows[0].id]
      )
    } catch (e) {
      console.error('[notification] NEW_APPLICANT 생성 실패', e)
    }
  }
  const appliedDate = new Date().toLocaleDateString('ko-KR')
  const jobTypeLabel = p.job_type === 'STORE' ? '매장직' : '사무직'
  sendApplicationCompleteEmail(p.email, p.name || '회원', job.title, companyNameDisplay, appliedDate)
    .catch((e) => console.error('[email] 지원완료 발송 실패', e))
  if (!isExternal && job.company_email) {
    sendNewApplicantEmail(job.company_email, job.company_name, p.name || '지원자', jobTypeLabel, job.title, appliedDate)
      .catch((e) => console.error('[email] 새 지원자 발송 실패', e))
  }
  return ok(result.rows[0], 201)
}
