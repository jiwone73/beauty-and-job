export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'

export async function POST(req: NextRequest) {
  const { phone, code, purpose } = await req.json()
  if (!phone || !code) return err('AUTH_003', '휴대폰 번호와 인증번호를 입력해주세요.')

  const cleanPhone = phone.replace(/\D/g, '')
  const purposeVal = purpose === 'find_account' ? 'find_account' : 'signup'

  const res = await pool.query(
    `SELECT id FROM phone_verifications
     WHERE phone = $1 AND code = $2 AND purpose = $3
       AND verified = false AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [cleanPhone, code, purposeVal]
  )

  if (res.rowCount === 0) {
    return err('AUTH_003', '인증번호가 올바르지 않거나 만료됐습니다.', 401)
  }

  // 인증 완료 처리
  await pool.query(
    `UPDATE phone_verifications SET verified = true WHERE id = $1`,
    [res.rows[0].id]
  )

  return ok({ verified: true })
}
