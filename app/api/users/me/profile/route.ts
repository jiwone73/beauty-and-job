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
  const [profile, careers, educations, experiences, languages, links, certificates] = await Promise.all([
    pool.query(`SELECT * FROM user_profiles WHERE user_id = $1`, [userId]),
    pool.query(`SELECT * FROM user_careers WHERE user_id = $1 ORDER BY start_date DESC`, [userId]),
    pool.query(`SELECT * FROM user_educations WHERE user_id = $1 ORDER BY start_date DESC`, [userId]),
    pool.query(`SELECT * FROM user_experiences WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
    pool.query(`SELECT * FROM user_languages WHERE user_id = $1 ORDER BY created_at`, [userId]),
    pool.query(`SELECT * FROM user_links WHERE user_id = $1 ORDER BY created_at`, [userId]),
    pool.query(`SELECT * FROM user_certificates WHERE user_id = $1 ORDER BY issued_ym DESC`, [userId]),
  ]);

  // profile이 없으면 빈 객체로
  const profileData = profile.rows[0] || {
    intro: "",
    core_competencies: "",
    main_job_group: "",
    sub_job: "",
    is_career_verified: false,
    verified_date: "",
    is_entry_level: false,
    entry_experience: "",
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
    certificates: certificates.rows,
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
    certificates = [],
  } = body;

  const t0 = Date.now();
  const client = await pool.connect();
  const tConnect = Date.now();
  try {
    await client.query("BEGIN");
await client.query("BEGIN");
    const tBegin = Date.now();
    // 1. user_profiles upsert
    await client.query(
      `INSERT INTO user_profiles (
        user_id, intro, core_competencies, main_job_group, sub_job,
        is_career_verified, verified_date, skills,
        skill_areas, work_type_prefer, region_prefer, office_job_areas, is_entry_level, entry_experience, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        intro = EXCLUDED.intro,
        core_competencies = EXCLUDED.core_competencies,
        main_job_group = EXCLUDED.main_job_group,
        sub_job = EXCLUDED.sub_job,
        is_career_verified = EXCLUDED.is_career_verified,
        verified_date = EXCLUDED.verified_date,
        skills = EXCLUDED.skills,
        skill_areas = EXCLUDED.skill_areas,
        work_type_prefer = EXCLUDED.work_type_prefer,
        region_prefer = EXCLUDED.region_prefer,
        office_job_areas = EXCLUDED.office_job_areas,
        is_entry_level = EXCLUDED.is_entry_level,
        entry_experience = EXCLUDED.entry_experience,
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
        profile.work_type_prefer || "",
        profile.region_prefer || "",
        profile.office_job_areas || [],
        profile.is_entry_level || false,
        profile.entry_experience || "",
      ]
    );
    // 1-2. resumes upsert (관리자 이력서 관리 노출용) - ON CONFLICT 한 방 처리
    const uJobType = profile.office_job_areas?.length ? "OFFICE" : (profile.skill_areas?.length ? "STORE" : "OFFICE");
    await client.query(
      `INSERT INTO resumes (user_id, title, job_type, introduction, desired_location, is_public, status)
       VALUES ($1, (SELECT COALESCE(name,'이력서') || '의 이력서' FROM users WHERE id = $1),
               COALESCE((SELECT job_type FROM users WHERE id = $1), $2), $3, $4, true, 'PUBLISHED')
       ON CONFLICT (user_id) DO UPDATE SET
         title = EXCLUDED.title,
         job_type = EXCLUDED.job_type,
         introduction = EXCLUDED.introduction,
         desired_location = EXCLUDED.desired_location,
         is_public = true,
         status = 'PUBLISHED',
         updated_at = NOW()`,
      [userId, uJobType, profile.intro || "", profile.region_prefer || ""]
    );
    // 2~7. 하위 항목들: DELETE 6개를 한 번에 (왕복 최소화) 후 멀티 INSERT
    await client.query(
      `DELETE FROM user_careers WHERE user_id = '${userId}';
       DELETE FROM user_educations WHERE user_id = '${userId}';
       DELETE FROM user_experiences WHERE user_id = '${userId}';
       DELETE FROM user_languages WHERE user_id = '${userId}';
       DELETE FROM user_links WHERE user_id = '${userId}';
       DELETE FROM user_certificates WHERE user_id = '${userId}';`
    );
    const bulkInsert = async (
      table: string,
      cols: string[],
      rows: any[],
      mapRow: (r: any) => any[]
    ) => {
      if (!rows || rows.length === 0) return;
      const colList = ["user_id", ...cols].join(", ");
      const values: any[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const r of rows) {
        const rowVals = [userId, ...mapRow(r)];
        const ph = rowVals.map(() => `$${idx++}`);
        placeholders.push(`(${ph.join(", ")})`);
        values.push(...rowVals);
      }
      await client.query(
        `INSERT INTO ${table} (${colList}) VALUES ${placeholders.join(", ")}`,
        values
      );
    };

    await bulkInsert(
      "user_careers",
      ["company", "department", "position", "start_date", "end_date", "is_verified", "description"],
      careers,
      (c) => [c.company || "", c.department || "", c.position || "", c.start_date || c.startDate || "", c.end_date || c.endDate || "", c.is_verified || c.isVerified || false, c.description || ""]
    );
    await bulkInsert(
      "user_educations",
      ["school", "major", "status", "start_date", "end_date", "description", "level"],
      educations,
      (e) => [e.school || "", e.major || "", e.status || "", e.start_date || e.startDate || "", e.end_date || e.endDate || "", e.description || "", e.level || ""]
    );
    await bulkInsert(
      "user_experiences",
      ["category", "title", "description"],
      experiences,
      (x) => [x.category || "", x.title || "", x.description || ""]
    );
    await bulkInsert(
      "user_languages",
      ["language", "level", "test"],
      languages,
      (l) => [l.language || "", l.level || "", l.test || ""]
    );
    await bulkInsert(
      "user_links",
      ["category", "url"],
      links,
      (lk) => [lk.category || "", lk.url || ""]
    );
    await bulkInsert(
      "user_certificates",
      ["name", "issuer", "issued_ym"],
      certificates,
      (cert) => [cert.name || "", cert.issuer || "", cert.issued_ym || cert.issuedYm || ""]
    );
    await client.query("COMMIT");
    const tCommit = Date.now();
    return ok({ saved: true, timing: { connect: tConnect - t0, begin: tBegin - tConnect, work: tCommit - tBegin, total: tCommit - t0 } });
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error("[profile sync]", e);
    return err("PROFILE_001", e.message || "프로필 저장 중 오류가 발생했습니다.", 500);
  } finally {
    client.release();
  }
}

