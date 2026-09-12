export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import { 채팅열림SQL } from "@/lib/proposal";
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
      // 마감일이 지난 공고는 화면에서 「마감」으로 보인다(lib/jobClosed.ts). 여기만
      // status 로만 세던 탓에 대시보드가 화면보다 많았다 — 같은 규칙으로 센다.
      `SELECT COUNT(*)::int AS cnt FROM job_postings 
       WHERE company_id = $1 AND status = 'ACTIVE'
         AND (deadline IS NULL OR deadline::date >= CURRENT_DATE)${jobTypeFilterNoAlias}`,
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

  // 마감임박 — 사흘 안에 내려가는 공고. 하루만 세면 오늘 못 본 사람은 놓친다.
  const deadlineTodayRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt
     FROM job_postings
     WHERE company_id = $1 AND status = 'ACTIVE' AND deadline IS NOT NULL
       AND deadline::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 2${jobTypeFilterNoAlias}`,
    [companyId]
  )

  // 내 차례 제안 — 구직자가 마지막으로 말했는데 매장이 아직 답하지 않은 대화.
  //
  // 끝난 것은 세지 않는다 — 거둔 제안·거절된 제안·차단된 상대. 다만 공고가 마감된
  // 건은 뺀 적이 있었는데, 면접까지 잡고 대화 중인 사람에게는 공고가 내려갔어도
  // 답해야 한다. 보낸 제안 화면의 「내 차례」 표시와 같은 기준으로 둔다 — 홈의 숫자와
  // 화면의 빨간 줄이 다르면 어느 쪽을 믿을지 알 수 없다.
  const unansweredRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt
       FROM proposals p
      WHERE p.company_id = $1
        AND p.declined_at IS NULL AND p.canceled_at IS NULL
        AND EXISTS (SELECT 1 FROM proposal_messages m WHERE m.proposal_id = p.id)
        AND (SELECT sender FROM proposal_messages m
              WHERE m.proposal_id = p.id ORDER BY m.created_at DESC LIMIT 1) = 'USER'
        AND NOT EXISTS (SELECT 1 FROM user_company_blocks b
                         WHERE b.user_id = p.user_id AND b.company_id = p.company_id)`,
    [companyId]
  )

  // 찜한 인재 — 제안하려고 담아 둔 사람. 쌓인 숫자가 아니라 아직 안 보낸 할 일이다.
  // 한 사람을 여러 공고로 담을 수 있으므로 사람 수로 센다 — 스크랩 인재 화면과 같다.
  const scrapRes = await pool.query(
    `SELECT COUNT(DISTINCT user_id)::int AS cnt FROM company_talent_scraps WHERE company_id = $1`,
    [companyId]
  )
  // 회신 대기 — 보냈는데 아직 답이 없는 제안. 예전에는 7일 안쪽만 셌는데,
  // 제안의 수명을 공고에 맡기면서 그 기준이 없어졌다. 거절·취소된 것과 공고가
  // 닫힌 것은 기다릴 일이 아니라 뺀다.
  const awaitingRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM proposals p
       LEFT JOIN job_postings jp ON jp.id = p.job_posting_id
      WHERE p.company_id = $1
        AND p.interested_at IS NULL AND p.declined_at IS NULL AND p.canceled_at IS NULL
        AND (jp.id IS NULL OR (jp.status = 'ACTIVE'
             AND (jp.deadline IS NULL OR jp.deadline::date >= CURRENT_DATE)))`,
    [companyId]
  )

  // 아직 안 본 지원자 — 「미열람 지원자」 카드 제목에 쓴다.
  const unviewedRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt
       FROM applications a JOIN job_postings jp ON jp.id = a.job_posting_id
      WHERE jp.company_id = $1 AND a.viewed_at IS NULL
        AND a.hidden_by_company = false AND a.status <> 'WITHDRAWN'${jobTypeFilter}`,
    [companyId]
  )

  // 보낸제안 — 누적. 채팅 — 지금 대화가 열려 있는 것. 「관심 있어요」를 누른 수는 따로
  // 세지 않는다 — 수락해야 매장이 말을 걸 수 있으니 채팅과 같은 사람들이다.
  // 채팅의 뜻은 채용제안 화면과 한 곳(채팅열림SQL)에서 가져온다.
  const sentRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM proposals WHERE company_id = $1`,
    [companyId]
  )
  const chatRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM proposals p
      WHERE p.company_id = $1 AND (${채팅열림SQL})`,
    [companyId]
  )

  return ok({
    unviewed_applications: unviewedRes.rows[0].cnt,
    sent_proposals: sentRes.rows[0].cnt,
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
