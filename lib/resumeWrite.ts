import type { PoolClient } from "pg";

/** 이력서 한 벌을 사람의 행들에 통째로 갈아 끼운다.
 *
 * 트랜잭션은 부르는 쪽이 연다. 기본 이력서를 저장할 때는 COMMIT 하고,
 * 지원서 스냅샷을 뜰 때는 여기까지만 쓴 뒤 ROLLBACK 한다 — 같은 연결
 * 안에서는 아직 굳지 않은 행도 읽히므로, 저장하지 않고도 '저장했다면
 * 이랬을 모습' 그대로 박제할 수 있다. 두 길이 같은 코드를 쓰는 것이
 * 요점이다. 스냅샷 만드는 길을 따로 두면 두 모습이 언젠가 갈린다.
 */
export async function 이력서쓰기(client: PoolClient, userId: string, body: any) {
  const {
    profile = {},
    careers = [],
    educations = [],
    experiences = [],
    languages = [],
    links = [],
    certificates = [],
  } = body || {};

  // 아래 DELETE 는 여러 문장을 한 번에 보내느라 값을 끼워 넣는다(pg 는
  // 다중 문장에 자리표를 못 쓴다). 토큰에서 온 값이지만 모양을 확인한다.
  if (!/^[0-9a-fA-F-]{36}$/.test(userId)) throw new Error("userId 모양이 아니다");

  await client.query(
    `INSERT INTO user_profiles (
      user_id, intro, core_competencies, main_job_group, sub_job,
      is_career_verified, verified_date, skills,
      skill_areas, work_type_prefer, region_prefer, office_job_areas, is_entry_level, entry_experience, job_search_status, job_search_status_at, cover_letter, salary_type, salary_min, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
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
      job_search_status = EXCLUDED.job_search_status,
      job_search_status_at = EXCLUDED.job_search_status_at,
      region_prefer = EXCLUDED.region_prefer,
      office_job_areas = EXCLUDED.office_job_areas,
      is_entry_level = EXCLUDED.is_entry_level,
      entry_experience = EXCLUDED.entry_experience,
      cover_letter = EXCLUDED.cover_letter,
      -- 급여는 이 함수를 부르는 쪽이 값을 실었을 때만 바꾼다. 지원 창의
      -- 사본은 급여를 싣고(그 지원에만 적용), 이력서 저장은 안 싣는다 —
      -- 안 실었는데 덮어쓰면 프로필에서 고른 급여가 지워진다.
      salary_type = COALESCE(EXCLUDED.salary_type, user_profiles.salary_type),
      salary_min = COALESCE(EXCLUDED.salary_min, user_profiles.salary_min),
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
      // 인재검색 공개 여부: 값이 없으면 공개. 바꾼 시점을 함께 남겨 신선도를 보여준다.
      ["SEEKING", "OPEN", "CLOSED"].includes(profile.job_search_status) ? profile.job_search_status : "SEEKING",
      profile.job_search_status_at || new Date(),
      // 기본 자기소개서. 선택이라 안 쓴 사람은 빈 값이다.
      profile.cover_letter || "",
      // 급여는 실은 쪽만 바꾼다(위 COALESCE). 안 실으면 null 로 가고 그대로 남는다.
      profile.salary_type ?? null,
      profile.salary_min === null || profile.salary_min === undefined ? null : profile.salary_min,
    ]
  );
  // resumes upsert (관리자 이력서 관리 노출용) - ON CONFLICT 한 방 처리
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
  // 하위 항목들: DELETE 6개를 한 번에 (왕복 최소화) 후 멀티 INSERT
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
    ["company", "department", "position", "start_date", "end_date", "is_verified", "description", "company_public"],
    careers,
    (c) => [c.company || "", c.department || "", c.position || "", c.start_date || c.startDate || "", c.end_date || c.endDate || "", c.is_verified || c.isVerified || false, c.description || "", (c.company_public ?? c.companyPublic) !== false]
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
}
