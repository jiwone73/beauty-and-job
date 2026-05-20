import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'
import { signAccessToken } from '@/lib/jwt'

export async function POST(req: NextRequest) {
  const { phone, code } = await req.json()
  if (!phone || !code) return err('AUTH_003', '전화번호와 인증번호를 입력해주세요.')

  // OTP 확인
  const otpKey = `otp:${phone}:${code}`
  const otpRes = await pool.query(
    `SELECT id FROM refresh_tokens
     WHERE token_hash = $1 AND expires_at > now() AND revoked_at IS NULL`,
    [otpKey]
  )
  if (otpRes.rowCount === 0) return err('AUTH_003', '인증번호가 올바르지 않거나 만료됐습니다.', 401)

  // OTP 사용 처리
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1`,
    [otpKey]
  )

  // 유저 조회
  const userRes = await pool.query(
    `SELECT id, name, job_type, status FROM users WHERE phone = $1`,
    [phone]
  )

  const isNewUser = userRes.rowCount === 0

  if (!isNewUser) {
    const user = userRes.rows[0]
    if (user.status === 'SUSPENDED') return err('USER_002', '정지된 계정입니다.', 403)

    const accessToken = signAccessToken({
      sub: user.id,
      owner_type: 'user',
      role: 'user'
    })

    await pool.query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id])

    return ok({ access_token: accessToken, is_new_user: false, user })
  }

  return ok({ is_new_user: true, phone })
}
