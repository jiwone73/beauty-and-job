export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, requireAuth } from '@/lib/api'

// 가장 최근 지원의 자기소개서 불러오기 (지원 모달 기본값용)
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'user')
  if (authErr) return authErr
  const result = await pool.query(
    `SELECT cover_letter
     FROM applications
     WHERE user_id = $1 AND cover_letter IS NOT NULL AND cover_letter <> ''
     ORDER BY applied_at DESC
     LIMIT 1`,
    [auth!.sub]
  )
  return ok({ cover_letter: result.rows[0]?.cover_letter || "" })
}