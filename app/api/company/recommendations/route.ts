export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { 이용권 } from "@/lib/companyEntitlement";
import { 인재고르기, 총개월, type 인재, type 공고 } from "@/lib/recommend";
import type { JobType } from "@/lib/data/jobGroups";

/**
 * 빠른 인재 추천 — 스탠다드부터.
 *
 * 기업은 아무 조건도 고르지 않는다. 이미 올려 둔 공고가 곧 조건이다.
 * 인재검색은 직접 찾는 자리이고 여기는 찾지 않아도 서 있는 자리다.
 *
 * 인재 열람이 열리는 등급부터 준다. 추천은 검색을 대신하는 것이 아니라
 * 찾는 수고를 더는 것이라, 찾을 수 있는 등급이면 따라온다. 라이트에 주면
 * 「맞는 사람이 셋 있는데 볼 수는 없다」가 된다.
 *
 * 프리미엄이 더 파는 것은 이 목록이 아니라 「먼저 안다」이다 — 맞는 사람이
 * 새로 들어오면 알림과 메일이 간다(크론).
 *
 * 고르는 규칙은 구직자에게 공고를 골라 줄 때와 같은 것을 쓴다
 * (lib/recommend.ts). AI 는 쓰지 않는다 — 조건이 분명한 일에는 규칙이 더
 * 정확하고, 무엇보다 왜 이 사람이 떴는지를 그대로 말해 줄 수 있다.
 */
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;
  const companyId = auth!.sub;

  const { plan } = await 이용권(companyId);
  const 열림 = plan === "STANDARD" || plan === "PREMIUM";
  if (!열림) {
    // 못 쓴다는 사실만 알린다. 화면이 「스탠다드부터」라고 적을 수 있게.
    return ok({ 열림: false, plan, jobs: [] });
  }

  const sp = new URL(req.url).searchParams;
  const 고른공고 = (sp.get("jobId") || "").trim();
  const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") || "20")));

  // 게재 중인 공고만 본다. 내린 공고로 사람을 추천해 봐야 보낼 자리가 없다.
  const 공고들 = await pool.query(
    `SELECT j.id, j.title, j.company_id, j.location, j.employment_type, j.categories,
            j.created_at,
            COALESCE((SELECT array_agg(p->>'career') FROM jsonb_array_elements(j.positions::jsonb) p
                      WHERE p->>'career' IS NOT NULL), '{}') AS careers
       FROM job_postings j
      WHERE j.company_id = $1 AND j.status = 'ACTIVE'
        ${고른공고 ? "AND j.id = $2" : ""}
      ORDER BY j.created_at DESC
      LIMIT 20`,
    고른공고 ? [companyId, 고른공고] : [companyId]
  );
  if (공고들.rowCount === 0) return ok({ 열림: true, plan, jobs: [] });

  /* 인재를 한 번만 불러 온다. 공고마다 다시 부르면 공고 다섯 건에 다섯 번
     훑게 된다 — 재는 일은 메모리에서 하면 되고, DB 를 오가는 것이 비싸다.

     샘플은 뺀다. 인재검색에는 샘플도 뜨지만(화면이 비지 않게) 추천은 다르다.
     「이 사람에게 제안하세요」라고 내미는 자리라 답할 사람이 없으면 안 된다. */
  const 인재들 = await pool.query(
    `SELECT u.id, u.job_type, u.region_sido, u.region_sigungu, u.preferred_regions,
            up.skill_areas, up.office_job_areas, up.work_type_prefer,
            up.is_entry_level, up.updated_at, u.name, u.avatar_url, u.avatar_public,
            -- 경력은 날짜가 「2021-08」 꼴이라 SQL 로 재지 않는다. 행만 묶어 오고
            -- 세는 일은 구직자 쪽과 같은 함수(총개월)가 한다.
            COALESCE((SELECT json_agg(json_build_object('start_date', c.start_date, 'end_date', c.end_date))
                        FROM user_careers c WHERE c.user_id = u.id), '[]'::json) AS 경력
       FROM users u
       JOIN user_profiles up ON up.user_id = u.id
      WHERE u.status = 'ACTIVE'
        AND u.is_sample IS NOT TRUE
        AND COALESCE(up.job_search_status::text, '') <> 'CLOSED'`
  );

  // 이미 제안한 사람은 빼고 센다 — 같은 사람이 공고마다 다시 뜨면 목록이 아니라 잔소리다.
  const 제안함 = (await pool.query(
    `SELECT DISTINCT user_id FROM proposals WHERE company_id = $1`, [companyId]
  )).rows.map((r) => String(r.user_id));

  const 후보: 인재[] = 인재들.rows.map((r) => {
    const jobType: JobType = r.job_type === "STORE" ? "STORE" : "OFFICE";
    const 희망 = Array.isArray(r.preferred_regions) ? r.preferred_regions : [];
    return {
      id: String(r.id),
      jobType,
      // 매장은 skill_areas, 오피스는 office_job_areas 에 직군을 담는다 — 구직자 쪽과 같다.
      areas: ((jobType === "STORE" ? r.skill_areas : r.office_job_areas) || []).filter(Boolean).map(String),
      // 희망 지역이 비었으면 사는 곳으로 물러선다.
      regions: 희망.length ? 희망 : (r.region_sido ? [{ sido: r.region_sido, sigungu: r.region_sigungu }] : []),
      months: 총개월(r.경력 || []),
      isEntry: !!r.is_entry_level,
      workType: r.work_type_prefer || undefined,
      updatedAt: r.updated_at,
    };
  })
  // 직군을 안 적은 이력서는 잴 것이 없다. 공고는 직군으로 사람을 찾는 자리라
  // 직군이 비면 무엇을 하는 사람인지 알 수 없고, 지역만 맞다고 추천하면
  // 기업은 「왜 이 사람이?」부터 묻게 된다.
  .filter((t) => t.areas.length > 0);

  // 고른 사람을 화면이 그대로 그릴 수 있게 이름·직군·지역을 붙인다.
  // 프리미엄은 인재 열람이 열려 있으므로 이름을 가리지 않는다.
  const 사람정보 = new Map(인재들.rows.map((r) => [String(r.id), {
    name: r.name,
    avatar: r.avatar_public ? r.avatar_url : null,
    areas: ((r.job_type === "STORE" ? r.skill_areas : r.office_job_areas) || []).filter(Boolean),
    region: [r.region_sido, r.region_sigungu].filter(Boolean).join(" "),
  }]));

  const 결과 = 공고들.rows.map((j) => {
    const 공고값: 공고 = {
      id: String(j.id),
      companyId: j.company_id,
      categories: j.categories || [],
      location: j.location,
      employmentType: j.employment_type,
      careers: j.careers || [],
      createdAt: j.created_at,
    };
    const 고른것 = 인재고르기(공고값, 후보, 제안함, limit).map((r) => ({
      ...r, ...(사람정보.get(r.id) || {}),
    }));
    return { id: 공고값.id, title: j.title, 사람들: 고른것 };
  });

  return ok({ 열림: true, plan, jobs: 결과, 후보수: 후보.length });
}
