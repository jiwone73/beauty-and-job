export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'

// 단일 인사이트 조회 (게시중만) + 조회수 +1
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id
  if (!id) return err('BAD_REQUEST', 'id 필요', 400)

  const client = await pool.connect()
  try {
    const result = await client.query(`
      UPDATE insights SET view_count = view_count + 1
      WHERE id = $1 AND status = 'PUBLISHED'
      RETURNING id, title, category, content, tags, read_time, view_count, created_at
    `, [id])
    if (result.rows.length === 0) return err('NOT_FOUND', '글을 찾을 수 없습니다.', 404)
    return ok({ item: result.rows[0] })
  } catch {
    return err('NOT_FOUND', '글을 찾을 수 없습니다.', 404)
  } finally {
    client.release()
  }
}