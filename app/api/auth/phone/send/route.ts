export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'
import { sendSMS, generateCode } from '@/lib/sms/send'

export async function POST(req: NextRequest) {
  const { phone, purpose } = await req.json()
  if (!phone) return err('AUTH_001', '휴대폰 번호를 입력해주세요.')

  const cleanPhone = phone.replace(/\D/g, '')
  if (cleanPhone.length < 10) return err('AUTH_001', '올바른 휴대폰 번호를 입력해주세요.')

  const code = generateCode()
  const expiresAt = new Date(Date.now() + 3 * 60 * 1000) // 3분
  const purposeVal = purpose === 'find_account' ? 'find_account' : 'signup'

  // 기존 미인증 코드 정리 후 새로 발급
  await pool.query(
    `DELETE FROM phone_verifications WHERE phone = $1 AND purpose = $2 AND verified = false`,
    [cleanPhone, purposeVal]
  )
  await pool.query(
    `INSERT INTO phone_verifications (phone, code, purpose, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [cleanPhone, code, purposeVal, expiresAt]
  )

  await sendSMS(cleanPhone, `[뷰티앤잡] 인증번호는 ${code} 입니다.`)

  return ok({ expires_in: 180 })
}
