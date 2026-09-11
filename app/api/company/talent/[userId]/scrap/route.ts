export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

// 스크랩은 공고별로 담는다(2026-09-11). 같은 사람을 여러 공고에 담을 수 있고,
// 공고를 고르지 않고 담은 것은 job_posting_id 가 비어 「공고 없이 담은 사람」이 된다.
// 사람인이 「후보자 저장」 때 공고를 고르게 하는 것과 같은 짜임 — 스크랩 인재에서
// 공고를 누르면 그 공고로 담은 사람만 본다.

const UUID = /^[0-9a-f-]{36}$/i

/** 이 사람을 어느 공고로 담아 두었나. 공고 없이 담은 것은 "none". */
async function 담은공고(companyId: string, userId: string): Promise<string[]> {
  const r = await pool.query(
    `SELECT COALESCE(job_posting_id::text, 'none') AS j FROM company_talent_scraps
      WHERE company_id = $1 AND user_id = $2`,
    [companyId, userId]
  )
  return r.rows.map((x: any) => x.j)
}

// 스크랩 추가 — body.jobPostingId 가 있으면 그 공고로, 없으면 공고 없이.
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { auth, res: authErr } = requireAuth(req, 'company')
  if (authErr) return authErr

  const { userId } = params
  if (!userId) return err('TALENT_002', '대상 인재가 없습니다.', 400)

  const body = await req.json().catch(() => ({}))
  const raw = body?.jobPostingId
  const jobId = typeof raw === 'string' && UUID.test(raw) ? raw : null
  if (raw && !jobId) return err('TALENT_002', '공고가 올바르지 않습니다.', 400)

  try {
    if (jobId) {
      // 남의 공고로 담을 수는 없다.
      const own = await pool.query(
        `SELECT 1 FROM job_postings WHERE id = $1 AND company_id = $2`, [jobId, auth!.sub])
      if (own.rowCount === 0) return err('TALENT_002', '우리 공고가 아닙니다.', 403)
    }
    await pool.query(
      `INSERT INTO company_talent_scraps (company_id, user_id, job_posting_id)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [auth!.sub, userId, jobId]
    )
    const scrapJobIds = await 담은공고(auth!.sub, userId)
    return ok({ scrapped: scrapJobIds.length > 0, scrapJobIds })
  } catch (e: any) {
    console.error('[talent scrap POST]', e)
    return err('TALENT_003', '스크랩 실패: ' + e.message, 500)
  }
}

// 스크랩 제거 — ?job=<공고 id | none> 이면 그 공고에서만 빼고, 없으면 그 사람을 통째로 뺀다.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { auth, res: authErr } = requireAuth(req, 'company')
  if (authErr) return authErr

  const { userId } = params
  if (!userId) return err('TALENT_002', '대상 인재가 없습니다.', 400)

  const job = (new URL(req.url).searchParams.get('job') || '').trim()
  if (job && job !== 'none' && !UUID.test(job)) return err('TALENT_002', '공고가 올바르지 않습니다.', 400)

  try {
    const 조건 = job === 'none' ? 'AND job_posting_id IS NULL' : job ? 'AND job_posting_id = $3' : ''
    await pool.query(
      `DELETE FROM company_talent_scraps WHERE company_id = $1 AND user_id = $2 ${조건}`,
      job && job !== 'none' ? [auth!.sub, userId, job] : [auth!.sub, userId]
    )
    const scrapJobIds = await 담은공고(auth!.sub, userId)
    return ok({ scrapped: scrapJobIds.length > 0, scrapJobIds })
  } catch (e: any) {
    console.error('[talent scrap DELETE]', e)
    return err('TALENT_004', '스크랩 해제 실패: ' + e.message, 500)
  }
}
