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
    `SELECT id, email, name, phone, password_hash, status, job_type
     FROM users WHERE email = $1`,
    [email]
  )

  if (res.rowCount === 0) {
    return err('AUTH_001', '이메일 또는 비밀번호가 올바르지 않습니다.', 401)
  }

  const user = res.rows[0]

  if (!user.password_hash) {
    return err('AUTH_001', '이메일 가입 정보가 없습니다. 다른 방법으로 로그인해주세요.', 401)
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return err('AUTH_001', '이메일 또는 비밀번호가 올바르지 않습니다.', 401)
  }

  if (user.status !== 'ACTIVE') {
    return err('USER_003', '비활성화된 계정입니다.', 403)
  }

  // 마지막 로그인 시간 업데이트 (비동기)
  pool.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id])
    .catch(e => console.error('[update last_login_at]', e))

  const accessToken = signAccessToken({
    sub: user.id,
    owner_type: 'user',
    role: 'user',
  })

  const { password_hash, ...userData } = user
  return ok({ access_token: accessToken, user: userData })
}
