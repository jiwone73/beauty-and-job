import pool from "@/lib/db";

// 지원 시점 이력서 전체를 조회해 스냅샷 JSON으로 반환
// (admin/resumes/[id] 의 구조와 동일하게 맞춰 mapResume 재활용 가능)
export async function buildResumeSnapshot(userId: string, resumeId: string | null) {
  // 기본 이력서 + 유저 기본정보
  const resumeRes = await pool.query(
    `SELECT r.id, r.title, r.user_id, r.is_public, r.status,
            r.desired_location, r.desired_salary_min, r.desired_salary_max, r.desired_salary_type,
            r.career_type, r.created_at,
            u.name, u.email::text AS email, u.phone, u.gender, u.birth_date,
            u.job_type, u.avatar_url, u.portfolio_url, u.portfolio_filename
     FROM resumes r
     JOIN users u ON u.id = r.user_id
     WHERE r.user_id = $1
     ORDER BY (r.status = 'PUBLISHED') DESC, r.is_primary DESC, r.updated_at DESC
     LIMIT 1`,
    [userId]
  );
  if (resumeRes.rowCount === 0) return null;
  const resume = resumeRes.rows[0];

  const [profile, careers, educations, experiences, languages, links, certificates] =
    await Promise.all([
      pool.query(`SELECT * FROM user_profiles WHERE user_id = $1`, [userId]),
      pool.query(`SELECT * FROM user_careers WHERE user_id = $1 ORDER BY start_date DESC`, [userId]),
      pool.query(`SELECT * FROM user_educations WHERE user_id = $1 ORDER BY start_date DESC`, [userId]),
      pool.query(`SELECT * FROM user_experiences WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
      pool.query(`SELECT * FROM user_languages WHERE user_id = $1 ORDER BY created_at`, [userId]),
      pool.query(`SELECT * FROM user_links WHERE user_id = $1 ORDER BY created_at`, [userId]),
      pool.query(`SELECT * FROM user_certificates WHERE user_id = $1 ORDER BY issued_ym DESC`, [userId]),
    ]);

  return {
    snapshot_at: new Date().toISOString(),
    resume,
    profile: profile.rows[0] || null,
    careers: careers.rows,
    educations: educations.rows,
    experiences: experiences.rows,
    languages: languages.rows,
    links: links.rows,
    certificates: certificates.rows,
  };
}