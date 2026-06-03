export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 어드민: 이력서 단건 상세 (풀 이력서 데이터)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  // 1. resume에서 user_id + 기본 정보 조회
  const resumeRes = await pool.query(
    `SELECT r.id, r.title, r.user_id, r.is_public, r.status,
            r.desired_location, r.desired_salary_min, r.desired_salary_max, r.desired_salary_type,
            r.career_type, r.created_at,
            u.name, u.email::text AS email, u.phone, u.gender, u.birth_date,
            u.job_type, u.avatar_url, u.portfolio_url, u.portfolio_filename
     FROM resumes r
     JOIN users u ON u.id = r.user_id
     WHERE r.id = $1`,
    [params.id]
  );

  if (resumeRes.rowCount === 0) {
    return err("RESUME_002", "이력서를 찾을 수 없습니다.", 404);
  }

  const resume = resumeRes.rows[0];
  const userId = resume.user_id;

  // 2. user_* 테이블에서 풀 이력서 데이터 병렬 조회
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

  return ok({
    resume,
    profile: profile.rows[0] || null,
    careers: careers.rows,
    educations: educations.rows,
    experiences: experiences.rows,
    languages: languages.rows,
    links: links.rows,
    certificates: certificates.rows,
  });
}