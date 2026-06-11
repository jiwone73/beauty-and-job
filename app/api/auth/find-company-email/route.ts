// app/api/auth/find-company-email/route.ts
export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'

// 이메일 마스킹: 앞 2글자만 노출 (2글자 이하면 1글자)
function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at < 1) return email
  const local = email.slice(0, at)
  const domain = email.slice(at)
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2)
  return `${visible}***${domain}`
}

export async function POST(req: NextRequest) {
  const { business_number } = await req.json()

  if (!business_number) {
    return err('FIND_001', '사업자등록번호를 입력해주세요.')
  }

  const digits = String(business_number).replace(/[^0-9]/g, '')
  if (digits.length !== 10) {
    return err('FIND_002', '사업자등록번호는 10자리 숫자입니다.')
  }

  // 저장 포맷이 123-45-67890이든 1234567890이든 매칭되도록 양쪽 숫자만 비교
  const res = await pool.query(
    `SELECT email FROM companies
      WHERE regexp_replace(business_number, '[^0-9]', '', 'g') = $1
      LIMIT 1`,
    [digits]
  )

  if (!res.rowCount) {
    return ok({ found: false })
  }

  return ok({ found: true, email: maskEmail(res.rows[0].email) })
}