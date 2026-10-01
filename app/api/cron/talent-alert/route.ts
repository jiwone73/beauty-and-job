export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { 인재고르기, 총개월, type 인재, type 공고 } from "@/lib/recommend";
import type { JobType } from "@/lib/data/jobGroups";
import { sendTalentMatchAskEmail } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://beauty-work.vercel.app";

/**
 * 맞는 인재가 새로 들어오면 알린다 — 프리미엄.
 *
 * 기업에 바로 알리지 않는다. 특정 구직자를 특정 기업에 콕 집어 보내는 건
 * 동의 없이 하면 안 되는 일이라("추천인재매일은 프리미엄 한테만 오는거
 * 아니야?" → "구직자에 동의를 받고 추천하면" → "관심여부만 묻는 예 아니오로
 * 정리하자") 먼저 구직자에게 "관심 있으세요?" 를 묻고, 관심을 표시한 경우에만
 * 기업에 간다(그 다음 자리는 app/api/talent-recommendations/[id]/route.ts).
 *
 * talent_recommendations에 이미 물어본 조합(기업·공고·구직자)은 다시 묻지
 * 않는다 — 같은 사람에게 같은 추천을 반복해 보내면 알림이 아니라 잔소리가 된다.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const 머리 = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || 머리 !== secret) return err("AUTH_001", "인증이 필요합니다.", 401);

  // 프리미엄 기간 안에 있는 기업의 게재 중인 공고.
  const 공고들 = await pool.query(
    `SELECT j.id, j.title, j.company_id, j.location, j.employment_type, j.categories, j.created_at,
            COALESCE((SELECT array_agg(x->>'career') FROM jsonb_array_elements(j.positions::jsonb) x
                      WHERE x->>'career' IS NOT NULL), '{}') AS careers,
            COALESCE(c.brand_name, c.company_name) AS company_name
       FROM job_postings j
       JOIN companies c ON c.id = j.company_id
      WHERE j.status = 'ACTIVE'
        AND c.plan = 'PREMIUM' AND c.paid_until >= CURRENT_DATE`
  );
  if (공고들.rowCount === 0) return ok({ 공고: 0, 물어본수: 0 });

  const 인재들Raw = await pool.query(
    `SELECT u.id, u.email, u.name, u.job_type, u.region_sido, u.region_sigungu, u.preferred_regions,
            up.skill_areas, up.office_job_areas, up.work_type_prefer, up.is_entry_level,
            COALESCE((SELECT json_agg(json_build_object('start_date', c.start_date, 'end_date', c.end_date))
                        FROM user_careers c WHERE c.user_id = u.id), '[]'::json) AS 경력
       FROM users u JOIN user_profiles up ON up.user_id = u.id
      WHERE u.status = 'ACTIVE' AND u.is_sample IS NOT TRUE
        AND COALESCE(up.job_search_status::text, '') <> 'CLOSED'`
  );

  const 인재들: 인재[] = 인재들Raw.rows.map((r) => {
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
    };
  }).filter((t) => t.areas.length > 0);
  if (인재들.length === 0) return ok({ 공고: 공고들.rowCount, 물어본수: 0 });

  const emailById = new Map(인재들Raw.rows.map((r) => [String(r.id), { email: r.email as string | null, name: r.name as string }]));

  // 이미 물어본(상태 무관) 조합은 다시 묻지 않는다.
  const 이미물어본 = await pool.query(`SELECT company_id, job_posting_id, user_id FROM talent_recommendations`);
  const 물어본Set = new Set(이미물어본.rows.map((r) => `${r.company_id}:${r.job_posting_id}:${r.user_id}`));

  let 물어본수 = 0;
  const errors: string[] = [];
  for (const j of 공고들.rows) {
    const 공고값: 공고 = {
      id: String(j.id), companyId: j.company_id, categories: j.categories,
      location: j.location, employmentType: j.employment_type,
      careers: j.careers || [], createdAt: j.created_at,
    };
    const 고른것 = 인재고르기(공고값, 인재들, [], 10);
    for (const r of 고른것) {
      const key = `${j.company_id}:${j.id}:${r.id}`;
      if (물어본Set.has(key)) continue;
      const u = emailById.get(r.id);
      if (!u?.email) continue;
      try {
        const token = crypto.randomBytes(16).toString("hex");
        const { rows: ins } = await pool.query(
          `INSERT INTO talent_recommendations (company_id, job_posting_id, user_id, status, token)
           VALUES ($1, $2, $3, 'PENDING', $4) RETURNING id`,
          [j.company_id, j.id, r.id, token]
        );
        const recId = ins[0].id;
        const respondUrl = `${SITE_URL}/talent-recommendations/${recId}?token=${token}`;
        await sendTalentMatchAskEmail(u.email, u.name, j.company_name, j.title, respondUrl);
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
           VALUES ($1, 'TALENT_MATCH_ASK', '관심 있으세요?', $2, $3, 'talent_recommendation')`,
          [r.id, `${j.company_name}의 「${j.title}」 포지션이 프로필과 잘 맞아요. 메일함에서 관심 여부를 알려주세요.`, recId]
        );
        물어본수++;
      } catch (e: any) {
        errors.push(`${j.id}:${r.id}: ${e?.message || "error"}`);
      }
    }
  }

  return ok({ 공고: 공고들.rowCount, 잴수있는사람: 인재들.length, 물어본수, errors });
}