// ============================================
// PATCH: 프로필 필수항목(시술분야·희망근무형태 등)만 부분 저장.
// 하위 항목(경력·학력 등)은 절대 건드리지 않음 → 프로필 화면에서 안전하게 호출.
// ============================================
export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;
  const userId = auth!.sub;
  const b = await req.json().catch(() => ({}));

  // 요청 body에 포함된 컬럼만 부분 업데이트(빠진 컬럼은 건드리지 않음).
  // intro/careers 등 다른 데이터엔 영향 없음.
  const fields: [string, any][] = [];
  if (Array.isArray(b.skill_areas)) fields.push(["skill_areas", b.skill_areas]);
  if (typeof b.work_type_prefer === "string") fields.push(["work_type_prefer", b.work_type_prefer]);
  if (typeof b.region_prefer === "string") fields.push(["region_prefer", b.region_prefer]);
  if (Array.isArray(b.office_job_areas)) fields.push(["office_job_areas", b.office_job_areas]);
  if (typeof b.entry_experience === "string") fields.push(["entry_experience", b.entry_experience]);

  if (fields.length === 0) return ok({ saved: true });

  const cols = fields.map((f) => f[0]);
  const insertCols = ["user_id", ...cols, "updated_at"];
  const placeholders = ["$1", ...cols.map((_, i) => `$${i + 2}`), "NOW()"];
  const updateSet = [...cols.map((c) => `${c} = EXCLUDED.${c}`), "updated_at = NOW()"];
  const params = [userId, ...fields.map((f) => f[1])];

  try {
    await pool.query(
      `INSERT INTO user_profiles (${insertCols.join(", ")})
       VALUES (${placeholders.join(", ")})
       ON CONFLICT (user_id) DO UPDATE SET ${updateSet.join(", ")}`,
      params
    );
    return ok({ saved: true });
  } catch (e: any) {
    console.error("[profile patch]", e);
    return err("PROFILE_001", e.message || "저장 중 오류가 발생했습니다.", 500);
  }
}