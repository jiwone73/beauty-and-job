export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'
import { signAccessToken } from '@/lib/jwt'
import { sendCompanyWelcomeEmail } from '@/lib/email'
import { verifyBusinessNumber } from '@/lib/business/verify'

// ── 기업 가입 승인 게이트 (드롭인) ───────────────────────────
// 4단계에서 이 함수 안에 본인인증 + 진위확인을 넣어 통과 시 'ACTIVE' 반환하면 자동승인 전환.
async function decideCompanyStatus(_input: {
  business_number: string
  company_name: string
  phone: string
}): Promise<'PENDING' | 'ACTIVE'> {
  // TODO(4단계): 본인인증 + 진위확인 통과 시 'ACTIVE' 반환
  return 'PENDING'
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    company_name, brand_name, business_number, company_type,
    email, phone: rawPhone, password, address, website_url, description,
    business_license_path, agreed_term_ids
  } = body

  // 필수값 검증
  const phone = (rawPhone || '').replace(/\D/g, '')
  if (!company_name || !business_number || !company_type || !email || !phone || !password) {
    return err('USER_002', '필수 항목을 모두 입력해주세요.')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return err('USER_002', '올바른 이메일 형식이 아닙니다.')
  }
  if (password.length < 8) {
    return err('USER_002', '비밀번호는 최소 8자 이상이어야 합니다.')
  }
  const cleanBizNum = business_number.replace(/\D/g, '')
  if (cleanBizNum.length !== 10) {
    return err('USER_002', '사업자등록번호는 10자리 숫자입니다.')
  }
  if (!business_license_path) {
    return err('USER_002', '사업자등록증을 첨부해주세요.')
  }
  // 국세청 사업자등록 상태 검증 (키 없으면 형식만 통과)
  const bizv = await verifyBusinessNumber(cleanBizNum)
  if (!bizv.valid) {
    return err('USER_002', bizv.message || '유효하지 않은 사업자등록번호입니다.')
  }
  if (!['OFFICE', 'STORE', 'BOTH'].includes(company_type)) {
    return err('USER_002', '올바른 기업 유형을 선택해주세요.')
  }
  if (!agreed_term_ids || agreed_term_ids.length === 0) {
    return err('TERM_001', '필수 약관에 동의해주세요.')
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 중복 체크 (회원 기업만 대상 — 비회원 placeholder는 아래에서 승격 처리)
    const dupRes = await client.query(
      `SELECT id, email, business_number FROM companies WHERE (email = $1 OR business_number = $2) AND is_member = true`,
      [email, business_number]
    )
    if (dupRes.rowCount && dupRes.rowCount > 0) {
      const exists = dupRes.rows[0]
      await client.query('ROLLBACK')
      if (exists.email === email) {
        return err('USER_001', '이미 가입된 이메일입니다.', 409)
      }
      if (exists.business_number === business_number) {
        return err('USER_001', '이미 가입된 사업자등록번호입니다.', 409)
      }
    }
    // 이메일은 개인(users) 계정과도 중복 불가
    const userDupRes = await client.query(
      `SELECT 1 FROM users WHERE email = $1 LIMIT 1`,
      [email]
    )
    if (userDupRes.rowCount && userDupRes.rowCount > 0) {
      await client.query('ROLLBACK')
      return err('USER_001', '이미 가입된 이메일입니다.', 409)
    }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10)

    // 승인 게이트 → 가입 상태 결정 (지금은 PENDING)
    const companyStatus = await decideCompanyStatus({ business_number, company_name, phone })

    // 안내를 보낸 비회원(외부) 기업이 같은 이메일로 가입 → 기존 비회원 행을 회원으로 승격(claim)
    const claim = await client.query(
      `SELECT id FROM companies
       WHERE is_member = false AND merged_into_company_id IS NULL AND lower(email) = lower($1)
       ORDER BY created_at LIMIT 1`,
      [email]
    )
    const claimId: string | null = claim.rows[0]?.id || null

    let company: any
    if (claimId) {
      // 기존 비회원 행을 회원 정보로 채우고 온보딩 상태를 '연결완료(LINKED)'로
      const upd = await client.query(
        `UPDATE companies SET
           company_name = $2, brand_name = $3, business_number = $4, company_type = $5,
           phone = $6, password_hash = $7, address = $8, website_url = $9, description = $10,
           business_license_path = $11, status = $12::company_status,
           is_member = true, onboarding_status = 'LINKED',
           joined_at = COALESCE(joined_at, now()), linked_at = now(), updated_at = now()
         WHERE id = $1
         RETURNING id, company_name, brand_name, business_number, company_type,
                   email, phone, address, website_url, description, status, created_at`,
        [
          claimId, company_name, brand_name || null, business_number, company_type,
          phone, passwordHash, address || null, website_url || null, description || null,
          business_license_path || null, companyStatus
        ]
      )
      company = upd.rows[0]
      // 이 기업(=기존 비회원) 공고를 회원 공고로 전환하고, 외부 지원을 회원 지원자 관리로 편입
      await client.query(
        `UPDATE job_postings SET source = 'NATIVE', apply_method = 'NATIVE', updated_at = now()
         WHERE company_id = $1 AND source = 'EXTERNAL'`,
        [claimId]
      )
      await client.query(
        `UPDATE applications
         SET delivery_status = NULL, linked_at = COALESCE(applications.linked_at, now())
         FROM job_postings jp
         WHERE applications.job_posting_id = jp.id AND jp.company_id = $1`,
        [claimId]
      )
    } else {
      // 신규 기업 INSERT
      const result = await client.query(
        `INSERT INTO companies (
          company_name, brand_name, business_number, company_type,
          email, phone, password_hash, address, website_url, description,
          business_license_path, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::company_status
        ) RETURNING id, company_name, brand_name, business_number, company_type,
                   email, phone, address, website_url, description, status, created_at`,
        [
          company_name, brand_name || null, business_number, company_type,
          email, phone, passwordHash,
          address || null, website_url || null, description || null,
          business_license_path || null, companyStatus
        ]
      )
      company = result.rows[0]
    }

    // 회원가입 자동 감지(4단계): 회사명 + 근무지역(시/군/구)이 일치하는 비회원(외부) 행을 'JOINED'로 표시.
    // 연결(5단계)은 운영자가 수동으로. 이메일로 승격된 행(is_member=true)은 자동 제외됨.
    const normName = (company_name || '').toLowerCase()
      .replace(/\s/g, '').replace(/㈜/g, '').replace(/\(주\)/g, '').replace(/주식회사/g, '')
    if (normName) {
      await client.query(
        `UPDATE companies SET
           onboarding_status = 'JOINED', joined_at = COALESCE(joined_at, now()), updated_at = now()
         WHERE is_member = false
           AND merged_into_company_id IS NULL
           AND onboarding_status NOT IN ('JOINED', 'LINKED')
           AND replace(replace(replace(regexp_replace(lower(company_name), '[[:space:]]', '', 'g'), '㈜', ''), '(주)', ''), '주식회사', '') = $1
           AND (
             (region_sigungu IS NOT NULL AND region_sigungu <> '' AND $2 ILIKE '%' || region_sigungu || '%')
             OR (region_sigungu IS NULL AND region_sido IS NOT NULL AND region_sido <> '' AND $2 ILIKE '%' || region_sido || '%')
           )`,
        [normName, address || '']
      )
    }

    // 약관 동의 기록
    for (const termId of agreed_term_ids) {
      await client.query(
        `INSERT INTO term_agreements (owner_type, owner_id, term_id, agreed_at)
         VALUES ('company', $1, $2, NOW())`,
        [company.id, termId]
      )
    }

    await client.query('COMMIT')

    // 가입 신청 접수 안내 메일 (실패해도 가입은 성공 처리) — 서버리스에서 전송이 잘리지 않게 await
    await sendCompanyWelcomeEmail(company.email, company.company_name).catch((e) => console.error('[company welcome email]', e))

    if (companyStatus === 'ACTIVE') {
      const accessToken = signAccessToken({
        sub: company.id,
        owner_type: 'company',
        role: 'co_master'
      })
      return ok({ access_token: accessToken, company }, 201)
    }

    return ok({ pending: true, company }, 201)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}