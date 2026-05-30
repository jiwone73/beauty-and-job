export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'

export async function POST(req: NextRequest) {
  const { phone } = await req.json()
  if (!phone) return err('AUTH_001', '휴대폰 번호를 입력해주세요.')

  const cleanPhone = phone.replace(/\D/g, '')

  // 해당 번호로 find_account 목적의 인증이 완료됐는지 확인
  const vRes = await pool.query(
    `SELECT id FROM phone_verifications
     WHERE phone = $1 AND purpose = 'find_account'
       AND verified = true AND expires_at > now() - INTERVAL '10 minutes'
     ORDER BY created_at DESC LIMIT 1`,
    [cleanPhone]
  )
  if (vRes.rowCount === 0) {
    return err('AUTH_003', '휴대폰 인증을 먼저 완료해주세요.', 401)
  }

  // 가입된 계정 조회
  const userRes = await pool.query(
    `SELECT email, created_at FROM users WHERE replace(phone, '-', '') = $1 ORDER BY created_at ASC`,
    [cleanPhone]
  )

  if (userRes.rowCount === 0) {
    return ok({ found: false, accounts: [] })
  }

  // 이메일 일부 마스킹 (예: te***@example.com)
  const accounts = userRes.rows.map((u: { email: string; created_at: string }) => {
    const [local, domain] = u.email.split('@')
    const masked = local.length <= 2
      ? local[0] + '*'
      : local.slice(0, 2) + '*'.repeat(Math.max(1, local.length - 2))
    return { email_masked: `${masked}@${domain}`, created_at: u.created_at }
  })

  return ok({ found: true, accounts })
}
