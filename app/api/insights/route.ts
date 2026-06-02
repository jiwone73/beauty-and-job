export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok } from '@/lib/api'

// 공개 인사이트 목록 (게시중만, 인증 불필요)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT id, title, category, content, tags, read_time, view_count, created_at
      FROM insights
      WHERE status = 'PUBLISHED'
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit])
    return ok({ items: result.rows })
  } finally {
    client.release()
  }
}