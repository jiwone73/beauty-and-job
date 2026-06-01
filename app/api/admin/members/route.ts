export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

// 회원 목록 조회 (개인)
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT
        id, name, email::text AS email, phone, job_type, status,
        kakao_id, naver_id, last_login_at, created_at
      FROM users
      ORDER BY created_at DESC
    `)
    return ok({ items: result.rows })
  } finally {
    client.release()
  }
}

// 회원 상태 변경
export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const { id, status } = await req.json()
  if (!id || !status) return err('BAD_REQUEST', 'id, status 필요', 400)
  if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status))
    return err('BAD_REQUEST', '잘못된 status', 400)

  const client = await pool.connect()
  try {
    await client.query(`UPDATE users SET status = $1::user_status, updated_at = now() WHERE id = $2`, [status, id])
    return ok({ success: true })
  } finally {
    client.release()
  }
}

// 회원 삭제
export async function DELETE(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return err('BAD_REQUEST', 'id 필요', 400)

  const client = await pool.connect()
  try {
    await client.query(`DELETE FROM users WHERE id = $1`, [id])
    return ok({ success: true })
  } finally {
    client.release()
  }
}