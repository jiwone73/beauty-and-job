export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { 이력서쓰기 } from "@/lib/resumeWrite";
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
  const [profile, careers, educations, experiences, languages, links, certificates, me] = await Promise.all([
    pool.query(`SELECT * FROM user_profiles WHERE user_id = $1`, [userId]),
    pool.query(`SELECT * FROM user_careers WHERE user_id = $1 ORDER BY start_date DESC`, [userId]),
    pool.query(`SELECT * FROM user_educations WHERE user_id = $1 ORDER BY start_date DESC`, [userId]),
    pool.query(`SELECT * FROM user_experiences WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
    pool.query(`SELECT * FROM user_languages WHERE user_id = $1 ORDER BY created_at`, [userId]),
    pool.query(`SELECT * FROM user_links WHERE user_id = $1 ORDER BY created_at`, [userId]),
    pool.query(`SELECT * FROM user_certificates WHERE user_id = $1 ORDER BY issued_ym DESC`, [userId]),
    // 이 둘은 users 표에 있다. 여기서 함께 주지 않으면 화면이 /api/users/me 를
    // 한 번 더 불러야 하고, 그동안 잘못된 값이 잠깐 스친다.
    pool.query(`SELECT job_type, avatar_public, email, (password_hash IS NOT NULL) AS has_password FROM users WHERE id = $1`, [userId]),
  ]);

  // profile이 없으면 빈 객체로
  const profileData = profile.rows[0] || {
    intro: "",
    core_competencies: "",
    cover_letter: "",
    salary_type: "",
    salary_min: null,
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
    job_search_status: "SEEKING",   // 프로필이 아직 없으면 기본값
    job_search_status_at: null,
  };

  return ok({
    // 매장(STORE)이냐 오피스(OFFICE)냐 — 화면에서 부르는 이름이 갈린다.
    job_type: me.rows[0]?.job_type ?? null,
    // 사진 공개 여부. 값이 없으면 공개로 본다.
    avatar_public: me.rows[0]?.avatar_public ?? true,
    // 탈퇴 화면에서 "이 계정이 맞는지" 보여주고, 비밀번호 칸을 낼지 정한다.
    email: me.rows[0]?.email ?? null,
    has_password: me.rows[0]?.has_password ?? false,
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

  const t0 = Date.now();
  const client = await pool.connect();
  const tConnect = Date.now();
  try {
    await client.query("BEGIN");
    const tBegin = Date.now();
    // 쓰는 일 자체는 lib/resumeWrite 가 한다. 지원서 스냅샷도 같은 함수를
    // 쓰되 COMMIT 대신 ROLLBACK 한다 — 두 길이 갈리지 않게 하려는 것이다.
    await 이력서쓰기(client, userId, body);
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
  // 희망급여 — 공고와 같은 모양(원 단위 + 유형). 비우면 「급여 협의」다.
  if (typeof b.salary_type === "string") fields.push(["salary_type", b.salary_type]);
  if (b.salary_min === null || typeof b.salary_min === "number") fields.push(["salary_min", b.salary_min]);
  // 공개 여부는 바꾼 시점이 곧 신선도라, 값과 갱신 시각을 항상 함께 저장한다.
  if (["SEEKING", "OPEN", "CLOSED"].includes(b.job_search_status)) {
    fields.push(["job_search_status", b.job_search_status]);
    fields.push(["job_search_status_at", new Date()]);
  }

  // 프로필 사진 공개 여부는 users 표에 있어(avatar_url 옆) 따로 저장한다.
  if (typeof b.avatar_public === "boolean") {
    await pool.query(`UPDATE users SET avatar_public = $1 WHERE id = $2`, [b.avatar_public, auth!.sub]);
    if (fields.length === 0) return ok({ saved: true });
  }

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