export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'
import { signAccessToken } from '@/lib/jwt'
export async function POST(req: NextRequest) {
  const { email, name, phone, password, birth, job_type = 'OFFICE', agreed_term_ids } = await req.json()

  // 필수값 검증
  if (!email || !password || !name || !phone) {
    return err('USER_002', '필수 항목을 모두 입력해주세요.')
  }

  // 이메일 형식 검증
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return err('USER_002', '올바른 이메일 형식이 아닙니다.')
  }

  // 비밀번호 길이
  if (password.length < 8) {
    return err('USER_002', '비밀번호는 최소 8자 이상이어야 합니다.')
  }

  // 약관 동의 확인
  if (!agreed_term_ids || agreed_term_ids.length === 0) {
    return err('TERM_001', '필수 약관에 동의해주세요.')
  }

  // 생년월일 정규화 (YYYYMMDD 8자리만 허용, 그 외 NULL)
  const birthDate = typeof birth === 'string' && /^\d{8}$/.test(birth) ? birth : null

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 중복 체크
    const dupRes = await client.query(
      `SELECT id, email, phone FROM users WHERE email = $1 OR phone = $2`,
      [email, phone]
    )
    if (dupRes.rowCount && dupRes.rowCount > 0) {
      const exists = dupRes.rows[0]
      if (exists.email === email) {
        return err('USER_001', '이미 가입된 이메일입니다.', 409)
      }
      if (exists.phone === phone) {
        return err('USER_001', '이미 가입된 전화번호입니다.', 409)
      }
    }
    const passwordHash = await bcrypt.hash(password, 10)

    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, name, phone, job_type, birth_date, status)
       VALUES ($1, $2, $3, $4, $5, TO_DATE($6, 'YYYYMMDD'), 'ACTIVE')
       RETURNING id, email, name, phone, job_type, status, created_at`,
      [email, passwordHash, name, phone, job_type, birthDate]
    )
    const user = userRes.rows[0]

    // 약관 동의 기록
    for (const termId of agreed_term_ids) {
      await client.query(
        `INSERT INTO term_agreements (owner_type, owner_id, term_id, agreed_at)
         VALUES ('user', $1, $2, NOW())`,
        [user.id, termId]
      )
    }

    await client.query('COMMIT')

    // Access Token 발급
    const accessToken = signAccessToken({
      sub: user.id,
      owner_type: 'user',
      role: 'user',
    })

    return ok({ access_token: accessToken, user }, 201)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}