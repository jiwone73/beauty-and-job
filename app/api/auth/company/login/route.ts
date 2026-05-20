export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import bcrypt from 'bcrypt'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'
import { signAccessToken } from '@/lib/jwt'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return err('AUTH_001', '이메일과 비밀번호를 입력해주세요.')
  }

  const res = await pool.query(
    `SELECT id, company_name, brand_name, email, password_hash, status, logo_url, company_type
     FROM companies WHERE email = $1`,
    [email]
  )

  if (res.rowCount === 0) {
    return err('AUTH_001', '이메일 또는 비밀번호가 올바르지 않습니다.', 401)
  }

  const company = res.rows[0]

  const valid = await bcrypt.compare(password, company.password_hash)
  if (!valid) {
    return err('AUTH_001', '이메일 또는 비밀번호가 올바르지 않습니다.', 401)
  }

  if (company.status === 'PENDING') {
    return err('CO_001', '승인 대기중인 계정입니다.', 403)
  }
  if (company.status === 'SUSPENDED') {
    return err('CO_002', '정지된 계정입니다.', 403)
  }
  if (company.status === 'REJECTED') {
    return err('CO_001', '승인이 거부된 계정입니다.', 403)
  }

  const accessToken = signAccessToken({
    sub: company.id,
    owner_type: 'company',
    role: 'co_master'
  })

  const { password_hash, ...companyData } = company

  return ok({ access_token: accessToken, company: companyData })
}
