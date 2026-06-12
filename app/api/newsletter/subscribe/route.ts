export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return err('USER_002', '올바른 이메일을 입력해주세요.', 400)
  }

  // 중복 이메일이어도 에러 없이 처리(재구독이면 is_active 복원)
  await pool.query(
    `INSERT INTO newsletter_subscribers (email, source)
     VALUES ($1, 'banner')
     ON CONFLICT (email) DO UPDATE SET is_active = true`,
    [email.toLowerCase().trim()]
  )

  return ok({ message: '구독 신청이 완료되었습니다.' })
}