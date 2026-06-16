export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  try {
    const { rows } = await pool.query(
      `SELECT
        u.id AS user_id,
        u.name,
        u.avatar_url,
        u.gender,
        u.phone,
        u.job_type,
        CASE WHEN u.birth_date IS NOT NULL
          THEN EXTRACT(YEAR FROM AGE(u.birth_date))::int
          ELSE NULL END AS age,
        up.intro,
        up.main_job_group,
        up.sub_job,
        up.skills,
        up.region_prefer AS location,
        (
          SELECT CASE
            WHEN MIN(start_date) ~ '^[0-9]{4}'
            THEN GREATEST(EXTRACT(YEAR FROM NOW())::int - LEFT(MIN(start_date), 4)::int, 0)
            ELSE NULL
          END
          FROM user_careers WHERE user_id = u.id
        ) AS career_years,
        (SELECT COUNT(*)::int FROM user_careers WHERE user_id = u.id) AS career_count,
        s.created_at AS scrapped_at
      FROM company_talent_scraps s
      JOIN users u ON u.id = s.user_id
      JOIN user_profiles up ON up.user_id = u.id
      WHERE s.company_id = $1
      ORDER BY s.created_at DESC`,
      [auth!.sub]
    );

    const talents = rows.map((r) => ({
      user_id: r.user_id,
      name: r.name,
      avatar_url: r.avatar_url,
      gender: r.gender,
      phone: r.phone,
      job_type: r.job_type,
      age: r.age,
      headline: r.intro,
      job_category: r.main_job_group,
      skills: r.skills || [],
      location: r.location,
      career_years: r.career_years,
      career_count: r.career_count,
      scrapped_at: r.scrapped_at,
      scrapped: true,
    }));

    return ok({ talents });
  } catch (e: any) {
    console.error("[talent scrapped GET]", e);
    return err("TALENT_005", "스크랩 목록 조회 실패: " + e.message, 500);
  }
}
