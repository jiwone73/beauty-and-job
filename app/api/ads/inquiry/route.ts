export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { company_name, contact_name, phone, email, product, message, type } = body

    if (!contact_name || !message) {
      return err('BAD_REQUEST', '필수 항목을 모두 입력해주세요.', 400)
    }

    const client = await pool.connect()
    try {
      const result = await client.query(
        `INSERT INTO ad_inquiries
          (company_name, contact_name, phone, email, product, message, status, type)
         VALUES ($1, $2, $3, $4, $5, $6, 'new', $7)
         RETURNING id, created_at`,
        [company_name || null, contact_name, phone || null, email || null, product || null, message, type || '광고']
      )
      return ok({ id: result.rows[0].id, created_at: result.rows[0].created_at })
    } finally {
      client.release()
    }
  } catch (e) {
    console.error('ad inquiry error:', e)
    return err('SERVER_ERROR', '문의 저장 중 오류가 발생했습니다.', 500)
  }
}
