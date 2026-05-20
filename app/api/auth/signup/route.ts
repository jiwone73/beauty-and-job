export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'
import { signAccessToken } from '@/lib/jwt'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    phone,
    name,
    job_type,
    desired_job_category_id,
    desired_location,
    agreed_term_ids
  } = body

  if (!phone || !name || !job_type) {
    return err('AUTH_001', '필수 정보가 누락됐습니다.')
  }

  // 필수 약관 동의 확인
  if (!agreed_term_ids || agreed_term_ids.length === 0) {
    return err('TERM_001', '필수 약관에 동의해주세요.')
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // 중복 가입 체크
    const dup = await client.query('SELECT id FROM users WHERE phone = $1', [phone])
    if (dup.rowCount && dup.rowCount > 0) {
      await client.query('ROLLBACK')
      return err('USER_001', '이미 가입된 전화번호입니다.', 409)
    }

    // 유저 생성
    const userRes = await client.query(
      `INSERT INTO users (phone, name, job_type, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       RETURNING id, name, phone, job_type, status, created_at`,
      [phone, name, job_type]
    )
    const user = userRes.rows[0]

    // 약관 동의 기록
    for (const termId of agreed_term_ids) {
      await client.query(
        `INSERT INTO term_agreements (owner_id, owner_type, term_id, ip_address)
         VALUES ($1, 'user', $2, $3)`,
        [user.id, termId, req.headers.get('x-forwarded-for') || null]
      )
    }

    // 기본 이력서 생성 (DRAFT)
    if (desired_job_category_id || desired_location) {
      await client.query(
        `INSERT INTO resumes (user_id, title, job_type, is_primary, desired_job_category_id, desired_location, status)
         VALUES ($1, $2, $3, true, $4, $5, 'DRAFT')`,
        [user.id, '나의 이력서', job_type, desired_job_category_id || null, desired_location || null]
      )
    }

    await client.query('COMMIT')

    const accessToken = signAccessToken({
      sub: user.id,
      owner_type: 'user',
      role: 'user'
    })

    return ok({ access_token: accessToken, user }, 201)
  } catch (e: any) {
    await client.query('ROLLBACK')
    console.error('[signup error]', e)
    return err('USER_001', '회원가입 중 오류가 발생했습니다.', 500)
  } finally {
    client.release()
  }
}
