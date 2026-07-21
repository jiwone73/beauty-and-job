export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'
import { sendInquiryReplyEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit
  const where: string[] = []
  const params: any[] = []
  let idx = 1
  if (status) { where.push(`status = $${idx++}`); params.push(status) }
  if (type) { where.push(`type = $${idx++}`); params.push(type) }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const client = await pool.connect()
  try {
    const [listResult, countResult] = await Promise.all([
      client.query(
        `SELECT id, name, email, phone, type, subject, message, status, user_id, created_at
         FROM inquiries ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      client.query(`SELECT COUNT(*) FROM inquiries ${whereClause}`, params),
    ])
    return ok({
      items: listResult.rows,
      total: parseInt(countResult.rows[0].count),
      page, limit,
    })
  } finally {
    client.release()
  }
}

// 사업/1:1 문의 답변 메일 발송(support@beautywork.co.kr) + 상태 완료 처리
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr
  const { id, to, subject, body } = await req.json()
  if (!id || !to || !subject || !body) return err('BAD_REQUEST', 'id, to, subject, body 필요', 400)
  try {
    await sendInquiryReplyEmail(to, subject, body)
  } catch (e: any) {
    return err('EMAIL_SEND_FAILED', e?.message || '메일 발송에 실패했습니다.', 500)
  }
  const client = await pool.connect()
  try {
    await client.query(`UPDATE inquiries SET status = 'done' WHERE id = $1`, [id])
    return ok({ id, status: 'done' })
  } finally {
    client.release()
  }
}

export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr
  const { id, status } = await req.json()
  if (!id || !status) return err('BAD_REQUEST', 'id, status 필요', 400)
  if (!['new', 'contacted', 'done'].includes(status)) return err('BAD_REQUEST', '잘못된 status', 400)
  const client = await pool.connect()
  try {
    await client.query(`UPDATE inquiries SET status = $1 WHERE id = $2`, [status, id])
    return ok({ id, status })
  } finally {
    client.release()
  }
}

export async function DELETE(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr
  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) return err('BAD_REQUEST', 'ids 배열 필요', 400)
  const client = await pool.connect()
  try {
    await client.query(`DELETE FROM inquiries WHERE id = ANY($1)`, [ids])
    return ok({ deleted: ids.length })
  } finally {
    client.release()
  }
}
