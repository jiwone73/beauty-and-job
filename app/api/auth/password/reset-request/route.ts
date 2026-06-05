export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import crypto from 'crypto'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email) {
    return err('USER_002', '이메일을 입력해주세요.')
  }

  // users + companies에서 이메일 검색
  const userRes = await pool.query(
    `SELECT id FROM users WHERE email = $1`, [email]
  )
  const companyRes = await pool.query(
    `SELECT id FROM companies WHERE email = $1`, [email]
  )

  let owner: { type: 'user' | 'company'; id: string } | null = null
  if (userRes.rowCount && userRes.rowCount > 0) {
    owner = { type: 'user', id: userRes.rows[0].id }
  } else if (companyRes.rowCount && companyRes.rowCount > 0) {
    owner = { type: 'company', id: companyRes.rows[0].id }
  }

  // 보안: 이메일 존재 여부와 상관없이 항상 성공 응답
  if (owner) {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30분 유효

    await pool.query(
      `INSERT INTO password_reset_tokens (owner_type, owner_id, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [owner.type, owner.id, token, expiresAt]
    )

    const resetUrl = `https://beauty-and-job.vercel.app/login/password-reset/${token}`
    try {
      await sendPasswordResetEmail(email, resetUrl)
    } catch (e) {
      console.error("이메일 발송 실패:", e)
    }
  }

  return ok({ message: '비밀번호 재설정 메일을 발송했습니다.' })
}
