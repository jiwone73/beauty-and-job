export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { 메인칸 } from "@/lib/companyPlans";

/**
 * 메인 채용관 — 유료로 산 자리.
 *
 * 화살표로 넘기지 않는다. 페이지를 넘기게 하면 뒤 페이지는 아무도 안 봐서,
 * 같은 값을 낸 곳이 노출을 못 받는다. 칸 수를 고정하고 시간으로 나눈다.
 *
 * 차례는 **덜 노출된 곳부터**다. 방문자 한 사람 안에서 세면 잠깐 보고 나가는
 * 사람이 많을 때 뒤쪽 곳이 영영 안 보인다. 전체 노출 횟수를 근거로 삼아야
 * 곳마다 숫자가 고르게 맞는다.
 */

const 등급 = ["PREMIUM", "STANDARD"] as const;
type 등급 = (typeof 등급)[number];

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const tier = (sp.get("tier") || "PREMIUM").toUpperCase() as 등급;
  const 빼기 = (sp.get("exclude") || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 40);
  if (!등급.includes(tier)) return err("REQ_001", "알 수 없는 채용관입니다.", 400);
  const 칸 = 메인칸[tier];
  // 한 번에 여섯 바퀴 분량을 받아 두고 화면이 5초마다 돌린다. 5초마다 서버를
  // 부르면 방문자 한 사람이 1분에 열두 번 부른다.
  const 뽑을수 = 칸 * 6;

  try {
    const 산곳 = await pool.query(
      `SELECT id, title, job_type, company_id, company_name, brand_name, logo_url,
              cover_images, signboard_url, company_type, location, work_type,
              employment_type, experience_level, deadline, created_at, categories
         FROM v_active_jobs
        WHERE company_plan = $1 AND is_sample IS NOT TRUE
        ORDER BY main_impressions ASC, created_at DESC
        LIMIT $2`,
      [tier, 뽑을수]
    );

    // 빈 칸은 최신 공고로 채운다. 유료 기업이 들어오면 그 칸부터 밀려난다 —
    // 오픈 첫날 메인이 비지 않으면서, 자리가 팔리면 없어지는 자리라 파는 쪽
    // 명분도 선다. 채운 것은 노출 수를 세지 않는다(판 자리가 아니다).
    //
    // 채우는 것은 프리미엄관만이다. 둘 다 채우면 유료 기업이 없는 동안 메인에
    // 같은 공고가 두 번 뜬다. 스탠다드관은 산 곳이 없으면 아예 접는다.
    const 모자람 = tier === "PREMIUM" ? Math.max(0, 칸 - 산곳.rowCount!) : 0;
    let 채움: any[] = [];
    if (모자람 > 0) {
      const r = await pool.query(
        `SELECT id, title, job_type, company_id, company_name, brand_name, logo_url,
                cover_images, signboard_url, company_type, location, work_type,
                employment_type, experience_level, deadline, created_at, categories
           FROM v_active_jobs
          WHERE (company_plan IS NULL OR company_plan <> $1) AND is_sample IS NOT TRUE
            AND ($3::uuid[] IS NULL OR NOT (id = ANY($3::uuid[])))
          ORDER BY created_at DESC LIMIT $2`,
        [tier, 모자람, 빼기.length ? 빼기 : null]
      );
      채움 = r.rows.map((x) => ({ ...x, filler: true }));
    }

    return ok({ slots: 칸, items: [...산곳.rows, ...채움] });
  } catch (e) {
    console.error("[showcase GET]", e);
    return err("SERVER_001", "채용관을 불러오지 못했습니다.", 500);
  }
}

/** 실제로 화면에 뜬 것만 센다. 화면이 모아 두었다가 한 번에 알려 준다. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x: any) => typeof x === "string").slice(0, 200) : [];
  if (!ids.length) return ok({ counted: 0 });
  try {
    const r = await pool.query(
      `UPDATE job_postings SET main_impressions = main_impressions + 1 WHERE id = ANY($1::uuid[])`,
      [ids]
    );
    return ok({ counted: r.rowCount });
  } catch (e) {
    console.error("[showcase POST]", e);
    return ok({ counted: 0 });
  }
}
