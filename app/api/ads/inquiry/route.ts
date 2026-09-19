export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'
import { 몸통읽기, 첨부저장 } from '@/lib/inquiryFiles'

export async function POST(req: NextRequest) {
  try {
    const { 값: body, 파일들 } = await 몸통읽기(req)
    const { company_name, contact_name, phone, email, product, subject, message, type, privacy_agreed } = body

    if (!contact_name || !message) {
      return err('BAD_REQUEST', '필수 항목을 모두 입력해주세요.', 400)
    }

    const client = await pool.connect()
    try {
      const result = await client.query(
        `INSERT INTO ad_inquiries
          (company_name, contact_name, phone, email, product, subject, message, status, type, privacy_agreed, agreed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', $8, $9, $10)
         RETURNING id, created_at`,
        [company_name || null, contact_name, phone || null, email || null, product || null, subject || null, message, type || '광고', privacy_agreed === true, privacy_agreed === true ? new Date() : null]
      )
      const 붙인수 = 파일들.length ? await 첨부저장('ad', result.rows[0].id, 파일들) : 0
      return ok({ id: result.rows[0].id, created_at: result.rows[0].created_at, files: 붙인수 })
    } finally {
      client.release()
    }
  } catch (e) {
    console.error('ad inquiry error:', e)
    return err('SERVER_ERROR', '문의 저장 중 오류가 발생했습니다.', 500)
  }
}
