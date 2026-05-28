export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

// 스크랩 추가
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { auth, res: authErr } = requireAuth(req, 'company')
  if (authErr) return authErr

  const { userId } = params
  if (!userId) return err('TALENT_002', '대상 인재가 없습니다.', 400)

  try {
    await pool.query(
      `INSERT INTO company_talent_scraps (company_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (company_id, user_id) DO NOTHING`,
      [auth!.sub, userId]
    )
    return ok({ scrapped: true })
  } catch (e: any) {
    console.error('[talent scrap POST]', e)
    return err('TALENT_003', '스크랩 실패: ' + e.message, 500)
  }
}

// 스크랩 제거
export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { auth, res: authErr } = requireAuth(req, 'company')
  if (authErr) return authErr

  const { userId } = params
  if (!userId) return err('TALENT_002', '대상 인재가 없습니다.', 400)

  try {
    await pool.query(
      `DELETE FROM company_talent_scraps
       WHERE company_id = $1 AND user_id = $2`,
      [auth!.sub, userId]
    )
    return ok({ scrapped: false })
  } catch (e: any) {
    console.error('[talent scrap DELETE]', e)
    return err('TALENT_004', '스크랩 해제 실패: ' + e.message, 500)
  }
}