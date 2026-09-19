export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { 인재고르기, 총개월, type 인재, type 공고 } from "@/lib/recommend";
import type { JobType } from "@/lib/data/jobGroups";

/**
 * 맞는 인재가 새로 들어오면 알린다 — 프리미엄.
 *
 * 스탠다드도 추천 목록은 본다. 다만 대시보드에 들어와야 본다. 프리미엄이
 * 더 파는 것은 「먼저 안다」이다 — 좋은 사람은 먼저 연락한 곳이 데려간다.
 *
 * 하루 한 번 돈다. 어제 이후 새로 들어왔거나 이력서를 손본 사람만 본다.
 * 어제까지 이미 목록에 있던 사람을 다시 알리면 알림이 아니라 잔소리가 된다.
 */

const 하루 = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const 머리 = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || 머리 !== secret) return err("AUTH_001", "인증이 필요합니다.", 401);

  const sp = new URL(req.url).searchParams;
  // 며칠치를 볼 것인가. 크론이 하루 한 번이라 기본은 하루다. 한 번 걸렀을 때
  // 손으로 며칠치를 몰아 돌릴 수 있게 열어 둔다.
  const 며칠 = Math.min(30, Math.max(1, parseInt(sp.get("days") || "1")));
  // 알림을 넣지 않고 무엇이 갈지만 본다. 운영 알림을 건드리지 않고 확인한다.
  const 미리보기 = sp.get("dry") === "1";

  const 기준 = new Date(Date.now() - 며칠 * 하루);

  // 새로 들어왔거나 이력서를 손본 사람. 샘플은 뺀다 — 제안을 보내도 답할 사람이 없다.
  const 새인재 = await pool.query(
    `SELECT u.id, u.name, u.job_type, u.region_sido, u.region_sigungu, u.preferred_regions,
            up.skill_areas, up.office_job_areas, up.work_type_prefer,
            up.is_entry_level, up.updated_at,
            COALESCE((SELECT json_agg(json_build_object('start_date', c.start_date, 'end_date', c.end_date))
                        FROM user_careers c WHERE c.user_id = u.id), '[]'::json) AS 경력
       FROM users u JOIN user_profiles up ON up.user_id = u.id
      WHERE u.status = 'ACTIVE' AND u.is_sample IS NOT TRUE
        AND COALESCE(up.job_search_status::text, '') <> 'CLOSED'
        AND up.updated_at >= $1`,
    [기준]
  );
  if (새인재.rowCount === 0) return ok({ 새인재: 0, 보낸곳: 0 });

  const 후보: 인재[] = 새인재.rows.map((r) => {
    const jobType: JobType = r.job_type === "STORE" ? "STORE" : "OFFICE";
    const 희망 = Array.isArray(r.preferred_regions) ? r.preferred_regions : [];
    return {
      id: String(r.id),
      jobType,
      areas: ((jobType === "STORE" ? r.skill_areas : r.office_job_areas) || []).filter(Boolean).map(String),
      regions: 희망.length ? 희망 : (r.region_sido ? [{ sido: r.region_sido, sigungu: r.region_sigungu }] : []),
      months: 총개월(r.경력 || []),
      isEntry: !!r.is_entry_level,
      workType: r.work_type_prefer || undefined,
      updatedAt: r.updated_at,
    };
  }).filter((t) => t.areas.length > 0);
  if (후보.length === 0) return ok({ 새인재: 새인재.rowCount, 보낸곳: 0 });

  // 프리미엄 기간 안에 있는 기업의 게재 중인 공고.
  const 공고들 = await pool.query(
    `SELECT j.id, j.title, j.company_id, j.location, j.employment_type, j.categories, j.created_at,
            COALESCE((SELECT array_agg(x->>'career') FROM jsonb_array_elements(j.positions::jsonb) x
                      WHERE x->>'career' IS NOT NULL), '{}') AS careers
       FROM job_postings j
       JOIN companies c ON c.id = j.company_id
      WHERE j.status = 'ACTIVE'
        AND c.plan = 'PREMIUM' AND c.paid_until >= CURRENT_DATE`
  );

  // 이미 제안한 사람은 뺀다 — 기업마다 다르므로 한 번에 받아 두고 나눠 쓴다.
  const 제안 = await pool.query(`SELECT company_id, user_id FROM proposals`);
  const 기업별제안 = new Map<string, string[]>();
  for (const r of 제안.rows) {
    const k = String(r.company_id);
    const 앞 = 기업별제안.get(k) ?? [];
    앞.push(String(r.user_id));
    기업별제안.set(k, 앞);
  }

  // 한 기업에 공고가 여럿이면 알림도 여럿이 된다 — 기업 단위로 모아 한 번만 알린다.
  const 기업별 = new Map<string, { 이름: string[]; 공고: string }>();
  for (const j of 공고들.rows) {
    const 공고값: 공고 = {
      id: String(j.id), companyId: j.company_id, categories: j.categories,
      location: j.location, employmentType: j.employment_type,
      careers: j.careers || [], createdAt: j.created_at,
    };
    const 고른것 = 인재고르기(공고값, 후보, 기업별제안.get(String(j.company_id)) || [], 5);
    if (고른것.length === 0) continue;
    const 키 = String(j.company_id);
    const 앞 = 기업별.get(키);
    const 이름들 = 고른것
      .map((r) => 새인재.rows.find((u) => String(u.id) === r.id)?.name)
      .filter(Boolean) as string[];
    if (앞) 앞.이름.push(...이름들);
    else 기업별.set(키, { 이름: 이름들, 공고: j.title });
  }

  let 보낸곳 = 0;
  const 갈것: any[] = [];
  for (const [companyId, 것] of 기업별) {
    const 수 = new Set(것.이름).size;
    const 첫 = 것.이름[0] || "새 인재";
    if (미리보기) { 갈것.push({ companyId, 수, 공고: 것.공고, 이름: [...new Set(것.이름)] }); continue; }
    try {
      await pool.query(
        `INSERT INTO notifications (company_id, type, title, message, related_type)
         VALUES ($1, 'TALENT_MATCH', $2, $3, 'talent')`,
        [
          companyId,
          수 > 1 ? `우리 공고에 맞는 인재 ${수}명이 들어왔어요` : `${첫}님이 우리 공고에 맞아요`,
          `「${것.공고}」에 맞는 인재가 ${수}명 있습니다. 대시보드에서 확인하세요.`,
        ]
      );
      보낸곳++;
    } catch (e) {
      console.error("[talent-alert] 알림 실패", companyId, e);
    }
  }

  return ok({ 며칠, 새인재: 새인재.rowCount, 잴수있는사람: 후보.length, 보낸곳, ...(미리보기 ? { 갈것 } : {}) });
}
