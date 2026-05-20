import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'

export async function POST(req: NextRequest) {
  const { phone } = await req.json()

  if (!phone) return err('AUTH_001', '전화번호를 입력해주세요.')

  const code = process.env.NODE_ENV === 'production'
    ? Math.floor(100000 + Math.random() * 900000).toString()
    : '123456'

  const expiresAt = new Date(Date.now() + 3 * 60 * 1000)

  // ON CONFLICT 시 revoked_at도 초기화 (재발송 지원)
  await pool.query(
    `INSERT INTO refresh_tokens (owner_id, owner_type, token_hash, expires_at)
     VALUES (gen_random_uuid(), 'user', $1, $2)
     ON CONFLICT (token_hash) DO UPDATE
       SET expires_at = $2, revoked_at = NULL`,
    [`otp:${phone}:${code}`, expiresAt]
  )

  console.log(`[OTP] ${phone} → ${code}`)

  return ok({ expires_in: 180 })
}
