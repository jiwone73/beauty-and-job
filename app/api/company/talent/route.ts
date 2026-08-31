export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { 인재열람가능 } from "@/lib/companyEntitlement";

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
  // 제안에 「관심 있어요」를 누른 사람만. 알림에서 넘어올 때 쓴다.
  const interested  = searchParams.get("interested") === "1";
  const page        = parseInt(searchParams.get("page") || "1");
  const limit       = parseInt(searchParams.get("limit") || "50");
  const offset      = (page - 1) * limit;

  // 매장은 매장 인재만, 본사는 본사 인재만 본다. 화면에서 고르개를 감추는 것만으로는
  //   이 API 를 직접 부르면 그대로 넘어온다 — 회원 유형으로 여기서 강제한다.
  //   겸업(BOTH) 회원만 넘어온 값을 그대로 쓴다.
  const 내유형 = (await pool.query(
    `SELECT company_type FROM companies WHERE id = $1`, [auth!.sub]
  )).rows[0]?.company_type as "STORE" | "OFFICE" | "BOTH" | undefined;
  const 볼유형 = 내유형 === "BOTH" || !내유형 ? jobType : 내유형;

  const params: any[] = [auth!.sub]; // $1 = company_id
  let idx = 2;

  // job_type
  const jobTypeClause = `AND u.job_type = $${idx++}`;
  params.push(볼유형);

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
  if (gender === "여성") {
    genderClause = `AND u.gender = $${idx++}`;
    params.push("FEMALE");
  } else if (gender === "남성") {
    genderClause = `AND u.gender = $${idx++}`;
    params.push("MALE");
  }

  // 인재검색에 나오는 사람은 '공개'로 둔 사람뿐이다. 비공개는 자기 이력서를
  // 기업에게 보이지 않겠다는 뜻이라 어떤 조건으로도 검색되지 않는다.
  const jsClause = "AND up.job_search_status <> 'CLOSED'";

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
        u.email,
        u.phone,
        u.avatar_url,
        u.avatar_public,
        u.portfolio_images,
        (
          SELECT ul.url FROM user_links ul
          WHERE ul.user_id = u.id AND COALESCE(ul.url, '') <> ''
          ORDER BY (ul.url ILIKE '%instagram%') DESC, ul.created_at
          LIMIT 1
        ) AS sns_url,
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
        u.region_sido,
        u.region_sigungu,
        up.region_prefer,
        up.work_type_prefer,
        up.job_search_status::text AS job_search_status,
        up.job_search_status_at,
        (
          SELECT CASE
            WHEN MIN(start_date) ~ '^[0-9]{4}'
            THEN GREATEST(EXTRACT(YEAR FROM NOW())::int - LEFT(MIN(start_date),4)::int, 0)
            ELSE NULL END
          FROM user_careers WHERE user_id = u.id
        ) AS career_years,
        (SELECT COUNT(*)::int FROM user_careers WHERE user_id = u.id) AS career_count,
        (
          SELECT json_build_object(
            'school', school, 'major', major, 'status', status,
            'start_date', start_date, 'end_date', end_date
          )
          FROM user_educations WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
        ) AS education_detail,
        (
          SELECT json_build_object(
            'company', company, 'department', department, 'position', position,
            'start_date', start_date, 'end_date', end_date
          )
          FROM user_careers WHERE user_id = u.id ORDER BY start_date DESC LIMIT 1
        ) AS career_detail,
        EXISTS(
          SELECT 1 FROM company_talent_scraps WHERE company_id = $1 AND user_id = u.id
        ) AS scrapped,
        -- 이미 제안한 사람인지. 모르면 같은 사람에게 또 보내게 된다.
        (
          SELECT MAX(created_at) FROM proposals
          WHERE company_id = $1 AND user_id = u.id
        ) AS proposed_at,
        -- 제안에 「관심 있어요」를 누른 사람. 본인이 연 것이라 연락처를 보여 준다.
        (
          SELECT MAX(interested_at) FROM proposals
          WHERE company_id = $1 AND user_id = u.id AND interested_at IS NOT NULL
        ) AS interested_at,
        -- 관심에 붙인 한마디("주 4일 가능할까요?"). 가장 최근 것 하나.
        (
          SELECT interest_message FROM proposals
           WHERE company_id = $1 AND user_id = u.id AND interested_at IS NOT NULL
           ORDER BY interested_at DESC LIMIT 1
        ) AS interest_message
      FROM users u
      JOIN user_profiles up ON up.user_id = u.id
      WHERE u.status = 'ACTIVE'
        AND NOT EXISTS (
          SELECT 1 FROM user_company_blocks b
          WHERE b.user_id = u.id AND b.company_id = $1
        )
        ${interested ? `AND EXISTS (
          SELECT 1 FROM proposals pi
           WHERE pi.company_id = $1 AND pi.user_id = u.id AND pi.interested_at IS NOT NULL
        )` : ""}
        ${jobTypeClause}
        ${jobGroupClause}
        ${searchClause}
        ${regionClause}
        ${genderClause}
        ${jsClause}
    )
    SELECT *, COUNT(*) OVER()::int AS total_count
    FROM talent
    WHERE 1=1 ${careerClause} ${ageClause}
    -- 공개 설정을 최근에 손댄 사람이 먼저. 오래 방치된 이력서는 자연히 뒤로 밀린다
    ORDER BY (job_search_status = 'SEEKING') DESC, job_search_status_at DESC NULLS LAST, created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `;
  params.push(limit, offset);

  try {
    const [{ rows }, 열람가능] = await Promise.all([
      pool.query(query, params),
      인재열람가능(auth!.sub),
    ]);
    const total = rows[0]?.total_count ?? 0;
    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      // 연락처는 채용을 실제로 하고 있는 곳(공고 보유)에만 연다. 화면에서만
      // 가리면 응답에 남아 개발자 도구로 그대로 보이므로 여기서 지워 보낸다.
      // 「관심 있어요」를 누른 사람은 스스로 문을 연 것이라 열람권과 무관하게 보여 준다.
      // 그래야 제안을 받은 사람이 답했는데 연락할 길이 없는 일이 안 생긴다.
      email: (열람가능 || r.interested_at) ? (r.email || null) : null,
      phone: (열람가능 || r.interested_at) ? (r.phone || null) : null,
      interestedAt: r.interested_at || null,
      interestMessage: r.interest_message || null,
      // 사진만 감춘 사람은 아예 내려보내지 않는다. 화면에서 가리면 응답에 남아
      // 개발자 도구로 볼 수 있다 — 가린 것이 가려진 것이 아니게 된다.
      avatarUrl: r.avatar_public === false ? null : r.avatar_url,
      portfolioImages: r.portfolio_images || null,
      snsUrl: r.sns_url || null,
      gender: r.gender,
      age: r.age,
      intro: r.intro,
      mainJobGroup: r.main_job_group,
      subJob: r.sub_job,
      skills: r.skills || [],
      skillAreas: r.skill_areas || [],
      officeJobAreas: r.office_job_areas || [],
      regionPrefer: [r.region_sido, r.region_sigungu].filter(Boolean).join(" ") || r.region_prefer || null,
      workTypePrefer: r.work_type_prefer,
      careerYears: r.career_years,
      careerCount: r.career_count,
      educationDetail: r.education_detail,
      careerDetail: r.career_detail,
      jobSearchStatus: r.job_search_status || "SEEKING",
      jobSearchStatusAt: r.job_search_status_at || null,
      scrapped: r.scrapped,
      proposedAt: r.proposed_at || null,
    }));
    return ok(data, 200, { total, page, limit, talentAccess: 열람가능 } as any);
  } catch (e: any) {
    console.error("[talent GET]", e);
    return err("TALENT_001", "인재 목록 조회 실패: " + e.message, 500);
  }
}