export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'
import { verifyAccessToken } from '@/lib/jwt'

const ALLOWED_TYPES = ['계정/로그인', '채용공고', '기업회원', '기타']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, type, subject, message } = body

    if (!name || !message) {
      return err('BAD_REQUEST', '이름과 문의 내용을 입력해주세요.', 400)
    }
    const inquiryType = ALLOWED_TYPES.includes(type) ? type : '기타'

    // 로그인 사용자면 user_id 추출 (비로그인도 허용)
    let userId: string | null = null
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '').trim()
    if (token) {
      try {
        const payload = verifyAccessToken(token)
        if (payload.owner_type === 'user') userId = payload.sub
      } catch { /* 토큰 무효여도 문의는 접수 */ }
    }

    const client = await pool.connect()
    try {
      const result = await client.query(
        `INSERT INTO inquiries (name, email, type, subject, message, status, user_id)
         VALUES ($1, $2, $3, $4, $5, 'new', $6)
         RETURNING id, created_at`,
        [name, email || null, inquiryType, subject || null, message, userId]
      )
      return ok({ id: result.rows[0].id, created_at: result.rows[0].created_at })
    } finally {
      client.release()
    }
  } catch (e) {
    console.error('inquiry error:', e)
    return err('SERVER_ERROR', '문의 저장 중 오류가 발생했습니다.', 500)
  }
}
