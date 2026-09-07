export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'
import { isTracked, touchWorkSession } from '@/lib/albaWork'

// 비회원 기업 중복판정용 근무지역 키: 주소에서 "시도 시군구"만 정규화 추출.
// (동명 업체라도 지역이 다르면 다른 업체로 본다. 지역이 비면 "" → 자동합침 안 함.)
const NM_SIDO: Record<string, string> = {
  서울특별시: "서울", 서울: "서울", 부산광역시: "부산", 부산: "부산", 대구광역시: "대구", 대구: "대구",
  인천광역시: "인천", 인천: "인천", 광주광역시: "광주", 광주: "광주", 대전광역시: "대전", 대전: "대전",
  울산광역시: "울산", 울산: "울산", 세종특별자치시: "세종", 세종: "세종", 경기도: "경기", 경기: "경기",
  강원특별자치도: "강원", 강원도: "강원", 강원: "강원", 충청북도: "충북", 충북: "충북", 충청남도: "충남", 충남: "충남",
  전북특별자치도: "전북", 전라북도: "전북", 전북: "전북", 전라남도: "전남", 전남: "전남",
  경상북도: "경북", 경북: "경북", 경상남도: "경남", 경남: "경남", 제주특별자치도: "제주", 제주도: "제주", 제주: "제주",
};
function nmRegionKey(addr?: string | null): string {
  if (!addr) return "";
  const parts = String(addr).trim().split(/\s+/);
  if (!parts[0]) return "";
  const sido = NM_SIDO[parts[0]] || parts[0];
  const sigungu = parts[1] || "";
  return `${sido} ${sigungu}`.trim();
}

