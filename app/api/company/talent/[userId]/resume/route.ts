export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { 인재열람가능 } from "@/lib/companyEntitlement";

// 기업 인재검색: userId로 지원자 풀 이력서 조회 (ResumePreview용)
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const userId = params.userId;

  const userRes = await pool.query(
    `SELECT id, name, email, phone, gender, birth_date, job_type,
            CASE WHEN avatar_public THEN avatar_url ELSE NULL END AS avatar_url,
            portfolio_images
     FROM users WHERE id = $1 AND status = 'ACTIVE'`,
    [userId]
  );
  if (userRes.rowCount === 0) {
    return err("TALENT_404", "인재 정보를 찾을 수 없습니다.", 404);
  }

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

  // 셀렉미와 같은 잠금 — 연락처와 자기소개서는 공고를 등록한 곳에만 연다.
  // 경력·학력·자격증·희망조건은 그대로 보여 준다(볼 수 있어야 제안할지 정한다).
  const 열람가능 = await 인재열람가능(auth!.sub);
  const u = { ...userRes.rows[0] };
  const p = { ...(profile.rows[0] || {}) };
  if (!열람가능) {
    u.email = null;
    u.phone = null;
    p.intro = null;
    p.core_competencies = null;
  }

  return ok({
    talentAccess: 열람가능,
    user: u,
    profile: p,
    careers: careers.rows,
    educations: educations.rows,
    experiences: experiences.rows,
    languages: languages.rows,
    links: links.rows,
    certificates: certificates.rows,
  });
}