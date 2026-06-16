export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const jobType     = searchParams.get("jobType") || "OFFICE";   // OFFICE | STORE
  const search      = searchParams.get("search")?.trim() || null;
  const jobGroups   = searchParams.get("jobGroups") || null;      // 쉼표 구분
  const careerFilter = searchParams.get("careerFilter") || "전체";
  const regions     = searchParams.get("regions") || null;        // 쉼표 구분 (매장직)
  const ageGroup    = searchParams.get("ageGroup") || null;       // 매장직
  const gender      = searchParams.get("gender") || null;         // 매장직
  const page        = parseInt(searchParams.get("page") || "1");
  const limit       = parseInt(searchParams.get("limit") || "50");
  const offset      = (page - 1) * limit;

  const params: any[] = [auth!.sub]; // $1 = company_id
  let idx = 2;

  // job_type
  const jobTypeClause = `AND u.job_type = $${idx++}`;
  params.push(jobType);

  // 직군 (다중 IN)
  let jobGroupClause = "";
  if (jobGroups) {
    const groups = jobGroups.split(",").map((g) => g.trim()).filter(Boolean);
    if (groups.length > 0) {
      const ph = groups.map(() => `$${idx++}`).join(", ");
      jobGroupClause = `AND up.main_job_group IN (${ph})`;
      params.push(...groups);
    }
  }

  // 키워드 (이름 / 포지션 / 스킬)
  let searchClause = "";
  if (search) {
    searchClause = `AND (
      u.name ILIKE $${idx}
      OR EXISTS (
        SELECT 1 FROM user_careers uc
        WHERE uc.user_id = u.id AND uc.position ILIKE $${idx}
      )
      OR EXISTS (SELECT 1 FROM unnest(up.skills) s WHERE s ILIKE $${idx})
    )`;
    params.push(`%${search}%`);
    idx++;
  }

  // 지역 (매장직, 다중 OR)
  let regionClause = "";
  if (regions) {
    const list = regions.split(",").map((r) => r.trim()).filter(Boolean);
    if (list.length > 0) {
      const conds = list.map(() => `up.region_prefer ILIKE $${idx++}`).join(" OR ");
      regionClause = `AND (${conds})`;
      params.push(...list.map((r) => `%${r}%`));
    }
  }

  // 성별 (매장직)
  let genderClause = "";
  if (gender && gender !== "무관") {
    genderClause = `AND u.gender = $${idx++}`;
    params.push(gender);
  }

  // 경력 (CTE 이후)
  let careerClause = "";
  if (careerFilter === "신입")  careerClause = "AND (career_years IS NULL OR career_years = 0)";
  else if (careerFilter === "1-3년") careerClause = "AND career_years BETWEEN 1 AND 3";
  else if (careerFilter === "3-5년") careerClause = "AND career_years BETWEEN 3 AND 5";
  else if (careerFilter === "5년+")  careerClause = "AND career_years >= 5";

  // 연령 (CTE 이후, 매장직)
  let ageClause = "";
  if (ageGroup === "20대")  ageClause = "AND age BETWEEN 20 AND 29";
  else if (ageGroup === "30대") ageClause = "AND age BETWEEN 30 AND 39";
  else if (ageGroup === "40+")  ageClause = "AND age >= 40";

  const query = `
    WITH talent AS (
      SELECT
        u.id,
        u.name,
        u.avatar_url,
        u.created_at,
        u.gender,
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
            THEN GREATEST(EXTRACT(YEAR FROM NOW())::int - LEFT(MIN(start_date),4)::int, 0)
            ELSE NULL END
          FROM user_careers WHERE user_id = u.id
        ) AS career_years,
        (SELECT COUNT(*)::int FROM user_careers WHERE user_id = u.id) AS career_count,
        (
          SELECT school || CASE WHEN status IS NOT NULL AND status <> '' THEN ' ' || status ELSE '' END
          FROM user_educations WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
        ) AS education,
        EXISTS(
          SELECT 1 FROM company_talent_scraps WHERE company_id = $1 AND user_id = u.id
        ) AS scrapped
      FROM users u
      JOIN user_profiles up ON up.user_id = u.id
      WHERE u.status = 'ACTIVE'
        ${jobTypeClause}
        ${jobGroupClause}
        ${searchClause}
        ${regionClause}
        ${genderClause}
    )
    SELECT *, COUNT(*) OVER()::int AS total_count
    FROM talent
    WHERE 1=1 ${careerClause} ${ageClause}
    ORDER BY created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `;
  params.push(limit, offset);

  try {
    const { rows } = await pool.query(query, params);
    const total = rows[0]?.total_count ?? 0;
    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      avatarUrl: r.avatar_url,
      gender: r.gender,
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
    }));
    return ok(data, 200, { total, page, limit });
  } catch (e: any) {
    console.error("[talent GET]", e);
    return err("TALENT_001", "인재 목록 조회 실패: " + e.message, 500);
  }
}