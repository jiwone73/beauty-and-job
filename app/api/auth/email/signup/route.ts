export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'
import { signAccessToken } from '@/lib/jwt'
import { sendWelcomeEmail } from '@/lib/email'
import { passwordError } from '@/lib/password'
import { getGroupNames, 경력단계, 경력묶음 } from '@/lib/data/jobGroups'
export async function POST(req: NextRequest) {
  const { email, name, phone: rawPhone, password, birth, gender, job_type = 'OFFICE',
          main_job_group, career_stage, preferred_regions, agreed_term_ids } = await req.json()
  const phone = (rawPhone || '').replace(/\D/g, '')

  if (!email || !password || !name || !phone) {
    return err('USER_002', '필수 항목을 모두 입력해주세요.')
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return err('USER_002', '올바른 이메일 형식이 아닙니다.')
  }

  const pwErr = passwordError(password)
  if (pwErr) {
    return err('USER_002', pwErr)
  }

  if (!agreed_term_ids || agreed_term_ids.length === 0) {
    return err('TERM_001', '필수 약관에 동의해주세요.')
  }

  // 간편가입(/api/auth/social/complete)과 같은 것을 같은 방식으로 확인한다.
  // 고른 값이 그 직군의 사다리에 있는 것인지까지 봐야 기업의 경력 필터에 걸린다.
  const 대분류 = String(main_job_group || '')
  const 단계 = String(career_stage || '')
  if (!getGroupNames(job_type).includes(대분류)) return err('USER_002', '직군을 선택해주세요.')
  if (!경력단계(대분류, job_type).includes(단계)) return err('USER_002', '경력을 선택해주세요.')
  const 지역 = Array.isArray(preferred_regions) ? preferred_regions : []
  if (지역.length === 0) return err('USER_002', '희망 근무지역을 선택해주세요.')
  if (지역.length > 5) return err('USER_002', '희망 근무지역은 최대 5개까지 가능합니다.')

  const birthDate = typeof birth === 'string' && /^\d{8}$/.test(birth) ? birth : null
  const genderVal = gender === '남성' || gender === '여성' ? gender : null

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const dupRes = await client.query(
      `SELECT id, email, phone FROM users WHERE email = $1 OR phone = $2`,
      [email, phone]
    )
    if (dupRes.rowCount && dupRes.rowCount > 0) {
      const exists = dupRes.rows[0]
      await client.query('ROLLBACK')
      if (exists.email === email) {
        return err('USER_001', '이미 가입된 이메일입니다.', 409)
      }
      if (exists.phone === phone) {
        return err('USER_001', '이미 가입된 전화번호입니다.', 409)
      }
    }
    // 이메일은 기업(companies) 계정과도 중복 불가
    const compDupRes = await client.query(
      `SELECT 1 FROM companies WHERE email = $1 LIMIT 1`,
      [email]
    )
    if (compDupRes.rowCount && compDupRes.rowCount > 0) {
      await client.query('ROLLBACK')
      return err('USER_001', '이미 가입된 이메일입니다.', 409)
    }
    const passwordHash = await bcrypt.hash(password, 10)

    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, name, phone, job_type, birth_date, gender,
                          preferred_regions, status)
       VALUES ($1, $2, $3, $4, $5, TO_DATE($6, 'YYYYMMDD'), $7, $8::jsonb, 'ACTIVE')
       RETURNING id, email, name, phone, job_type, status, created_at`,
      [email, passwordHash, name, phone, job_type, birthDate, genderVal, JSON.stringify(지역)]
    )
    const user = userRes.rows[0]

    // 인재 검색은 user_profiles 를 INNER JOIN 한다 — 이 행이 없으면 기업 눈에
    // 아예 안 보인다. 간편가입과 같은 자리에서 같이 만든다.
    await client.query(
      `INSERT INTO user_profiles (user_id, main_job_group, career_stage, is_entry_level, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET main_job_group = EXCLUDED.main_job_group,
             career_stage   = EXCLUDED.career_stage,
             is_entry_level = EXCLUDED.is_entry_level,
             updated_at     = NOW()`,
      [user.id, 대분류, 단계, 경력묶음(단계) === '신입']
    )

    for (const termId of agreed_term_ids) {
      await client.query(
        `INSERT INTO term_agreements (owner_type, owner_id, term_id, agreed_at)
         VALUES ('user', $1, $2, NOW())`,
        [user.id, termId]
      )
    }

    await client.query('COMMIT')

    await sendWelcomeEmail(user.email, user.name).catch((e) => console.error('[welcome email]', e))

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
