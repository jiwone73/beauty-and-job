export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, requireAuth } from '@/lib/api'

// 특정 회원을 스크랩한 기업 목록
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT c.id, c.name, c.logo_url
      FROM company_talent_scraps s
      JOIN companies c ON c.id = s.company_id
      WHERE s.user_id = $1
      ORDER BY c.name
    `, [params.id])
    return ok({ items: result.rows })
  } finally {
    client.release()
  }
}