// 공고 목록 조회
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const jobType = searchParams.get('job_type')
  const search = searchParams.get('search')
  const member = searchParams.get('member') // 'true'(회원공고) | 'false'(비회원공고) | null(전체)

  const where: string[] = []
  const params: any[] = []
  let idx = 1

  if (status) { where.push(`jp.status = $${idx++}`); params.push(status) }
  if (jobType) { where.push(`jp.job_type = $${idx++}`); params.push(jobType) }
  if (member === 'true') { where.push(`c.is_member = true`) }
  else if (member === 'false') { where.push(`c.is_member = false`) }
  if (search) {
    where.push(`(jp.title ILIKE $${idx} OR c.company_name ILIKE $${idx})`)
    params.push(`%${search}%`); idx++
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT
        jp.id, jp.title, jp.job_type, jp.status, jp.location,
        jp.experience_level, jp.view_count, jp.application_count, jp.created_at,
        jp.deadline, jp.product_type, jp.source, jp.created_by, jp.source_url,
        c.id AS company_id, c.company_name, c.logo_url, c.is_member,
        -- 매장은 로고를 받지 않는다. 공고 배너 → 매장 배너 → (오피스) 로고 순으로 쓴다.
        COALESCE(
          jp.cover_images->0->>'url',
          c.cover_images->0->>'url',
          c.logo_url
        ) AS thumb_url,
        jc.name AS category_name,
        jp.categories
      FROM job_postings jp
      JOIN companies c ON c.id = jp.company_id
      LEFT JOIN job_categories jc ON jc.id = jp.job_category_id
      ${whereClause}
      ORDER BY jp.created_at DESC
    `, params)
    return ok({ items: result.rows })
  } finally {
    client.release()
  }
}

// 공고 직접 등록 (관리자 — 회원 선택 또는 비회원 직접 입력)
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const body = await req.json()
  const {
    company_id, new_company, status: reqStatus,
    title, job_type, job_category_id, description, requirements,
    preferred_qualifications, salary_min, salary_max, salary_type,
    location, address, work_locations, work_type, experience_level, deadline, categories,
    detail_images, hiring_process, notes, benefits, responsibilities, created_by,
    apply_method, external_apply_url, external_contact_email, external_contact_kakao,
    external_contact_name, external_contact_phone, contact_methods,
    employment_type, benefit_tags, work_days, work_time, work_time_slots, headcount, work_period, education, source_url,
    salary_text, headcount_text, gender_preference, positions,
    // 연락처를 칸마다 가릴지. 폼이 보내는데 안 받아 대행 등록에서는 늘 기본값으로 저장됐다.
    contact_name_hidden, contact_phone_hidden, contact_email_hidden, contact_kakao_hidden,
    cover_images
  } = body

  if (!title || !job_type) return err('JOB_002', '제목과 채용유형은 필수입니다.')

  // 임시저장(draft)이면 DRAFT, 그 외에는 ACTIVE로 등록. 화이트리스트 검증(문자열 인젝션 방지).
  const jobStatus = reqStatus === 'DRAFT' || reqStatus === 'draft' ? 'DRAFT' : 'ACTIVE'

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    let finalCompanyId: string | null = company_id || null

    // 비회원 기업 직접 입력 → companies에 가벼운 레코드 생성(동명 비회원 있으면 재사용)
    if (!finalCompanyId) {
      const nm = new_company || {}
      const nmName = (nm.company_name || '').trim()
      const nmFoundedYear = nm.founded_year ? (parseInt(String(nm.founded_year), 10) || null) : null
      const nmCoverJson = Array.isArray(nm.cover_images) && nm.cover_images.length ? JSON.stringify(nm.cover_images) : null
      if (!nmName) {
        await client.query('ROLLBACK')
        return err('JOB_001', '기업을 선택하거나 비회원 회사명을 입력해주세요.')
      }
      // 중복판정: "기업/매장명 + 근무지역(시·군·구)"이 모두 같을 때만 재사용.
      // (동명이라도 지역 다르면 별도 업체. 지역을 못 잡으면 안전하게 새로 생성 → 비회원 탭에서 수동 병합.)
      const nmRegion = nmRegionKey(nm.address)
      const cand = await client.query(
        `SELECT id, address FROM companies WHERE lower(company_name) = lower($1) AND is_member = false`,
        [nmName]
      )
      const matched = nmRegion
        ? cand.rows.find((r: any) => nmRegionKey(r.address) === nmRegion)
        : undefined
      if (matched) {
        finalCompanyId = matched.id
        await client.query(
          `UPDATE companies SET
             brand_name = COALESCE(brand_name, $2),
             website_url = COALESCE(website_url, $3),
             description = COALESCE(description, $4),
             address = COALESCE(address, $5),
             industry = COALESCE(industry, $6),
             company_size = COALESCE(company_size, $7),
             founded_year = COALESCE(founded_year, $8),
             representative_name = COALESCE(representative_name, $9),
             company_phone = COALESCE(company_phone, $10),
             logo_url = COALESCE(logo_url, $11),
             cover_images = CASE WHEN (cover_images IS NULL OR cover_images = '[]'::jsonb) AND $12 IS NOT NULL THEN $12::jsonb ELSE cover_images END,
             updated_at = now()
           WHERE id = $1`,
          [finalCompanyId, (nm.brand_name || '').trim() || null, (nm.homepage_url || '').trim() || null,
           (nm.description || '').trim() || null, (nm.address || '').trim() || null, (nm.industry || '').trim() || null,
           (nm.company_size || '').trim() || null, nmFoundedYear, (nm.representative_name || '').trim() || null, (nm.company_phone || '').trim() || null,
           (nm.logo_url || '').trim() || null, nmCoverJson]
        )
      } else {
        const companyRes = await client.query(
          `INSERT INTO companies (company_name, brand_name, company_type, website_url, description, address, industry, company_size, founded_year, representative_name, company_phone, logo_url, cover_images, is_member, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13::jsonb, '[]'::jsonb), false, 'ACTIVE'::company_status)
           RETURNING id`,
          [nmName, (nm.brand_name || '').trim() || null, job_type, (nm.homepage_url || '').trim() || null,
           (nm.description || '').trim() || null, (nm.address || '').trim() || null, (nm.industry || '').trim() || null,
           (nm.company_size || '').trim() || null, nmFoundedYear, (nm.representative_name || '').trim() || null, (nm.company_phone || '').trim() || null,
           (nm.logo_url || '').trim() || null, nmCoverJson]
        )
        finalCompanyId = companyRes.rows[0].id
      }
    }

    const isNonMember = !company_id
    // 폼이 보낸 값을 그대로 넣는다. 서버가 다시 정하면 미리보기가 모르는 값이
    // 저장돼 갈라진다. 값이 잘못됐으면 조용히 바꾸지 말고 아래에서 되돌려 보낸다.
    const am = apply_method
    if (!['NATIVE', 'REDIRECT', 'EMAIL', 'MANAGED'].includes(am)) {
      await client.query('ROLLBACK'); return err('JOB_003', '지원방법 값이 올바르지 않습니다.')
    }
    const src = isNonMember ? 'EXTERNAL' : 'NATIVE' // 회원 여부에서 따라 나오는 값 — 폼이 보내는 칸이 아니다
    const extUrl = (external_apply_url || '').trim() || null
    // 담당자 정보는 회원 업체를 대신 등록할 때도 적은 대로 저장한다.
    // 예전에는 비회원일 때만 저장하고 회원이면 버렸는데, 폼은 어느 쪽이든 담당자를
    // 필수로 받고 미리보기도 그대로 보여 준다 — 저장 때만 사라져 「미리보기와 다르다」가
    // 됐다. 기업회원이 직접 올릴 때(app/api/company/jobs)는 원래 그대로 저장한다.
    // 카카오 ID 는 이 게이트 밖에 있어 혼자만 살아남고 있었다.
    const extEmail = (external_contact_email || '').trim() || null
    const extName = (external_contact_name || '').trim() || null
    const extPhone = (external_contact_phone || '').replace(/\D/g, '') || null
    if (isNonMember) {
      if (am === 'REDIRECT' && !extUrl) { await client.query('ROLLBACK'); return err('JOB_003', '외부 링크형은 외부 지원 URL이 필요합니다.') }
      if (am === 'EMAIL' && !extEmail) { await client.query('ROLLBACK'); return err('JOB_003', '이메일 중계형은 채용 이메일이 필요합니다.') }
    }

    const result = await client.query(
      `INSERT INTO job_postings (
         company_id, title, job_type, job_category_id, description,
         requirements, preferred_qualifications, salary_min, salary_max,
         salary_type, location, address, work_type, experience_level,
         deadline, categories, detail_images, hiring_process, notes, benefits,
         status, created_by, source, apply_method, external_apply_url, external_contact_email, responsibilities,
         external_contact_name, external_contact_phone, contact_methods,
         employment_type, benefit_tags, work_days, work_time, work_time_slots, headcount, work_period, education, source_url,
         salary_text, headcount_text, gender_preference, positions, work_locations, external_contact_kakao,
         contact_name_hidden, contact_phone_hidden, contact_email_hidden, contact_kakao_hidden,
         cover_images
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, '${jobStatus}', $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49
       ) RETURNING id, title, status, created_at`,
      [
        finalCompanyId, title, job_type, job_category_id || null, description || null,
        requirements || null, preferred_qualifications || null,
        salary_min || null, salary_max || null, salary_type || null,
        location || null, address || null, work_type || null,
        experience_level || 'ANY', deadline || null, categories || [],
        JSON.stringify(detail_images || []),
        JSON.stringify(hiring_process || []),
        notes || null, benefits || null,
        // 누가 올렸는지는 토큰에서 가져온다 — 알바 실적 집계가 여기에 달려 있어
        // 본문 값을 그대로 믿으면 안 된다.
        auth?.sub || created_by || 'admin',
        src, am, extUrl, extEmail, responsibilities || null,
        extName, extPhone, contact_methods || [],
        employment_type || null, benefit_tags || [],
        work_days || null, work_time || null, work_time_slots || null,
        headcount ?? null, work_period || null, education || null, source_url || null,
        (salary_text || '').trim() || null, (headcount_text || '').trim() || null,
        (gender_preference || '').trim() || null,
        Array.isArray(positions) && positions.length ? JSON.stringify(positions) : null,
        Array.isArray(work_locations) && work_locations.length ? JSON.stringify(work_locations) : null,
        (external_contact_kakao || '').trim() || null,
        // 가리는 쪽이 기본이다 — 값을 안 보내면 가린 것으로 본다.
        contact_name_hidden !== false,
        contact_phone_hidden !== false,
        contact_email_hidden !== false,
        contact_kakao_hidden !== false,
        // 이 공고에 고른 배너. 업체 커버로만 넣던 때는 업체에 커버가 이미 있으면
        // 덮지 않아, 미리보기에 보이던 배너가 저장 뒤에 사라졌다.
        Array.isArray(cover_images) && cover_images.length ? JSON.stringify(cover_images) : null
      ]
    )

    // 공고에 적힌 연락처를 업체 행에도 남긴다.
    //
    // 여태 연락처는 공고 한 칸에만 있었다(외부 공고 157건 중 148건). 알바가 공고에서
    // 번호를 지우면 그 업체에 연락할 길이 사라진다 — 「나중에 그 번호로 연락해 회원가입을
    // 권한다」는 원래 뜻이 공고 하나에 매달려 있던 셈이다. 업체 행은 지점마다 따로라
    // (「리안헤어 녹양역점」처럼) 지점 번호가 지점에 남는다. 이미 있으면 덮지 않는다.
    if (finalCompanyId && (extPhone || extEmail)) {
      await client.query(
        `UPDATE companies SET
           phone = COALESCE(NULLIF(phone, ''), $2),
           email = COALESCE(email, NULLIF($3, '')::citext),
           updated_at = now()
         WHERE id = $1 AND is_member = false`,
        [finalCompanyId, extPhone || null, extEmail || null]
      ).catch((e: any) => console.error('[업체 연락처 남기기]', e?.message))
    }

    await client.query('COMMIT')

    // 공고를 저장한 시각도 근무 신호로 남긴다.
    // 외부 사이트에서 자료를 찾는 동안에는 관리자 창에 조작이 없어,
    // 화면이 두드리는 것만으로는 실제 일한 시간이 잡히지 않는다.
    if (isTracked(auth?.sub)) {
      touchWorkSession(auth!.sub).catch((e) => console.error('[work session]', e))
    }

    // 카페에서 찾아 둔 글로 등록했다면 그 줄을 '등록완료'로 바꾼다.
    // 알바가 목록에서 따로 체크할 필요가 없게, 저장 한 번으로 끝낸다.
    return ok(result.rows[0], 201)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

// 공고 상태 변경
export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const { id, status } = await req.json()
  if (!id || !status) return err('BAD_REQUEST', 'id, status 필요', 400)
  if (!['ACTIVE', 'DRAFT', 'CLOSED', 'HIDDEN', 'EXPIRED'].includes(status))
    return err('BAD_REQUEST', '잘못된 status', 400)

  const client = await pool.connect()
  try {
    await client.query(`UPDATE job_postings SET status = $1, updated_at = now() WHERE id = $2`, [status, id])
    return ok({ success: true })
  } finally {
    client.release()
  }
}

// 공고 삭제
export async function DELETE(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return err('BAD_REQUEST', 'id 필요', 400)

  const client = await pool.connect()
  try {
    await client.query(`DELETE FROM applications WHERE job_posting_id = $1`, [id])
    await client.query(`DELETE FROM job_postings WHERE id = $1`, [id])
    return ok({ success: true })
  } finally {
    client.release()
  }
}