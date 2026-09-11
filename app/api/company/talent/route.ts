export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { 인재열람가능, 이름가리기, 재직가리기, 지원함SQL } from "@/lib/companyEntitlement";

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
  // 스크랩해 둔 사람만. 스크랩 목록도 인재 검색과 같은 카드를 쓰려면 같은 모양으로
  // 내려와야 한다 — 따로 만든 쿼리는 이름 가리기도, 제안 이력도 빠져 있었다.
  const onlyScrapped = searchParams.get("scrapped") === "1";
  // 스크랩 인재에서 공고를 고르면 그 공고로 담은 사람만. "none" 은 공고 없이 담은 사람.
  // 쿼리에 바로 넣으므로 모양을 엄격히 본다(공고 id 모양이거나 none 이 아니면 버린다).
  const scrapJobRaw = (searchParams.get("scrapJob") || "").trim();
  const scrapJob = scrapJobRaw === "none" || /^[0-9a-f-]{36}$/i.test(scrapJobRaw) ? scrapJobRaw : "";
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
  // 유료 기간인가. 무료 기업회원에게는 우리 공고에 지원한 사람만 빼고 이름·연락처를
  // 가린다 — 검색 조건(이름 검색)도 이것을 따르므로 쿼리를 짜기 전에 본다.
  const 열람가능 = await 인재열람가능(auth!.sub);
  let idx = 2;

  // job_type
  const jobTypeClause = `AND u.job_type = $${idx++}`;
  params.push(볼유형);

  // 직군 (다중 IN)
  let jobGroupClause = "";
  if (jobGroups) {
    const groups = jobGroups.split(",").map((g) => g.trim()).filter(Boolean);
    if (groups.length > 0) {
      // 대분류와 소분류를 둘 다 본다.
      //
      // 사이드 필터가 소분류를 넘긴다(「네일 아티스트」). 대분류만 보면 아무것도
      // 안 걸린다. 이력서는 대분류(main_job_group)와 소분류(sub_job)를 따로 담고
      // 있어 어느 쪽에 걸려도 그 사람이다.
      const ph = groups.map(() => `$${idx++}`).join(", ");
      jobGroupClause = `AND (up.main_job_group IN (${ph}) OR up.sub_job IN (${ph}))`;
      // 같은 자리표($3, $4…)를 두 곳에서 쓰므로 값은 한 번만 넣는다.
      params.push(...groups);
    }
  }

  // 키워드 (이름 / 포지션 / 스킬)
  let searchClause = "";
  if (search) {
    // 이름 검색은 유료 기간에만 — 가린 이름을 검색으로 맞혀 볼 수 있으면 가린 것이 아니다.
    searchClause = `AND (
      ${열람가능 ? `u.name ILIKE $${idx} OR` : ""}
      EXISTS (
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
      // 희망지역은 두 곳에 있다.
      //
      //   users.preferred_regions   {sido, sigungu} 목록 — 이력서에서 고르는 정식 값
      //   user_profiles.region_prefer  옛 문자열 칸 — 시·도만 들어 있다
      //
      // 옛 칸만 보고 있어서 시·군·구를 고르면 아무도 안 걸렸다. 「서울특별시
      // 강남구」로 찾으면 앞의 것에서 걸리고, 「서울특별시」로 찾으면 둘 다에서
      // 걸린다 — 같은 찾을 말 하나로 두 곳을 본다.
      const conds = list.map(() => {
        const n = idx++;
        return `(up.region_prefer ILIKE $${n} OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(u.preferred_regions) pr
           WHERE jsonb_typeof(u.preferred_regions) = 'array'
             AND TRIM(CONCAT_WS(' ', pr->>'sido', pr->>'sigungu')) ILIKE $${n}))`;
      }).join(" OR ");
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
  // 스크랩 목록에서만은 비공개로 돌린 사람도 보여준다 — 이미 담아 둔 사람이라
  // 그 사람이 문을 닫았다는 사실 자체가 알아야 할 정보다.
  const jsClause = onlyScrapped ? "" : "AND up.job_search_status <> 'CLOSED'";

  // 경력 (CTE 이후) — 공고 모집부문과 같은 사다리다(lib/data/jobGroups 의 단계표).
  // 신입·경력은 근무 기간으로, 인턴·실장 같은 자리는 이력서에 적힌 직급으로 가른다.
  // 예전에는 화면이 「5-10년」·「10년+」을 보내는데 여기에 그 둘이 없어, 골라도
  // 아무것도 걸러지지 않고 전체가 그대로 나왔다.
  //
  // 이제 가입할 때 본인이 단계를 고르므로(career_stage) 그 값이 먼저다. 고르지
  // 않은 옛 회원만 예전처럼 이력에서 셈한 값으로 가른다. 두 갈래를 OR 로 묶어야
  // 새 회원과 옛 회원이 같은 필터에 함께 걸린다.
  const 고른단계가 = (말: string) => `career_stage = '${말}'`;
  const 직급으로 = (말: string) => `(career_stage IS NULL AND career_position ILIKE '%${말}%')`;
  const 이력이 = (조건: string) => `(career_stage IS NULL AND ${조건})`;
  const 묶음 = (a: string, b: string) => `AND (${a} OR ${b})`;

  let careerClause = "";
  if (careerFilter === "신입")
    careerClause = 묶음(고른단계가("신입"), 이력이("(career_years IS NULL OR career_years = 0)"));
  else if (careerFilter === "경력")
    careerClause = 묶음(고른단계가("경력"), 이력이("career_years >= 1"));
  else if (careerFilter === "인턴")    careerClause = 묶음(고른단계가("인턴"), 직급으로("인턴"));
  else if (careerFilter === "실장")    careerClause = 묶음(고른단계가("실장"), 직급으로("실장"));
  else if (careerFilter === "매니저급") careerClause = 묶음(고른단계가("매니저급"), 직급으로("매니저"));
  else if (careerFilter === "점장급")   careerClause = 묶음(고른단계가("점장급"), 직급으로("점장"));
  // 본사는 연차로 뽑는다. 구간은 겹치지 않는다(예전 「1-3년」·「3-5년」은 3년에서 겹쳤다).
  else if (careerFilter === "1~2년")  careerClause = 묶음(고른단계가("1~2년"), 이력이("career_years BETWEEN 1 AND 2"));
  else if (careerFilter === "3~5년")  careerClause = 묶음(고른단계가("3~5년"), 이력이("career_years BETWEEN 3 AND 5"));
  else if (careerFilter === "5~10년") careerClause = 묶음(고른단계가("5~10년"), 이력이("career_years BETWEEN 6 AND 10"));
  else if (careerFilter === "10년+")  careerClause = 묶음(고른단계가("10년+"), 이력이("career_years > 10"));

  // 연령 (CTE 이후, 매장직)
  let ageClause = "";
  if (ageGroup === "20대")  ageClause = "AND age BETWEEN 20 AND 29";
  else if (ageGroup === "30대") ageClause = "AND age BETWEEN 30 AND 39";
  else if (ageGroup === "40대 이상") ageClause = "AND age >= 40";

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
        up.career_stage,
        up.skills,
        up.skill_areas,
        up.office_job_areas,
        u.region_sido,
        u.region_sigungu,
        up.region_prefer,
        up.work_type_prefer,
        up.job_search_status::text AS job_search_status,
        up.job_search_status_at,
        -- 이력서를 마지막으로 손본 때. 오래 방치된 이력서인지가 카드에서 보여야 한다.
        up.updated_at AS resume_updated_at,
        (
          SELECT CASE
            WHEN MIN(start_date) ~ '^[0-9]{4}'
            THEN GREATEST(EXTRACT(YEAR FROM NOW())::int - LEFT(MIN(start_date),4)::int, 0)
            ELSE NULL END
          FROM user_careers WHERE user_id = u.id
        ) AS career_years,
        (SELECT COUNT(*)::int FROM user_careers WHERE user_id = u.id) AS career_count,
        -- 가장 최근 경력의 직급. 인턴·실장 같은 자리로 거를 때 쓴다.
        (
          SELECT position FROM user_careers WHERE user_id = u.id
          ORDER BY start_date DESC LIMIT 1
        ) AS career_position,
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
        -- 우리 공고에 지원한 사람인가. 무료 기업회원에게 이름·연락처가 열리는 단 하나의 경우.
        ${지원함SQL("u.id", "$1")} AS applied_here,
        -- 어느 공고로 담았나. 공고 없이 담은 것은 "none". 북마크의 공고 고르기에 체크로 뜬다.
        (
          SELECT COALESCE(array_agg(COALESCE(job_posting_id::text, 'none')), '{}')
            FROM company_talent_scraps WHERE company_id = $1 AND user_id = u.id
        ) AS scrap_job_ids,
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
        ) AS interest_message,
        -- 대화를 이어 갈 스레드. 관심을 보인 가장 최근 제안 하나.
        (
          SELECT id FROM proposals
           WHERE company_id = $1 AND user_id = u.id AND interested_at IS NOT NULL
           ORDER BY interested_at DESC LIMIT 1
        ) AS interest_proposal_id
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
        ${onlyScrapped ? `AND EXISTS (
          SELECT 1 FROM company_talent_scraps cs
           WHERE cs.company_id = $1 AND cs.user_id = u.id
           ${scrapJob === "none" ? "AND cs.job_posting_id IS NULL"
             : scrapJob ? `AND cs.job_posting_id = '${scrapJob}'::uuid` : ""}
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
    const { rows } = await pool.query(query, params);
    const total = rows[0]?.total_count ?? 0;
    const data = rows.map((r) => ({
      id: r.id,
      // 무료 기업회원에게는 우리 공고에 지원한 사람만 실명 — 제안을 수락한 사람도 가린다.
      name: (열람가능 || r.applied_here) ? r.name : 이름가리기(r.name),
      // 연락처는 채용을 실제로 하고 있는 곳(공고 보유)에만 연다. 화면에서만
      // 가리면 응답에 남아 개발자 도구로 그대로 보이므로 여기서 지워 보낸다.
      // 제안을 수락한 사람과는 대화로 이어 가면 된다 — 연락처는 지원했거나 유료일 때만.
      email: (열람가능 || r.applied_here) ? (r.email || null) : null,
      phone: (열람가능 || r.applied_here) ? (r.phone || null) : null,
      interestedAt: r.interested_at || null,
      interestMessage: r.interest_message || null,
      interestProposalId: r.interest_proposal_id || null,
      // 사진만 감춘 사람은 아예 내려보내지 않는다. 화면에서 가리면 응답에 남아
      // 개발자 도구로 볼 수 있다 — 가린 것이 가려진 것이 아니게 된다.
      avatarUrl: r.avatar_public === false ? null : r.avatar_url,
      // 작업물은 자기소개서와 같은 잠금 — 미용은 인스타그램이 곧 포트폴리오라
      // 사진만 막고 링크를 열어 두면 막은 것이 아니다.
      portfolioImages: (열람가능 || r.applied_here) ? (r.portfolio_images || null) : null,
      snsUrl: (열람가능 || r.applied_here) ? (r.sns_url || null) : null,
      gender: r.gender,
      age: r.age,
      // 한줄소개는 자기 PR 한 줄이라 열어 둔다 — 무료로도 판단할 수 있어야 목록이
      // 뜻을 갖는다. 자기소개서는 — 이력서에 담아 둔 기본 자소서(cover_letter)든
      // 지원할 때 쓴 것(applications.cover_letter)이든 — 이 쿼리에 아예 없어
      // 인재검색에 노출될 일이 없다. 이력서를 열어야 보이고, 거기서 잠금이 걸린다.
      intro: r.intro,
      mainJobGroup: r.main_job_group,
      subJob: r.sub_job,
      careerStage: r.career_stage,
      skills: r.skills || [],
      skillAreas: r.skill_areas || [],
      officeJobAreas: r.office_job_areas || [],
      regionPrefer: [r.region_sido, r.region_sigungu].filter(Boolean).join(" ") || r.region_prefer || null,
      workTypePrefer: r.work_type_prefer,
      careerYears: r.career_years,
      careerCount: r.career_count,
      educationDetail: r.education_detail,
      // 재직 매장 이름은 연락할 수 있게 된 다음에 알면 된다. 그전에는 직책만.
      careerDetail: (열람가능 || r.applied_here)
        ? r.career_detail
        : (r.career_detail
            ? { ...r.career_detail, company: 재직가리기(r.career_detail.position) || "일하는 중", position: null }
            : null),
      jobSearchStatus: r.job_search_status || "SEEKING",
      jobSearchStatusAt: r.job_search_status_at || null,
      scrapped: r.scrapped,
      scrapJobIds: r.scrap_job_ids || [],
      proposedAt: r.proposed_at || null,
      resumeUpdatedAt: r.resume_updated_at || null,
    }));
    return ok(data, 200, { total, page, limit, talentAccess: 열람가능 } as any);
  } catch (e: any) {
    console.error("[talent GET]", e);
    return err("TALENT_001", "인재 목록 조회 실패: " + e.message, 500);
  }
}