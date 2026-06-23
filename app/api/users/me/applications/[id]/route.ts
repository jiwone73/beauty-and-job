export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 구직자 본인의 지원 상세 (자소서 + 지원시점 이력서 스냅샷)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  const result = await pool.query(
    `SELECT a.id, a.status, a.applied_at, a.viewed_at, a.cover_letter, a.resume_snapshot,
            a.user_id, u.name AS user_name, u.email::text AS user_email, u.phone AS user_phone,
            u.job_type AS user_job_type, u.gender, u.birth_date,
            u.portfolio_url, u.portfolio_filename, u.avatar_url AS user_avatar_url,
            jp.title AS job_title, c.company_name
     FROM applications a
     JOIN users u ON u.id = a.user_id
     JOIN job_postings jp ON jp.id = a.job_posting_id
     JOIN companies c ON c.id = jp.company_id
     WHERE a.id = $1 AND a.user_id = $2`,
    [params.id, auth!.sub]
  );
  if (result.rowCount === 0) {
    return err("APP_002", "지원 내역을 찾을 수 없습니다.", 404);
  }

  const row = result.rows[0];
  const snap = row.resume_snapshot;

  // 지원 시점 스냅샷 우선
  if (snap && (snap.profile || snap.careers)) {
    return ok({
      ...row,
      is_snapshot: true,
      resume: {
        profile: snap.profile || {},
        careers: snap.careers || [],
        educations: snap.educations || [],
        experiences: snap.experiences || [],
        languages: snap.languages || [],
        links: snap.links || [],
        certificates: snap.certificates || [],
      },
    });
  }

  // 스냅샷 없는 옛 지원 건 → 현재 이력서 폴백
  const uid = row.user_id;
  const [profile, careers, educations, experiences, languages, links, certificates] = await Promise.all([
    pool.query(`SELECT * FROM user_profiles WHERE user_id = $1`, [uid]),
    pool.query(`SELECT * FROM user_careers WHERE user_id = $1 ORDER BY start_date DESC`, [uid]),
    pool.query(`SELECT * FROM user_educations WHERE user_id = $1 ORDER BY start_date DESC`, [uid]),
    pool.query(`SELECT * FROM user_experiences WHERE user_id = $1 ORDER BY created_at DESC`, [uid]),
    pool.query(`SELECT * FROM user_languages WHERE user_id = $1 ORDER BY created_at`, [uid]),
    pool.query(`SELECT * FROM user_links WHERE user_id = $1 ORDER BY created_at`, [uid]),
    pool.query(`SELECT * FROM user_certificates WHERE user_id = $1 ORDER BY issued_ym DESC`, [uid]),
  ]);

  return ok({
    ...row,
    is_snapshot: false,
    resume: {
      profile: profile.rows[0] || {},
      careers: careers.rows,
      educations: educations.rows,
      experiences: experiences.rows,
      languages: languages.rows,
      links: links.rows,
      certificates: certificates.rows,
    },
  });
}