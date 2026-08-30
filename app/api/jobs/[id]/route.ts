export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, getAuth } from '@/lib/api'
import { 공고읽기 } from '@/lib/jobDetail'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const auth = getAuth(req)

  const response = await 공고읽기(id)
  if (!response) {
    return err('JOB_001', '공고를 찾을 수 없거나 마감되었습니다.', 404)
  }

  // 조회수 +1 (비동기로 처리, 응답 지연 안 시킴)
  pool.query(
    'UPDATE job_postings SET view_count = view_count + 1 WHERE id = $1',
    [id]
  ).catch(e => console.error('[view_count update]', e))

  // 로그인 유저의 경우: 북마크 / 지원 여부 추가 조회
  if (auth?.owner_type === 'user') {
    const [bookmarkRes, applyRes] = await Promise.all([
      pool.query(
        'SELECT id FROM bookmarks WHERE user_id = $1 AND job_posting_id = $2',
        [auth.sub, id]
      ),
      pool.query(
        'SELECT id FROM applications WHERE user_id = $1 AND job_posting_id = $2',
        [auth.sub, id]
      )
    ])
    response.is_bookmarked = (bookmarkRes.rowCount ?? 0) > 0
    response.has_applied = (applyRes.rowCount ?? 0) > 0
  }

  return ok(response)
}
