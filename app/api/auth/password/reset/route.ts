export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()

  if (!token || !password) {
    return err('USER_002', '토큰과 새 비밀번호를 입력해주세요.')
  }

  if (password.length < 8) {
    return err('USER_002', '비밀번호는 최소 8자 이상이어야 합니다.')
  }

  const tokenRes = await pool.query(
    `SELECT id, owner_type, owner_id, expires_at, used_at
     FROM password_reset_tokens WHERE token = $1`,
    [token]
  )

  if (tokenRes.rowCount === 0) {
    return err('AUTH_002', '유효하지 않은 링크입니다.', 400)
  }

  const t = tokenRes.rows[0]

  if (t.used_at) {
    return err('AUTH_002', '이미 사용된 링크입니다.', 400)
  }

  if (new Date(t.expires_at) < new Date()) {
    return err('AUTH_002', '만료된 링크입니다. 다시 요청해주세요.', 400)
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 사용자/기업 비밀번호 업데이트
    const table = t.owner_type === 'user' ? 'users' : 'companies'
    await client.query(
      `UPDATE ${table} SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, t.owner_id]
    )

    // 토큰 사용 처리
    await client.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
      [t.id]
    )

    await client.query('COMMIT')

    return ok({ message: '비밀번호가 변경되었습니다.' })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
