// app/api/auth/find-email/route.ts
export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'

// 이메일 마스킹: 앞 2글자만 노출 (2글자 이하면 1글자)
function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at < 1) return email
  const local = email.slice(0, at)
  const domain = email.slice(at) // '@...' 포함
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2)
  return `${visible}***${domain}`
}

export async function POST(req: NextRequest) {
  const { name, phone } = await req.json()

  if (!name || !phone) {
    return err('FIND_001', '이름과 휴대폰번호를 모두 입력해주세요.')
  }

  // 휴대폰은 숫자만 비교 → 저장 포맷이 010-1234-5678이든 01012345678이든 매칭됨
  const digits = String(phone).replace(/[^0-9]/g, '')

  const res = await pool.query(
    `SELECT email FROM users
      WHERE TRIM(name) = $1
        AND regexp_replace(phone, '[^0-9]', '', 'g') = $2
      LIMIT 1`,
    [String(name).trim(), digits]
  )

  if (!res.rowCount) {
    return ok({ found: false })
  }

  return ok({ found: true, email: maskEmail(res.rows[0].email) })
}
