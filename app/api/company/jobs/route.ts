export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

// 내 공고 목록
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'company')
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  const where: string[] = ['company_id = $1']
  const params: any[] = [auth!.sub]
  let idx = 2

  if (status) {
    where.push(`status = $${idx++}`)
    params.push(status)
  }

  const whereClause = where.join(' AND ')

  const listQuery = `
    SELECT id, title, job_type, status, view_count, location, address,
           employment_type, salary_type, salary_min, salary_max,
           (SELECT COUNT(*)::int FROM applications a
              WHERE a.job_posting_id = job_postings.id AND a.hidden_by_company = false AND a.status <> 'WITHDRAWN') AS application_count,
           (SELECT COUNT(*)::int FROM applications a
              WHERE a.job_posting_id = job_postings.id AND a.hidden_by_company = false AND a.status <> 'WITHDRAWN'
                AND a.viewed_at IS NULL) AS unviewed_count,
           experience_level, education, headcount, headcount_text, positions,
           -- 우리 공고를 담아 둔 사람. 지원까지는 안 왔어도 보고 있다는 뜻이라
           -- 매장이 알 값이다(잡코리아의 「관심인재」가 이 자리다).
           (SELECT COUNT(*)::int FROM bookmarks b WHERE b.job_posting_id = job_postings.id) AS bookmark_count,
           deadline, is_featured, created_at, closed_at
    FROM job_postings
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `
  params.push(limit, offset)

  const countQuery = `SELECT COUNT(*)::int AS total FROM job_postings WHERE ${whereClause}`
  const countParams = params.slice(0, params.length - 2)

  const [listRes, countRes] = await Promise.all([
    pool.query(listQuery, params),
    pool.query(countQuery, countParams)
  ])

  return ok(listRes.rows, 200, {
    page, limit, total: countRes.rows[0].total
  })
}

// 공고 등록
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'company')
  if (authErr) return authErr

  const body = await req.json()
  const {
    title, job_type, job_category_id, description, requirements,
    preferred_qualifications, salary_min, salary_max, salary_type,
    location, address, work_type, experience_level, deadline, categories,
    detail_images, hiring_process, notes, benefits, employment_type, benefit_tags,
    work_days, work_time, work_time_slots, responsibilities, headcount,
    work_period, contact_methods, education, gender_preference, positions, cover_images, status: reqStatus,
    // 접수담당자 — 여태 받지 않아 기업회원이 적어도 저장되지 않고 사라졌다.
    external_contact_name, external_contact_phone, external_contact_email, external_contact_kakao,
    contact_name_hidden, contact_phone_hidden, contact_email_hidden, contact_kakao_hidden
  } = body

  if (!title || !job_type) {
    return err('JOB_002', '제목과 직군 유형은 필수입니다.')
  }

  // 임시저장(draft)이면 DRAFT, 그 외에는 ACTIVE로 등록. 화이트리스트 검증(문자열 인젝션 방지).
  const jobStatus = reqStatus === 'DRAFT' || reqStatus === 'draft' ? 'DRAFT' : 'ACTIVE'

  const result = await pool.query(
    `INSERT INTO job_postings (
       company_id, title, job_type, job_category_id, description,
       requirements, preferred_qualifications, salary_min, salary_max,
       salary_type, location, address, work_type, experience_level,
       deadline, categories, detail_images, hiring_process, notes,
       benefits, employment_type, benefit_tags,
       work_days, work_time, work_time_slots, responsibilities, headcount, work_period, contact_methods, education, gender_preference, positions, cover_images,
       external_contact_name, external_contact_phone, external_contact_email, external_contact_kakao,
       contact_name_hidden, contact_phone_hidden, contact_email_hidden, contact_kakao_hidden, status
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, '${jobStatus}'
     ) RETURNING id, title, status, created_at`,
    [
      auth!.sub, title, job_type, job_category_id || null, description || null,
      requirements || null, preferred_qualifications || null,
      salary_min || null, salary_max || null, salary_type || null,
      location || null, address || null, work_type || null,
      experience_level || 'ANY', deadline || null, categories || [],
      JSON.stringify(detail_images || []),
      JSON.stringify(hiring_process || []),
      notes || null,
      benefits || null,
      employment_type || null,
      benefit_tags || [],
      work_days || null, work_time || null, work_time_slots || null,
      responsibilities || null,
      headcount ?? null,
      work_period || null,
      contact_methods || [],
      education || null,
      (gender_preference || '').trim() || null,
      Array.isArray(positions) && positions.length ? JSON.stringify(positions) : null,
      // 공고별 상단 이미지. 미지정(undefined)이면 NULL → 상세에서 기업 커버로 폴백.
      //   빈 배열로 보내면 '이 공고는 상단 이미지 없음'으로 저장된다(기업정보는 건드리지 않음).
      Array.isArray(cover_images) ? JSON.stringify(cover_images) : null,
      (external_contact_name || '').trim() || null,
      (external_contact_phone || '').replace(/\D/g, '') || null,
      (external_contact_email || '').trim() || null,
      (external_contact_kakao || '').trim() || null,
      // 가리는 쪽이 기본이다 — 값을 안 보내면 가린 것으로 본다.
      contact_name_hidden !== false,
      contact_phone_hidden !== false,
      contact_email_hidden !== false,
      contact_kakao_hidden !== false
    ]
  )
  return ok(result.rows[0], 201)
}
