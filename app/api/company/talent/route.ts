export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

// 인재 목록 조회
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'company')
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')?.trim() || null
  const jobGroup = searchParams.get('jobGroup')
  const careerFilter = searchParams.get('careerFilter') || '전체'
  const ageGroup = searchParams.get('ageGroup') || '전체'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  const params: any[] = [auth!.sub] // $1 = company_id
  let idx = 2

  // 직군 필터
  let jobGroupClause = ''
  if (jobGroup && jobGroup !== '전체') {
    jobGroupClause = `AND up.main_job_group = $${idx++}`
    params.push(jobGroup)
  }

  // 검색 (이름 / 한줄소개 / 스킬)
  let searchClause = ''
  if (search) {
    searchClause = `AND (
      u.name ILIKE $${idx} OR up.intro ILIKE $${idx}
      OR EXISTS(SELECT 1 FROM unnest(up.skills) s WHERE s ILIKE $${idx})
    )`
    params.push(`%${search}%`)
    idx++
  }

  // 경력 필터 (CTE 밖, career_years 기준 — 파라미터 없음)
  let careerClause = ''
  if (careerFilter === '신입') {
    careerClause = 'AND (career_years IS NULL OR career_years = 0)'
  } else if (careerFilter === '1-3년') {
    careerClause = 'AND career_years BETWEEN 1 AND 3'
  } else if (careerFilter === '3-5년') {
    careerClause = 'AND career_years BETWEEN 3 AND 5'
  } else if (careerFilter === '5년+') {
    careerClause = 'AND career_years >= 5'
  }

  // 연령대 필터 (CTE 밖, age 기준 — 파라미터 없음)
  let ageClause = ''
  if (ageGroup === '10대') {
    ageClause = 'AND age BETWEEN 10 AND 19'
  } else if (ageGroup === '20대') {
    ageClause = 'AND age BETWEEN 20 AND 29'
  } else if (ageGroup === '30대') {
    ageClause = 'AND age BETWEEN 30 AND 39'
  } else if (ageGroup === '40대+') {
    ageClause = 'AND age >= 40'
  }

  const listQuery = `
    WITH talent AS (
      SELECT
        u.id,
        u.name,
        u.created_at,
        CASE WHEN u.birth_date IS NOT NULL
          THEN EXTRACT(YEAR FROM AGE(u.birth_date))::int
          ELSE NULL END AS age,
        up.intro,
        up.main_job_group,
        up.sub_job,
        up.skills,
        up.skill_areas,
        up.office_job_areas,
        up.region_prefer,
        up.work_type_prefer,
        (
          SELECT CASE
            WHEN MIN(start_date) ~ '^[0-9]{4}'
            THEN GREATEST(EXTRACT(YEAR FROM NOW())::int - LEFT(MIN(start_date), 4)::int, 0)
            ELSE NULL
          END
          FROM user_careers WHERE user_id = u.id
        ) AS career_years,
        (SELECT COUNT(*)::int FROM user_careers WHERE user_id = u.id) AS career_count,
        (
          SELECT school || CASE WHEN status IS NOT NULL AND status <> '' THEN ' ' || status ELSE '' END
          FROM user_educations
          WHERE user_id = u.id
          ORDER BY created_at DESC LIMIT 1
        ) AS education,
        EXISTS(
          SELECT 1 FROM company_talent_scraps
          WHERE company_id = $1 AND user_id = u.id
        ) AS scrapped
      FROM users u
      JOIN user_profiles up ON up.user_id = u.id
      WHERE u.status = 'ACTIVE'
      ${jobGroupClause}
      ${searchClause}
    )
    SELECT *, COUNT(*) OVER()::int AS total_count
    FROM talent
    WHERE 1=1 ${careerClause} ${ageClause}
    ORDER BY created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `
  params.push(limit, offset)

  try {
    const { rows } = await pool.query(listQuery, params)
    const total = rows.length > 0 ? rows[0].total_count : 0
    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      age: r.age,
      intro: r.intro,
      mainJobGroup: r.main_job_group,
      subJob: r.sub_job,
      skills: r.skills || [],
      skillAreas: r.skill_areas || [],
      officeJobAreas: r.office_job_areas || [],
      regionPrefer: r.region_prefer,
      workTypePrefer: r.work_type_prefer,
      careerYears: r.career_years,
      careerCount: r.career_count,
      education: r.education,
      scrapped: r.scrapped,
    }))
    return ok(data, 200, { total, page, limit })
  } catch (e: any) {
    console.error('[talent GET]', e)
    return err('TALENT_001', '인재 목록 조회 실패: ' + e.message, 500)
  }
}