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
        `SELECT i.id, i.name, i.email, i.phone, i.type, i.subject, i.message, i.status,
                i.user_id, i.created_at, i.replied_at, i.opened_at,
                COALESCE(f.files, '[]'::json) AS files
         FROM inquiries i
         LEFT JOIN LATERAL (
           SELECT json_agg(json_build_object('id', x.id, 'name', x.file_name, 'size', x.file_size)
                           ORDER BY x.id) AS files
             FROM inquiry_files x
            WHERE x.kind = 'support' AND x.inquiry_id = i.id::text
         ) f ON true
         ${whereClause}
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
  const { id, to, subject, body, attachments } = await req.json()
  if (!id || !to || !subject || !body) return err('BAD_REQUEST', 'id, to, subject, body 필요', 400)
  try {
    await sendInquiryReplyEmail(to, subject, body, attachments)
  } catch (e: any) {
    return err('EMAIL_SEND_FAILED', e?.message || '메일 발송에 실패했습니다.', 500)
  }
  const client = await pool.connect()
  try {
    await client.query(`UPDATE inquiries SET status = 'done', replied_at = now() WHERE id = $1`, [id])
    return ok({ id, status: 'done' })
  } finally {
    client.release()
  }
}

export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr
  const { id, status, mark_opened } = await req.json()
  if (!id) return err('BAD_REQUEST', 'id 필요', 400)
  const client = await pool.connect()
  try {
    // 미답변 문의: 열어 봤다는 시각만 남긴다. 이미 열어 봤으면 시각을 덮지 않는다.
    if (mark_opened) {
      await client.query(`UPDATE inquiries SET opened_at = COALESCE(opened_at, now()) WHERE id = $1`, [id])
      return ok({ success: true })
    }
    if (!status) return err('BAD_REQUEST', 'id, status 필요', 400)
    if (!['new', 'contacted', 'done'].includes(status)) return err('BAD_REQUEST', '잘못된 status', 400)
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
