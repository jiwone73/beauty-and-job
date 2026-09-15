export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'
import { 이용권, 게재종료일, 체험시작, 오늘날짜 } from '@/lib/companyEntitlement'
import { 체험끝안내 } from '@/lib/companyPlans'

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
           experience_level, education, headcount, headcount_text, positions, categories,
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
    detail_images, hiring_process, benefits, employment_type, benefit_tags,
    work_days, work_time, work_time_slots, responsibilities, headcount,
    work_period, contact_methods, education, gender_preference, positions, cover_images, status: reqStatus,
    // 접수담당자 — 여태 받지 않아 기업회원이 적어도 저장되지 않고 사라졌다.
    external_contact_name, external_contact_phone, external_contact_email, external_contact_kakao,
    contact_name_hidden, contact_phone_hidden, contact_email_hidden, contact_kakao_hidden,
    // 폼이 보내는데 여기서 안 받아 조용히 사라지던 값들. 미리보기에는 보이고 실제
    // 공고에는 없어 「미리보기와 다르다」가 됐다 — 폼이 만드는 칸은 다 받는다.
    apply_method, external_apply_url, salary_text, source_url, work_locations, headcount_text
  } = body

  if (!title || !job_type) {
    return err('JOB_002', '제목과 직군 유형은 필수입니다.')
  }

  // 임시저장(draft)이면 DRAFT, 그 외에는 ACTIVE로 등록. 화이트리스트 검증(문자열 인젝션 방지).
  const jobStatus = reqStatus === 'DRAFT' || reqStatus === 'draft' ? 'DRAFT' : 'ACTIVE'

  // 무료로 몇 건을 올리든 막지 않는다. 공고가 많이 올라오는 것은 우리에게
  // 이득이다 — 공고가 많아야 구직자가 오고, 구직자가 있어야 유료가 팔린다.
  // 무료와 유료를 가르는 것은 **건수가 아니라 날짜**다.
  //
  // 무료는 라이트를 이레 동안 그대로 써 보는 것이다. 첫 공고를 거는 순간
  // 이레가 시작되고, 그 안에서는 몇 건이든 걸 수 있다. 이레가 지나면 걸려
  // 있던 공고가 함께 내려가고 — 연장하려면 라이트를 산다.
  const { plan, paidUntil } = await 이용권(auth!.sub)
  let 체험끝: string | null = null
  if (!plan && jobStatus === 'ACTIVE') {
    체험끝 = await 체험시작(auth!.sub)
    if (!체험끝 || 체험끝 < 오늘날짜()) {
      return err('PLAN_001', 체험끝안내, 403)
    }
  }

  // 게재 종료일. 임시저장은 목록에 뜨지 않으니 비워 둔다(펼 때 정해진다).
  const listedUntil = jobStatus !== 'ACTIVE' ? null : 게재종료일(plan, paidUntil, 체험끝)

  const result = await pool.query(
    `INSERT INTO job_postings (
       company_id, title, job_type, job_category_id, description,
       requirements, preferred_qualifications, salary_min, salary_max,
       salary_type, location, address, work_type, experience_level,
       deadline, categories, detail_images, hiring_process, notes,
       benefits, employment_type, benefit_tags,
       work_days, work_time, work_time_slots, responsibilities, headcount, work_period, contact_methods, education, gender_preference, positions, cover_images,
       external_contact_name, external_contact_phone, external_contact_email, external_contact_kakao,
       contact_name_hidden, contact_phone_hidden, contact_email_hidden, contact_kakao_hidden,
       apply_method, external_apply_url, salary_text, source_url, work_locations, headcount_text, listed_until, status
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, '${jobStatus}'
     ) RETURNING id, title, status, created_at`,
    [
      auth!.sub, title, job_type, job_category_id || null, description || null,
      requirements || null, preferred_qualifications || null,
      salary_min || null, salary_max || null, salary_type || null,
      location || null, address || null, work_type || null,
      experience_level || 'ANY', deadline || null, categories || [],
      JSON.stringify(detail_images || []),
      JSON.stringify(hiring_process || []),
      null, // 비고 칸은 없앴다 — 상세요강 하나로 간다

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
      contact_kakao_hidden !== false,
      apply_method || 'NATIVE',
      (external_apply_url || '').trim() || null,
      (salary_text || '').trim() || null,
      (source_url || '').trim() || null,
      Array.isArray(work_locations) && work_locations.length ? JSON.stringify(work_locations) : null,
      (headcount_text || '').trim() || null,
      listedUntil
    ]
  )
  return ok(result.rows[0], 201)
}
