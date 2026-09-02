export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import { 제안유효일 } from "@/lib/proposal";
import pool from '@/lib/db'
import { ok, requireAuth } from '@/lib/api'

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'company')
  if (authErr) return authErr

  const companyId = auth!.sub
  const jobTypeParam = req.nextUrl.searchParams.get('job_type') // OFFICE | STORE | null
  const jobTypeFilter = jobTypeParam === 'OFFICE' || jobTypeParam === 'STORE'
    ? ` AND jp.job_type = '${jobTypeParam}'`
    : ''
  // job_postings 단독 쿼리용 (별칭 없음)
  const jobTypeFilterNoAlias = jobTypeParam === 'OFFICE' || jobTypeParam === 'STORE'
    ? ` AND job_type = '${jobTypeParam}'`
    : ''

  // 상단 통계 카운터 한 번에 조회
  const [activeJobs, totalApplications, todayApplications] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS cnt FROM job_postings 
       WHERE company_id = $1 AND status = 'ACTIVE'${jobTypeFilterNoAlias}`,
      [companyId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS cnt FROM applications a
       JOIN job_postings jp ON jp.id = a.job_posting_id
       WHERE jp.company_id = $1 AND a.hidden_by_company = false AND a.status <> 'WITHDRAWN'${jobTypeFilter}`,
      [companyId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS cnt FROM applications a
       JOIN job_postings jp ON jp.id = a.job_posting_id
       WHERE jp.company_id = $1 AND a.hidden_by_company = false AND a.status <> 'WITHDRAWN' AND a.applied_at::date = CURRENT_DATE${jobTypeFilter}`,
      [companyId]
    ),
  ])

  // 최근 7일 일별 지원자 추이
  const trendsRes = await pool.query(
    `SELECT TO_CHAR(d.day, 'MM/DD') AS label, COUNT(a.id)::int AS value
     FROM (SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS day) d
     LEFT JOIN applications a
       ON a.applied_at::date = d.day
       AND a.hidden_by_company = false AND a.status <> 'WITHDRAWN'
       AND a.job_posting_id IN (SELECT id FROM job_postings WHERE company_id = $1${jobTypeFilterNoAlias})
     GROUP BY d.day
     ORDER BY d.day`,
    [companyId]
  )

  // 공고별 지원 전환율 (진행중 공고, 조회수 높은 순)
  const conversionRes = await pool.query(
    `SELECT id, title, view_count::int AS view_count,
            (SELECT COUNT(*)::int FROM applications a
               WHERE a.job_posting_id = job_postings.id AND a.hidden_by_company = false AND a.status <> 'WITHDRAWN') AS application_count
     FROM job_postings
     WHERE company_id = $1 AND status = 'ACTIVE'${jobTypeFilterNoAlias}
     ORDER BY view_count DESC
     LIMIT 6`,
    [companyId]
  )
  const job_conversion = conversionRes.rows.map((r) => ({
    id: r.id,
    title: r.title,
    view_count: r.view_count,
    application_count: r.application_count,
    rate: r.view_count > 0 ? Math.round((r.application_count / r.view_count) * 1000) / 10 : null,
  }))

  // 오늘 마감 — 오늘 안에 손쓰지 않으면 내려가는 공고. '3일 내'는 오늘 할 일과 섞여 급한 정도가 흐려진다.
  const deadlineTodayRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt
     FROM job_postings
     WHERE company_id = $1 AND status = 'ACTIVE' AND deadline IS NOT NULL
       AND deadline::date = CURRENT_DATE${jobTypeFilterNoAlias}`,
    [companyId]
  )

  // 답 안 한 문의 — 구직자가 말을 걸었는데 매장이 아직 답하지 않은 대화.
  // 답하고 말고는 매장의 몫이지만, 몇 건이 기다리는지는 보여야 판단이 선다.
  const unansweredRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt
       FROM proposals p
      WHERE p.company_id = $1
        AND EXISTS (SELECT 1 FROM proposal_messages m WHERE m.proposal_id = p.id)
        AND (SELECT sender FROM proposal_messages m
              WHERE m.proposal_id = p.id ORDER BY m.created_at DESC LIMIT 1) = 'USER'
        AND NOT EXISTS (SELECT 1 FROM user_company_blocks b
                         WHERE b.user_id = p.user_id AND b.company_id = p.company_id)`,
    [companyId]
  )

  // 찜한 인재 — 제안하려고 담아 둔 사람. 쌓인 숫자가 아니라 아직 안 보낸 할 일이다.
  const scrapRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM company_talent_scraps WHERE company_id = $1`,
    [companyId]
  )
  // 회신 대기 — 보냈는데 아직 답이 없는 제안(기한 안쪽). 기한이 지난 것은 끝난 것이라 세지 않는다.
  const awaitingRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM proposals
      WHERE company_id = $1 AND interested_at IS NULL
        AND created_at >= NOW() - ($2 || ' days')::interval`,
    [companyId, String(제안유효일)]
  )

  // 아직 안 본 지원자 — 「미열람 지원자」 카드 제목에 쓴다.
  const unviewedRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt
       FROM applications a JOIN job_postings jp ON jp.id = a.job_posting_id
      WHERE jp.company_id = $1 AND a.viewed_at IS NULL
        AND a.hidden_by_company = false AND a.status <> 'WITHDRAWN'${jobTypeFilter}`,
    [companyId]
  )

  // 보낸제안 — 누적. 제안 관심 — 그중 「관심 있어요」를 누른 것. 채팅 — 그중 실제로
  // 말이 오간 것. 셋이 한 줄기라 나란히 두면 어디서 끊기는지가 보인다.
  const sentRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM proposals WHERE company_id = $1`,
    [companyId]
  )
  const interestedRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM proposals p
      WHERE p.company_id = $1 AND p.interested_at IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM user_company_blocks b
                         WHERE b.user_id = p.user_id AND b.company_id = p.company_id)`,
    [companyId]
  )
  const chatRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM proposals p
      WHERE p.company_id = $1
        AND EXISTS (SELECT 1 FROM proposal_messages m WHERE m.proposal_id = p.id)
        AND NOT EXISTS (SELECT 1 FROM user_company_blocks b
                         WHERE b.user_id = p.user_id AND b.company_id = p.company_id)`,
    [companyId]
  )

  return ok({
    unviewed_applications: unviewedRes.rows[0].cnt,
    sent_proposals: sentRes.rows[0].cnt,
    proposal_interested: interestedRes.rows[0].cnt,
    chats: chatRes.rows[0].cnt,
    scrapped_talents: scrapRes.rows[0].cnt,
    awaiting_reply: awaitingRes.rows[0].cnt,
    unanswered_chats: unansweredRes.rows[0].cnt,
    active_jobs: activeJobs.rows[0].cnt,
    total_applications: totalApplications.rows[0].cnt,
    today_applications: todayApplications.rows[0].cnt,
    trends: trendsRes.rows,
    job_conversion,
    deadline_today: deadlineTodayRes.rows[0].cnt,
  })
}
