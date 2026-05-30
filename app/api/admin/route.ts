export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  const where: string[] = []
  const params: any[] = []
  let idx = 1

  if (status) {
    where.push(`status = $${idx++}`)
    params.push(status)
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const client = await pool.connect()
  try {
    const [listResult, countResult] = await Promise.all([
      client.query(
        `SELECT id, company_name, contact_name, phone, email, product, message, status, created_at
         FROM ad_inquiries
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      client.query(
        `SELECT COUNT(*) FROM ad_inquiries ${whereClause}`,
        params
      ),
    ])
    return ok({
      items: listResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    })
  } finally {
    client.release()
  }
}

export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const { id, status } = await req.json()
  if (!id || !status) return err