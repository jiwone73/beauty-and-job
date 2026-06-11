// app/api/auth/find-company-email/route.ts
export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'

export async function POST(req: NextRequest) {
  const { business_number, password } = await req.json()

  if (!business_number || !password) {
    return err('FIND_001', '사업자등록번호와 비밀번호를 모두 입력해주세요.')
  }

  const digits = String(business_number).replace(/[^0-9]/g, '')
  if (digits.length !== 10) {
    return err('FIND_002', '사업자등록번호는 10자리 숫자입니다.')
  }

  // 사업자번호로 계정 조회 (저장 포맷이 하이픈이든 숫자든 숫자만 비교)
  const res = await pool.query(
    `SELECT email, password_hash FROM companies
      WHERE regexp_replace(business_number, '[^0-9]', '', 'g') = $1
      LIMIT 1`,
    [digits]
  )

  // 보안: 계정이 없거나 비밀번호가 틀려도 동일 응답
  // (사업자번호는 공개정보라 "존재 여부"가 새지 않도록)
  if (!res.rowCount) {
    return ok({ found: false })
  }

  const { email, password_hash } = res.rows[0]
  const matched = await bcrypt.compare(password, password_hash)
  if (!matched) {
    return ok({ found: false })
  }

  // 비밀번호로 본인 확인 완료 → 전체 이메일 공개
  return ok({ found: true, email })
}