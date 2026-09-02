export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, requireAuth } from '@/lib/api'

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'company')
  if (authErr) return authErr

  const companyId = auth!.sub
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('job_id')
  const status = searchParams.get('status')

  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = (page - 1) * limit

  const where: string[] = ['jp.company_id = $1', 'a.hidden_by_company = false', "a.status <> 'WITHDRAWN'"]
  // 공고가 지원자의 축이라 마감 여부로 목록을 가르지 않는다 — 사이드의 공고 목록에서
  // 「마감」으로 드러나고, 공고를 고르면 그 지원자만 보인다.
  // 다만 채용이 끝난 뒤에도 남의 이력서를 계속 들여다볼 수 있으면 안 된다. 마감한
  // 공고는 90일까지만 연다 — 사람인·잡코리아가 나란히 쓰는 기간이고, 뽑았다가 금방
  // 그만두는 경우(수습 전후)가 그 안에 든다. 마감일이 없이 내린 공고는 내린 때 기준.
  const 지난공고 = "(jp.status = 'CLOSED' OR (jp.deadline IS NOT NULL AND jp.deadline < CURRENT_DATE))"
  const 마감날 = "COALESCE(jp.deadline, jp.closed_at::date, jp.updated_at::date)"
  where.push(`(NOT ${지난공고} OR ${마감날} >= CURRENT_DATE - INTERVAL '90 days')`)
  const params: any[] = [companyId]
  let idx = 2

  if (jobId) {
    where.push(`a.job_posting_id = $${idx++}`)
    params.push(jobId)
  }
  if (status) {
    where.push(`a.status = $${idx++}`)
    params.push(status)
  }

  const whereClause = where.join(' AND ')

  const result = await pool.query(
    `SELECT
       a.id, a.status, a.applied_at, a.viewed_at, a.cover_letter, a.note, a.status_updated_at,
       COALESCE(a.resume_id, (SELECT r.id FROM resumes r WHERE r.user_id = u.id ORDER BY r.updated_at DESC LIMIT 1)) AS resume_id,
       u.id AS user_id,
       u.name AS user_name,
       u.email AS user_email,
       u.phone AS user_phone,
       u.gender AS user_gender,
       u.birth_date AS user_birth_date,
       u.job_type AS user_job_type,
       u.avatar_url AS user_avatar_url,
       u.region_sido AS user_region_sido,
       u.region_sigungu AS user_region_sigungu,
       u.portfolio_images,
       -- 인재 카드와 같은 얼굴을 쓴다 — 맨 윗줄은 본인이 고른 한 마디고,
       -- 아랫줄은 사람을 거르는 태그다(직군·고용형태).
       up.intro AS user_intro,
       up.main_job_group AS user_main_job_group,
       up.sub_job AS user_sub_job,
       up.work_type_prefer AS user_work_type_prefer,
        (
          SELECT ul.url FROM user_links ul
          WHERE ul.user_id = u.id AND COALESCE(ul.url, '') <> ''
          ORDER BY (ul.url ILIKE '%instagram%') DESC, ul.created_at
          LIMIT 1
        ) AS sns_url,
       (SELECT r.career_type FROM resumes r WHERE r.user_id = u.id ORDER BY r.updated_at DESC LIMIT 1) AS career_type,
       (SELECT rc.start_date FROM resume_careers rc
          JOIN resumes r ON r.id = rc.resume_id
          WHERE r.user_id = u.id
          ORDER BY rc.is_current DESC, rc.start_date DESC LIMIT 1) AS recent_start_date,
       EXISTS(SELECT 1 FROM company_talent_scraps s WHERE s.company_id = $1 AND s.user_id = u.id) AS scrapped,
       -- 이 사람이 스스로 온 사람인지, 내가 먼저 제안해서 온 사람인지. 같은 공고로
       -- 보낸 제안이 있으면 내가 찾아간 사람이고, 대화까지 수락했으면 얘기를 나누고
       -- 온 것이다. 지원서를 읽는 눈이 달라진다.
       (SELECT MIN(pr.created_at) FROM proposals pr
         WHERE pr.company_id = $1 AND pr.user_id = u.id AND pr.job_posting_id = a.job_posting_id) AS proposed_at,
       (SELECT MIN(pr.interested_at) FROM proposals pr
         WHERE pr.company_id = $1 AND pr.user_id = u.id AND pr.job_posting_id = a.job_posting_id
           AND pr.interested_at IS NOT NULL) AS proposal_interested_at,
       jp.id AS job_id, jp.title AS job_title,
       jp.experience_level, jp.status AS job_status, jp.deadline AS job_deadline
     FROM applications a
     JOIN job_postings jp ON jp.id = a.job_posting_id
     JOIN users u ON u.id = a.user_id
     LEFT JOIN user_profiles up ON up.user_id = u.id
     WHERE ${whereClause}
     ORDER BY a.applied_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  )

  return ok(result.rows)
}
