export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

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
        jp.deadline, jp.product_type, jp.source,
        c.id AS company_id, c.company_name, c.logo_url, c.is_member,
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
    company_id, new_company,
    title, job_type, job_category_id, description, requirements,
    preferred_qualifications, salary_min, salary_max, salary_type,
    location, address, work_type, experience_level, deadline, categories,
    detail_images, hiring_process, notes, benefits, responsibilities, created_by,
    apply_method, external_apply_url, external_contact_email,
    external_contact_name, external_contact_phone
  } = body

  if (!title || !job_type) return err('JOB_002', '제목과 채용유형은 필수입니다.')

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
    const am = isNonMember ? (['REDIRECT', 'EMAIL', 'MANAGED'].includes(apply_method) ? apply_method : 'MANAGED') : 'NATIVE'
    const src = isNonMember ? 'EXTERNAL' : 'NATIVE'
    const extUrl = isNonMember ? ((external_apply_url || '').trim() || null) : null
    const extEmail = isNonMember ? ((external_contact_email || '').trim() || null) : null
    const extName = isNonMember ? ((external_contact_name || '').trim() || null) : null
    const extPhone = isNonMember ? ((external_contact_phone || '').replace(/\D/g, '') || null) : null
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
         external_contact_name, external_contact_phone
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'ACTIVE', $21, $22, $23, $24, $25, $26, $27, $28
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
        created_by || 'admin',
        src, am, extUrl, extEmail, responsibilities || null,
        extName, extPhone
      ]
    )

    await client.query('COMMIT')
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