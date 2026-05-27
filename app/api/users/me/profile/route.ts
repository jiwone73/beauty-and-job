export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// ============================================
// GET: 사용자 프로필 전체 조회
// ============================================
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  const userId = auth!.sub;

  // 모든 데이터를 병렬로 가져오기
  const [profile, careers, educations, experiences, languages, links] = await Promise.all([
    pool.query(`SELECT * FROM user_profiles WHERE user_id = $1`, [userId]),
    pool.query(`SELECT * FROM user_careers WHERE user_id = $1 ORDER BY start_date DESC`, [userId]),
    pool.query(`SELECT * FROM user_educations WHERE user_id = $1 ORDER BY start_date DESC`, [userId]),
    pool.query(`SELECT * FROM user_experiences WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
    pool.query(`SELECT * FROM user_languages WHERE user_id = $1 ORDER BY created_at`, [userId]),
    pool.query(`SELECT * FROM user_links WHERE user_id = $1 ORDER BY created_at`, [userId]),
  ]);

  // profile이 없으면 빈 객체로
  const profileData = profile.rows[0] || {
    intro: "",
    core_competencies: "",
    main_job_group: "",
    sub_job: "",
    is_career_verified: false,
    verified_date: "",
    skills: [],
    skill_areas: [],
    certificates: [],
    work_type_prefer: "",
    region_prefer: "",
    office_job_areas: [],
  };

  return ok({
    profile: profileData,
    careers: careers.rows,
    educations: educations.rows,
    experiences: experiences.rows,
    languages: languages.rows,
    links: links.rows,
  });
}

// ============================================
// PUT: 사용자 프로필 전체 저장 (sync)
// ============================================
export async function PUT(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  const userId = auth!.sub;
  const body = await req.json().catch(() => ({}));
  const {
    profile = {},
    careers = [],
    educations = [],
    experiences = [],
    languages = [],
    links = [],
  } = body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. user_profiles upsert
    await client.query(
      `INSERT INTO user_profiles (
        user_id, intro, core_competencies, main_job_group, sub_job,
        is_career_verified, verified_date, skills,
        skill_areas, certificates, work_type_prefer, region_prefer, office_job_areas, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        intro = EXCLUDED.intro,
        core_competencies = EXCLUDED.core_competencies,
        main_job_group = EXCLUDED.main_job_group,
        sub_job = EXCLUDED.sub_job,
        is_career_verified = EXCLUDED.is_career_verified,
        verified_date = EXCLUDED.verified_date,
        skills = EXCLUDED.skills,
        skill_areas = EXCLUDED.skill_areas,
        certificates = EXCLUDED.certificates,
        work_type_prefer = EXCLUDED.work_type_prefer,
        region_prefer = EXCLUDED.region_prefer,
        office_job_areas = EXCLUDED.office_job_areas,
        updated_at = NOW()`,
      [
        userId,
        profile.intro || "",
        profile.core_competencies || "",
        profile.main_job_group || "",
        profile.sub_job || "",
        profile.is_career_verified || false,
        profile.verified_date || "",
        profile.skills || [],
        profile.skill_areas || [],
        profile.certificates || [],
        profile.work_type_prefer || "",
        profile.region_prefer || "",
        profile.office_job_areas || [],
      ]
    );

    // 2. careers: delete-then-insert
    await client.query(`DELETE FROM user_careers WHERE user_id = $1`, [userId]);
    for (const c of careers) {
      await client.query(
        `INSERT INTO user_careers (user_id, company, department, position, start_date, end_date, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, c.company || "", c.department || "", c.position || "", c.start_date || c.startDate || "", c.end_date || c.endDate || "", c.is_verified || c.isVerified || false]
      );
    }

    // 3. educations
    await client.query(`DELETE FROM user_educations WHERE user_id = $1`, [userId]);
    for (const e of educations) {
      await client.query(
        `INSERT INTO user_educations (user_id, school, major, status, start_date, end_date, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, e.school || "", e.major || "", e.status || "", e.start_date || e.startDate || "", e.end_date || e.endDate || "", e.description || ""]
      );
    }

    // 4. experiences
    await client.query(`DELETE FROM user_experiences WHERE user_id = $1`, [userId]);
    for (const x of experiences) {
      await client.query(
        `INSERT INTO user_experiences (user_id, category, title, description)
         VALUES ($1, $2, $3, $4)`,
        [userId, x.category || "", x.title || "", x.description || ""]
      );
    }

    // 5. languages
    await client.query(`DELETE FROM user_languages WHERE user_id = $1`, [userId]);
    for (const l of languages) {
      await client.query(
        `INSERT INTO user_languages (user_id, language, level, test)
         VALUES ($1, $2, $3, $4)`,
        [userId, l.language || "", l.level || "", l.test || ""]
      );
    }

    // 6. links
    await client.query(`DELETE FROM user_links WHERE user_id = $1`, [userId]);
    for (const lk of links) {
      await client.query(
        `INSERT INTO user_links (user_id, category, url)
         VALUES ($1, $2, $3)`,
        [userId, lk.category || "", lk.url || ""]
      );
    }

    await client.query("COMMIT");
    return ok({ saved: true });
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error("[profile sync]", e);
    return err("PROFILE_001", e.message || "프로필 저장 중 오류가 발생했습니다.", 500);
  } finally {
    client.release();
  }
}