export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, requireAuth } from '@/lib/api'
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  // 추이 기간 파라미터: 7d(기본) | 1m
  const rangeParam = new URL(req.url).searchParams.get('range')
  const range = rangeParam === '1m' ? '1m' : rangeParam === '3m' ? '3m' : '7d'
  const trendCfg =
    range === '3m'
      ? { start: "date_trunc('week', now()) - interval '12 week'", step: "interval '1 week'", trunc: 'week' }
    : range === '1m'
      ? { start: "date_trunc('week', now()) - interval '3 week'", step: "interval '1 week'", trunc: 'week' }
      : { start: "now()::date - interval '6 day'", step: "interval '1 day'", trunc: 'day' }

  const client = await pool.connect()
  try {
    // 핵심 카운트
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM users WHERE job_type = 'OFFICE') AS office_users,
        (SELECT COUNT(*) FROM users WHERE job_type = 'STORE') AS store_users,
        (SELECT COUNT(*) FROM users WHERE created_at::date = now()::date) AS today_users,
        (SELECT COUNT(*) FROM users WHERE created_at::date = now()::date AND job_type = 'OFFICE') AS today_users_office,
        (SELECT COUNT(*) FROM users WHERE created_at::date = now()::date AND job_type = 'STORE') AS today_users_store,
        (SELECT COUNT(*) FROM resumes r JOIN users u ON u.id = r.user_id WHERE r.status = 'PUBLISHED' AND u.job_type = 'OFFICE') AS published_resumes_office,
        (SELECT COUNT(*) FROM resumes r JOIN users u ON u.id = r.user_id WHERE r.status = 'PUBLISHED' AND u.job_type = 'STORE') AS published_resumes_store,
        (SELECT COUNT(*) FROM applications a JOIN job_postings jp ON jp.id = a.job_posting_id WHERE a.applied_at::date = now()::date AND jp.job_type = 'OFFICE') AS today_applications_office,
        (SELECT COUNT(*) FROM applications a JOIN job_postings jp ON jp.id = a.job_posting_id WHERE a.applied_at::date = now()::date AND jp.job_type = 'STORE') AS today_applications_store,
        (SELECT COUNT(*) FROM companies) AS total_companies,
        (SELECT COUNT(*) FROM companies WHERE company_type = 'STORE') AS store_companies,
        (SELECT COUNT(*) FROM companies WHERE company_type = 'OFFICE') AS office_companies,
        (SELECT COUNT(*) FROM companies WHERE company_type = 'BOTH') AS both_companies,
        (SELECT COUNT(*) FROM companies WHERE created_at::date = now()::date) AS today_companies,
        (SELECT COUNT(*) FROM companies WHERE created_at::date = now()::date AND company_type = 'STORE') AS today_companies_store,
        (SELECT COUNT(*) FROM companies WHERE created_at::date = now()::date AND company_type = 'OFFICE') AS today_companies_office,
        (SELECT COUNT(*) FROM companies WHERE created_at::date = now()::date AND company_type = 'BOTH') AS today_companies_both,
        (SELECT COUNT(*) FROM companies WHERE status = 'PENDING') AS pending_companies,
        (SELECT COUNT(*) FROM job_postings WHERE status = 'ACTIVE' AND (deadline IS NULL OR deadline >= CURRENT_DATE)) AS active_jobs,
        (SELECT COUNT(*) FROM job_postings WHERE status = 'ACTIVE' AND job_type = 'STORE' AND (deadline IS NULL OR deadline >= CURRENT_DATE)) AS active_jobs_store,
        (SELECT COUNT(*) FROM job_postings WHERE status = 'ACTIVE' AND job_type = 'OFFICE' AND (deadline IS NULL OR deadline >= CURRENT_DATE)) AS active_jobs_office,
        (SELECT COUNT(*) FROM job_postings jp JOIN companies c2 ON c2.id = jp.company_id WHERE jp.status = 'ACTIVE' AND c2.company_type = 'BOTH' AND (jp.deadline IS NULL OR jp.deadline >= CURRENT_DATE)) AS active_jobs_both,
        (SELECT COUNT(*) FROM job_postings WHERE job_type = 'OFFICE' AND status = 'ACTIVE' AND (deadline IS NULL OR deadline >= CURRENT_DATE)) AS office_jobs,
        (SELECT COUNT(*) FROM job_postings WHERE job_type = 'STORE' AND status = 'ACTIVE' AND (deadline IS NULL OR deadline >= CURRENT_DATE)) AS store_jobs,
        (SELECT COUNT(*) FROM applications WHERE applied_at::date = now()::date) AS today_applications,
        (SELECT COUNT(*) FROM job_postings WHERE created_at::date = now()::date) AS today_jobs,
        (SELECT COUNT(*) FROM job_postings WHERE created_at::date = now()::date AND job_type = 'STORE') AS today_jobs_store,
        (SELECT COUNT(*) FROM job_postings WHERE created_at::date = now()::date AND job_type = 'OFFICE') AS today_jobs_office,
        (SELECT COUNT(*) FROM applications) AS total_applications,
        (SELECT COUNT(*) FROM resumes WHERE status = 'PUBLISHED') AS published_resumes,
        (SELECT COUNT(*) FROM resumes) AS total_resumes,
        (SELECT COUNT(*) FROM resumes r JOIN users u ON u.id = r.user_id WHERE u.job_type = 'STORE') AS total_resumes_store,
        (SELECT COUNT(*) FROM resumes r JOIN users u ON u.id = r.user_id WHERE u.job_type = 'OFFICE') AS total_resumes_office,
        (SELECT COUNT(*) FROM resumes WHERE is_public = true) AS public_resumes,
        (SELECT COUNT(*) FROM resumes r JOIN users u ON u.id = r.user_id WHERE r.is_public = true AND u.job_type = 'STORE') AS public_resumes_store,
        (SELECT COUNT(*) FROM resumes r JOIN users u ON u.id = r.user_id WHERE r.is_public = true AND u.job_type = 'OFFICE') AS public_resumes_office,
        (SELECT COUNT(DISTINCT user_id) FROM resumes) AS users_with_resume,
        (SELECT COUNT(DISTINCT r.user_id) FROM resumes r JOIN users u ON u.id = r.user_id WHERE u.job_type = 'STORE') AS users_with_resume_store,
        (SELECT COUNT(DISTINCT r.user_id) FROM resumes r JOIN users u ON u.id = r.user_id WHERE u.job_type = 'OFFICE') AS users_with_resume_office,
        (SELECT ROUND(AVG(cnt), 1) FROM (
          SELECT COUNT(*) AS cnt FROM applications GROUP BY job_posting_id
        ) t) AS avg_applications_per_job
    `)

    

    // 최근 7일 개인/기업 가입 추이 (개인은 job_type별 분리)
    const signupTrend = await client.query(`
      SELECT d::date AS day,
        (SELECT COUNT(*) FROM users WHERE date_trunc('${trendCfg.trunc}', created_at) = d) AS users,
        (SELECT COUNT(*) FROM users WHERE date_trunc('${trendCfg.trunc}', created_at) = d AND job_type = 'STORE') AS users_store,
        (SELECT COUNT(*) FROM users WHERE date_trunc('${trendCfg.trunc}', created_at) = d AND job_type = 'OFFICE') AS users_office,
        (SELECT COUNT(*) FROM companies WHERE date_trunc('${trendCfg.trunc}', created_at) = d) AS companies,
        (SELECT COUNT(*) FROM companies WHERE date_trunc('${trendCfg.trunc}', created_at) = d AND company_type = 'STORE') AS companies_store,
        (SELECT COUNT(*) FROM companies WHERE date_trunc('${trendCfg.trunc}', created_at) = d AND company_type = 'OFFICE') AS companies_office,
        (SELECT COUNT(*) FROM companies WHERE date_trunc('${trendCfg.trunc}', created_at) = d AND company_type = 'BOTH') AS companies_both
      FROM generate_series(${trendCfg.start}, date_trunc('${trendCfg.trunc}', now()), ${trendCfg.step}) d
      ORDER BY day
    `)

    // 최근 7일 지원 추이
    const applyTrend = await client.query(`
      SELECT d::date AS day,
        (SELECT COUNT(*) FROM applications WHERE date_trunc('${trendCfg.trunc}', applied_at) = d) AS count
      FROM generate_series(${trendCfg.start}, date_trunc('${trendCfg.trunc}', now()), ${trendCfg.step}) d
      ORDER BY day
    `)
    // 지원 상태별 분포
    const appStatusDist = await client.query(`
      SELECT name, value, sort_order FROM (
        SELECT
          CASE status
            WHEN 'APPLIED' THEN '지원완료'
            WHEN 'VIEWED' THEN '열람됨'
            WHEN 'INTERVIEW' THEN '면접예정'
            WHEN 'PASSED' THEN '합격'
            WHEN 'REJECTED' THEN '불합격'
            WHEN 'WITHDRAWN' THEN '지원취소'
            ELSE status::text
          END AS name,
          COUNT(*)::int AS value,
          CASE status
            WHEN 'APPLIED' THEN 1
            WHEN 'VIEWED' THEN 2
            WHEN 'INTERVIEW' THEN 3
            WHEN 'PASSED' THEN 4
            WHEN 'REJECTED' THEN 5
            WHEN 'WITHDRAWN' THEN 6
            ELSE 9
          END AS sort_order
        FROM applications
        GROUP BY status
      ) t
      ORDER BY sort_order
    `)
    // 직군별 공고 분포 (매장/사무 분리)
    const jobDistStore = await client.query(`
      SELECT cat AS name, COUNT(*)::int AS value
      FROM job_postings jp, unnest(jp.categories) AS cat
      WHERE jp.status = 'ACTIVE' AND jp.job_type = 'STORE'
      GROUP BY cat ORDER BY value DESC
    `)
    const jobDistOffice = await client.query(`
      SELECT cat AS name, COUNT(*)::int AS value
      FROM job_postings jp, unnest(jp.categories) AS cat
      WHERE jp.status = 'ACTIVE' AND jp.job_type = 'OFFICE'
      GROUP BY cat ORDER BY value DESC
    `)
    // 직군별 입사지원 분포 (지원 공고의 직군 집계, job_type별)
    const appDistStore = await client.query(`
      SELECT cat AS name, COUNT(*)::int AS value
      FROM applications a
      JOIN job_postings jp ON jp.id = a.job_posting_id, unnest(jp.categories) AS cat
      WHERE jp.job_type = 'STORE'
      GROUP BY cat ORDER BY value DESC
    `)
    const appDistOffice = await client.query(`
      SELECT cat AS name, COUNT(*)::int AS value
      FROM applications a
      JOIN job_postings jp ON jp.id = a.job_posting_id, unnest(jp.categories) AS cat
      WHERE jp.job_type = 'OFFICE'
      GROUP BY cat ORDER BY value DESC
    `)
    const appDistAll = await client.query(`
      SELECT cat AS name, COUNT(*)::int AS value
      FROM applications a
      JOIN job_postings jp ON jp.id = a.job_posting_id, unnest(jp.categories) AS cat
      GROUP BY cat ORDER BY value DESC
    `)
    // 일별 공고 등록 수 (최근 7일, company_type별)
    const jobTrend = await client.query(`
      SELECT d::date AS day,
        (SELECT COUNT(*) FROM job_postings WHERE date_trunc('${trendCfg.trunc}', created_at) = d) AS total,
        (SELECT COUNT(*) FROM job_postings WHERE date_trunc('${trendCfg.trunc}', created_at) = d AND job_type = 'STORE') AS store,
        (SELECT COUNT(*) FROM job_postings WHERE date_trunc('${trendCfg.trunc}', created_at) = d AND job_type = 'OFFICE') AS office,
        (SELECT COUNT(*) FROM job_postings jp JOIN companies c2 ON c2.id = jp.company_id WHERE date_trunc('${trendCfg.trunc}', jp.created_at) = d AND c2.company_type = 'BOTH') AS both
      FROM generate_series(${trendCfg.start}, date_trunc('${trendCfg.trunc}', now()), ${trendCfg.step}) d
      ORDER BY day
    `)
    // 직군별 채용공고 분포 — BOTH(매장+기업 회사가 올린 공고)
    const jobDistBoth = await client.query(`
      SELECT cat AS name, COUNT(*)::int AS value
      FROM job_postings jp
      JOIN companies c2 ON c2.id = jp.company_id, unnest(jp.categories) AS cat
      WHERE jp.status = 'ACTIVE' AND c2.company_type = 'BOTH'
      GROUP BY cat ORDER BY value DESC
    `)
    const jobDistAll = await client.query(`
      SELECT cat AS name, COUNT(*)::int AS value
      FROM job_postings jp, unnest(jp.categories) AS cat
      WHERE jp.status = 'ACTIVE'
      GROUP BY cat ORDER BY value DESC
    `)
    // 직군별 회원 분포 (매장/사무 분리)
    const userDistStore = await client.query(`
      SELECT area AS name, COUNT(*)::int AS value
      FROM users u, unnest(u.office_job_areas) AS area
      WHERE u.job_type = 'STORE'
      GROUP BY area ORDER BY value DESC
    `)
    const userDistOffice = await client.query(`
      SELECT area AS name, COUNT(*)::int AS value
      FROM users u, unnest(u.office_job_areas) AS area
      WHERE u.job_type = 'OFFICE'
      GROUP BY area ORDER BY value DESC
    `)

    // 나이대 × 성별 교차 분포 (누적 막대용) — job_type 필터별 3벌
    const demographicsQuery = (jobTypeFilter: string) => `
      SELECT
        age_group AS name,
        COUNT(*) FILTER (WHERE gender_norm = '남성')::int AS "남성",
        COUNT(*) FILTER (WHERE gender_norm = '여성')::int AS "여성",
        COUNT(*) FILTER (WHERE gender_norm = '미입력')::int AS "미입력",
        MIN(age_order) AS sort_order
      FROM (
        SELECT
          CASE
            WHEN gender IN ('남성', 'MALE', 'M', 'male') THEN '남성'
            WHEN gender IN ('여성', 'FEMALE', 'F', 'female') THEN '여성'
            ELSE '미입력'
          END AS gender_norm,
          CASE
            WHEN birth_date IS NULL THEN '미입력'
            WHEN (EXTRACT(YEAR FROM age(birth_date))::int) < 20 THEN '10대'
            WHEN (EXTRACT(YEAR FROM age(birth_date))::int) < 30 THEN '20대'
            WHEN (EXTRACT(YEAR FROM age(birth_date))::int) < 40 THEN '30대'
            WHEN (EXTRACT(YEAR FROM age(birth_date))::int) < 50 THEN '40대'
            ELSE '50대+'
          END AS age_group,
          CASE
            WHEN birth_date IS NULL THEN 999
            WHEN (EXTRACT(YEAR FROM age(birth_date))::int) < 20 THEN 1
            WHEN (EXTRACT(YEAR FROM age(birth_date))::int) < 30 THEN 2
            WHEN (EXTRACT(YEAR FROM age(birth_date))::int) < 40 THEN 3
            WHEN (EXTRACT(YEAR FROM age(birth_date))::int) < 50 THEN 4
            ELSE 5
          END AS age_order
        FROM users
        ${jobTypeFilter}
      ) t
      GROUP BY age_group
      ORDER BY sort_order
    `
    const demographicsAll = await client.query(demographicsQuery(""))
    const demographicsStore = await client.query(demographicsQuery("WHERE job_type = 'STORE'"))
    const demographicsOffice = await client.query(demographicsQuery("WHERE job_type = 'OFFICE'"))

    // 기업 규모별 분포 (company_type 필터별) — 막대 차트용
    const companySizeQuery = (typeFilter: string) => `
      SELECT label AS name, COUNT(c.id)::int AS value, ord AS sort_order
      FROM (VALUES
        ('1~10명', 1), ('10~50명', 2), ('50~100명', 3),
        ('100~300명', 4), ('300~1000명', 5), ('1000명 이상', 6)
      ) AS s(label, ord)
      LEFT JOIN companies c
        ON c.company_size = s.label
        ${typeFilter ? `AND ${typeFilter}` : ""}
      GROUP BY label, ord
      ORDER BY ord
    `
    const companySizeAll = await client.query(companySizeQuery(""))
    const companySizeStore = await client.query(companySizeQuery("c.company_type = 'STORE'"))
    const companySizeOffice = await client.query(companySizeQuery("c.company_type = 'OFFICE'"))
    const companySizeBoth = await client.query(companySizeQuery("c.company_type = 'BOTH'"))

    return ok({
      counts: counts.rows[0],
      job_dist_store: jobDistStore.rows,
      job_dist_office: jobDistOffice.rows,
      job_dist_both: jobDistBoth.rows,
      job_dist_all: jobDistAll.rows,
      app_dist_store: appDistStore.rows,
      app_dist_office: appDistOffice.rows,
      app_dist_all: appDistAll.rows,
      job_trend: jobTrend.rows,
      user_dist_store: userDistStore.rows,
      user_dist_office: userDistOffice.rows,
      
      range,
      signup_trend: signupTrend.rows,
      apply_trend: applyTrend.rows,
      app_status_dist: appStatusDist.rows,
      demographics_all: demographicsAll.rows,
      demographics_store: demographicsStore.rows,
      demographics_office: demographicsOffice.rows,
      company_size_all: companySizeAll.rows,
      company_size_store: companySizeStore.rows,
      company_size_office: companySizeOffice.rows,
      company_size_both: companySizeBoth.rows,
    })
  } finally {
    client.release()
  }
}