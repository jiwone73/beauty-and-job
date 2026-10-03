import pool from "@/lib/db";
import { 플랜, type PlanId, 메인칸, 칸수 } from "@/lib/companyPlans";

/**
 * 노출 순서를 정하는 규칙을 한 곳에 모은다 — 검색 목록·메인 채용관이 모두 여기를 본다.
 *
 * 순서 규칙이 곳곳에 흩어져 있으면 규칙을 바꿀 때 일부만 바뀐다. 3단계에서 가산점
 * (공급·성장·트래픽) 규칙으로 바꿀 때 이 파일 안만 고치면 모든 곳에 한 번에 반영되게 한다.
 *
 * 지금(1단계) 규칙:
 *  · 등급이 높은 쪽이 위 (프리미엄 > 스탠다드 > 라이트 > 스타트)
 *  · 같은 등급 안에서는 기업이 마지막으로 들어온 날이 최근인 쪽이 위
 *  · 이벤트 무료 체험 기간의 메인 채용관은 공고를 먼저 올린 순서(선착순)로 프리미엄관·스탠다드관 자리를
 *    채우고, 같은 관 안의 보이는 순서는 최근 로그인 순이다.
 */

/** 검색 목록의 등급 순서(높은 등급이 위) — SQL ORDER BY 조각. a 는 테이블 별칭('j.' 같은 것). */
export const 노출등급SQL = (a = ""): string =>
  `CASE ${a}company_plan ` +
  (Object.keys(플랜) as PlanId[]).map((p) => `WHEN '${p}' THEN ${플랜[p].노출순위} `).join("") +
  `ELSE 0 END DESC`;

/**
 * 같은 등급 안에서 줄 세우는 법 — 기업이 마지막으로 들어온 날. 헤어인잡과 같은 방식이다.
 * 로그인한 적 없는 곳(우리가 모아 온 공고)은 접속일이 없어 등록일로 갈음한다.
 */
export const 같은등급안SQL = (a = ""): string =>
  `COALESCE((SELECT c_.last_login_at FROM companies c_ WHERE c_.id = ${a}company_id), ${a}created_at) DESC NULLS LAST, ` +
  `md5(${a}id::text || CURRENT_DATE::text)`;

const 공고열 = `id, title, job_type, company_id, company_name, brand_name, logo_url,
                cover_images, signboard_url, company_type, location, work_type,
                employment_type, experience_level, deadline, created_at, categories`;

/**
 * 이벤트 무료 체험 기간의 메인 채용관 — 이벤트로 이용권을 받은 기업(plan_source = 'EVENT') 중
 * 진행중 공고가 있는 곳을 **공고를 먼저 올린 순**으로 줄 세워, 앞 8곳은 프리미엄관, 다음 25곳은
 * 스탠다드관에 넣는다. 기업당 가장 최근 공고 하나만 나온다.
 *
 * 같은 관 안의 보이는 순서는 최근 로그인 순이다(요청 때마다 다시 정렬 — 활동이 있으면 위로 온다).
 */
export async function 이벤트메인줄(tier: "PREMIUM" | "STANDARD"): Promise<any[]> {
  const 프리 = 칸수("PREMIUM");
  const 시작 = tier === "PREMIUM" ? 1 : 프리 + 1;
  const 끝 = tier === "PREMIUM" ? 프리 : 프리 + 칸수("STANDARD");
  const { rows } = await pool.query(
    `WITH 기업별 AS (
       SELECT DISTINCT ON (j.company_id) j.*, c.last_login_at,
              (SELECT MIN(p.created_at) FROM job_postings p WHERE p.company_id = j.company_id AND p.status <> 'DRAFT') AS 첫등록
         FROM v_active_jobs j JOIN companies c ON c.id = j.company_id
        WHERE c.plan_source = 'EVENT' AND c.plan IS NOT NULL AND c.paid_until >= CURRENT_DATE
          AND j.is_sample IS NOT TRUE
        ORDER BY j.company_id, j.created_at DESC
     ), 순번 AS (
       SELECT *, ROW_NUMBER() OVER (ORDER BY 첫등록 ASC, company_id) AS rn FROM 기업별
     )
     SELECT ${공고열}
       FROM 순번 WHERE rn BETWEEN $1 AND $2
      ORDER BY COALESCE(last_login_at, created_at) DESC NULLS LAST, id`,
    [시작, 끝]
  );
  return rows;
}

void 메인칸;
