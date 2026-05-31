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
        (SELECT COUNT(*) FROM resumes WHERE status = 'PUBLISHED') AS published_resumes
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

    // 직군별 공고 분포
    const jobDist = await client.query(`
      SELECT jc.name, COUNT(*) AS value
      FROM job_postings jp
      JOIN job_categories jc ON jc.id = jp.job_category_id
      WHERE jp.status = 'ACTIVE'
      GROUP BY jc.name
      ORDER BY value DESC
    `)

    return ok({
      counts: counts.rows[0],
      recent_users: recentUsers.rows,
      recent_companies: recentCompanies.rows,
      recent_jobs: recentJobs.rows,
      signup_trend: signupTrend.rows,
      apply_trend: applyTrend.rows,
      job_dist: jobDist.rows,
    })
  } finally {
    client.release()
  }
}