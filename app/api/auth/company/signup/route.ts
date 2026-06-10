export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'
import { signAccessToken } from '@/lib/jwt'

// ── 기업 가입 승인 게이트 (드롭인) ───────────────────────────
// 지금은 모든 가입을 'PENDING'(승인 대기)으로 두고 관리자가 수동 승인.
// 4단계에서 이 함수 안에 담당자 본인인증 + 국세청 진위확인을 넣어
// 통과 시 'ACTIVE'를 반환하도록 바꾸면, 호출부·DB·관리자 UI는 그대로 둔 채
// 자동승인으로 전환된다.
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
    agreed_term_ids
  } = body

  // 필수값 검증
  const phone = (rawPhone || '').replace(/\D/g, '')
  if (!company_name || !business_number || !company_type || !email || !phone || !password) {
    return err('USER_002', '필수 항목을 모두 입력해주세요.')
  }

  // 이메일 형식
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return err('USER_002', '올바른 이메일 형식이 아닙니다.')
  }

  // 비밀번호 8자 이상
  if (password.length < 8) {
    return err('USER_002', '비밀번호는 최소 8자 이상이어야 합니다.')
  }

  // 사업자번호 형식 (10자리 숫자)
  const cleanBizNum = business_number.replace(/\D/g, '')
  if (cleanBizNum.length !== 10) {
    return err('USER_002', '사업자등록번호는 10자리 숫자입니다.')
  }

  // 기업 유형 검증
  if (!['OFFICE', 'STORE', 'BOTH'].includes(company_type)) {
    return err('USER_002', '올바른 기업 유형을 선택해주세요.')
  }

  // 약관 동의
  if (!agreed_term_ids || agreed_term_ids.length === 0) {
    return err('TERM_001', '필수 약관에 동의해주세요.')
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 중복 체크
    const dupRes = await client.query(
      `SELECT id, email, business_number FROM companies WHERE email = $1 OR business_number = $2`,
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

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10)

    // 승인 게이트 → 가입 상태 결정 (지금은 PENDING)
    const companyStatus = await decideCompanyStatus({ business_number, company_name, phone })

    // 기업 INSERT
    const result = await client.query(
      `INSERT INTO companies (
        company_name, brand_name, business_number, company_type,
        email, phone, password_hash, address, website_url, description,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::company_status
      ) RETURNING id, company_name, brand_name, business_number, company_type,
                 email, phone, address, website_url, description, status, created_at`,
      [
        company_name, brand_name || null, business_number, company_type,
        email, phone, passwordHash,
        address || null, website_url || null, description || null,
        companyStatus
      ]
    )
    const company = result.rows[0]

    // 약관 동의 기록
    for (const termId of agreed_term_ids) {
      await client.query(
        `INSERT INTO term_agreements (owner_type, owner_id, term_id, agreed_at)
         VALUES ('company', $1, $2, NOW())`,
        [company.id, termId]
      )
    }

    await client.query('COMMIT')

    // 자동 승인(ACTIVE)된 경우에만 토큰 발급 → 즉시 로그인
    if (companyStatus === 'ACTIVE') {
      const accessToken = signAccessToken({
        sub: company.id,
        owner_type: 'company',
        role: 'co_master'
      })
      return ok({ access_token: accessToken, company }, 201)
    }

    // 승인 대기(PENDING): 자동 로그인 없이 안내만
    return ok({ pending: true, company }, 201)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}