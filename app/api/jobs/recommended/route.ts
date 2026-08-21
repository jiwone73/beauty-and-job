export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { verifyAccessToken } from "@/lib/jwt";
import { 고르기, RECOMMEND_MIN, type 구직자, type 공고 } from "@/lib/recommend";
import type { JobType } from "@/lib/data/jobGroups";

// 맞춤 공고. 로그인하지 않았거나 이력서가 비어 있으면 점수를 매길 근거가 없으므로
// 최신순으로 물러선다(personalized:false). 그때는 화면도 '추천'이라 부르지 않는다.
export async function GET(req: NextRequest) {
  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit")) || 4, 12);
  const jobTypeQ = new URL(req.url).searchParams.get("job_type");

  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  let userId: string | null = null;
  if (token) {
    try {
      const p = verifyAccessToken(token);
      if (p.owner_type === "user") userId = p.sub;
    } catch { /* 만료·위조 토큰은 비로그인과 같이 다룬다 */ }
  }

  try {
    // 후보는 넉넉히 가져와 앱에서 점수를 매긴다. SQL 로 점수를 짜면 규칙을 고칠 때마다
    // 쿼리를 다시 써야 하고, 왜 그 점수인지 설명하기도 어렵다.
    const 조건: string[] = ["TRUE"];
    const params: any[] = [];
    if (jobTypeQ === "STORE" || jobTypeQ === "OFFICE") { 조건.push(`j.job_type = $${params.length + 1}`); params.push(jobTypeQ); }
    // 카드가 그대로 그릴 수 있게 /api/jobs 와 같은 칸을 돌려준다 — 목록마다 모양이
    // 달라지면 화면에서 또 맞춰야 한다. v_active_jobs 는 마감·상태를 이미 걸러 준다.
    const 후보 = await pool.query(
      `SELECT j.id, j.title, j.job_type, j.company_id, j.company_name, j.brand_name, j.logo_url,
              j.cover_images, j.company_type, j.location, j.work_type, j.employment_type,
              j.salary_min, j.salary_max, j.salary_type, j.experience_level, j.is_featured,
              j.deadline, j.created_at, j.categories, j.benefit_tags,
              COALESCE((SELECT array_agg(p->>'career') FROM jsonb_array_elements(jp.positions::jsonb) p
                        WHERE p->>'career' IS NOT NULL), '{}') AS careers
         FROM v_active_jobs j
         LEFT JOIN job_postings jp ON jp.id = j.id
        WHERE ${조건.join(" AND ")}
        ORDER BY j.created_at DESC
        LIMIT 200`, params);

    const 공고들: 공고[] = 후보.rows.map((r) => ({
      id: r.id, companyId: r.company_id, categories: r.categories,
      location: r.location, employmentType: r.employment_type,
      careers: Array.isArray(r.careers) ? r.careers : [], createdAt: r.created_at,
    }));

    if (!userId) return ok({ personalized: false, items: 최신(후보.rows, limit) });

    const [u, prof, careers, scraps, applied] = await Promise.all([
      pool.query(`SELECT job_type, region_sido, region_sigungu, preferred_regions FROM users WHERE id = $1`, [userId]),
      pool.query(`SELECT skill_areas, office_job_areas, work_type_prefer, is_entry_level FROM user_profiles WHERE user_id = $1`, [userId]),
      pool.query(`SELECT start_date, end_date FROM user_careers WHERE user_id = $1`, [userId]),
      pool.query(`SELECT j.company_id, j.categories FROM bookmarks b JOIN job_postings j ON j.id = b.job_posting_id WHERE b.user_id = $1`, [userId]),
      pool.query(`SELECT job_posting_id FROM applications WHERE user_id = $1`, [userId]),
    ]);
    if (u.rowCount === 0) return ok({ personalized: false, items: 최신(후보.rows, limit) });

    const me = u.rows[0];
    const pf = prof.rows[0] || {};
    const jobType: JobType = me.job_type === "STORE" ? "STORE" : "OFFICE";
    const areas: string[] = (jobType === "STORE" ? pf.skill_areas : pf.office_job_areas) || [];

    // 희망 근무지역이 비어 있으면 사는 곳으로 물러선다 — 아무 데나 보여주는 것보다 낫다.
    let regions: { sido?: string; sigungu?: string }[] =
      Array.isArray(me.preferred_regions) ? me.preferred_regions : [];
    if (!regions.length && me.region_sido) regions = [{ sido: me.region_sido, sigungu: me.region_sigungu }];

    const 사람: 구직자 = {
      jobType, areas, regions,
      months: 총개월(careers.rows),
      isEntry: !!pf.is_entry_level,
      workType: pf.work_type_prefer || undefined,
      scrappedAreas: [...new Set(scraps.rows.flatMap((r) => r.categories || []))] as string[],
      scrappedCompanyIds: [...new Set(scraps.rows.map((r) => r.company_id).filter(Boolean))] as string[],
      appliedJobIds: applied.rows.map((r) => r.job_posting_id),
    };

    // 근거가 하나도 없으면(직군·지역 둘 다 빈 이력서) 점수가 신선도뿐이라 추천이 아니다.
    if (!areas.length && !regions.length) return ok({ personalized: false, items: 최신(후보.rows, limit) });

    const 뽑음 = 고르기(사람, 공고들, limit);
    const 지도 = new Map(후보.rows.map((r) => [r.id, r]));
    return ok({
      personalized: 뽑음.some((x) => x.score >= RECOMMEND_MIN),
      items: 뽑음.map((x) => ({ ...행(지도.get(x.id)), score: x.score, reasons: x.reasons })),
    });
  } catch (e: any) {
    console.error("[recommended]", e);
    return err("SERVER_001", "추천 공고를 불러오지 못했습니다.", 500);
  }
}

function 총개월(rows: any[]): number {
  let m = 0;
  for (const r of rows) {
    const s = new Date(r.start_date), e = r.end_date ? new Date(r.end_date) : new Date();
    if (isNaN(+s) || isNaN(+e)) continue;
    const d = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (d > 0) m += d;
  }
  return m;
}

// careers 는 점수 계산에만 쓰는 값이라 화면으로 내보내지 않는다.
const 행 = (r: any) => { const { careers, ...쓸것 } = r || {}; return 쓸것; };
const 최신 = (rows: any[], n: number) =>
  rows.slice(0, n).map((r) => ({ ...행(r), score: 0, reasons: [] as string[] }));
