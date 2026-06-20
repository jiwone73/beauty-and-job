export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, requireAuth } from '@/lib/api'

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const client = await pool.connect()
  try {
    // 핵심 카운트
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM users WHERE job_type = 'OFFICE') AS office_users,
        (SELECT COUNT(*) FROM users WHERE job_type = 'STORE') AS store_users,
        (SELECT COUNT(*) FROM users WHERE created_at::date = now()::date) AS today_users,
        (SELECT COUNT(*) FROM companies) AS total_companies,
        (SELECT COUNT(*) FROM companies WHERE created_at::date = now()::date) AS today_companies,
        (SELECT COUNT(*) FROM companies WHERE status = 'PENDING') AS pending_companies,
        (SELECT COUNT(*) FROM job_postings WHERE status = 'ACTIVE') AS active_jobs,
        (SELECT COUNT(*) FROM job_postings WHERE job_type = 'OFFICE' AND status = 'ACTIVE') AS office_jobs,
        (SELECT COUNT(*) FROM job_postings WHERE job_type = 'STORE' AND status = 'ACTIVE') AS store_jobs,
        (SELECT COUNT(*) FROM applications WHERE applied_at::date = now()::date) AS today_applications,
        (SELECT COUNT(*) FROM applications) AS total_applications,
        (SELECT COUNT(*) FROM resumes WHERE status = 'PUBLISHED') AS published_resumes,
        (SELECT COUNT(*) FROM resumes) AS total_resumes,
        (SELECT COUNT(*) FROM resumes WHERE is_public = true) AS public_resumes,
        (SELECT COUNT(DISTINCT user_id) FROM resumes) AS users_with_resume,
        (SELECT ROUND(AVG(cnt), 1) FROM (
          SELECT COUNT(*) AS cnt FROM applications GROUP BY job_posting_id
        ) t) AS avg_applications_per_job
    `)

    // 최근 가입 개인회원
    const recentUsers = await client.query(`
      SELECT name, job_type, created_at
      FROM users ORDER BY created_at DESC LIMIT 5
    `)

    // 최근 가입 기업회원
    const recentCompanies = await client.query(`
      SELECT company_name, company_type, created_at,
        (SELECT COUNT(*) FROM job_postings WHERE company_id = companies.id) AS job_count
      FROM companies ORDER BY created_at DESC LIMIT 5
    `)

    // 최근 공고
    const recentJobs = await client.query(`
      SELECT jp.title, jp.job_type, jp.status, jp.created_at, c.company_name
      FROM job_postings jp
      JOIN companies c ON c.id = jp.company_id
      ORDER BY jp.created_at DESC LIMIT 5
    `)

    // 최근 7일 개인/기업 가입 추이
    const signupTrend = await client.query(`
      SELECT d::date AS day,
        (SELECT COUNT(*) FROM users WHERE created_at::date = d::date) AS users,
        (SELECT COUNT(*) FROM companies WHERE created_at::date = d::date) AS companies
      FROM generate_series(now()::date - interval '6 day', now()::date, interval '1 day') d
      ORDER BY day
    `)

    // 최근 7일 지원 추이
    const applyTrend = await client.query(`
      SELECT d::date AS day,
        (SELECT COUNT(*) FROM applications WHERE applied_at::date = d::date) AS count
      FROM generate_series(now()::date - interval '6 day', now()::date, interval '1 day') d
      ORDER BY day
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

    // // 나이대 × 성별 교차 분포 (누적 막대용)
    const demographics = await client.query(`
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
      ) t
      GROUP BY age_group
      ORDER BY sort_order
    `)

    return ok({
      counts: counts.rows[0],
      job_dist_store: jobDistStore.rows,
      job_dist_office: jobDistOffice.rows,
      user_dist_store: userDistStore.rows,
      user_dist_office: userDistOffice.rows,
      recent_users: recentUsers.rows,
      recent_companies: recentCompanies.rows,
      recent_jobs: recentJobs.rows,
      signup_trend: signupTrend.rows,
      apply_trend: applyTrend.rows,
      demographics: demographics.rows,
    })
  } finally {
    client.release()
  }
}