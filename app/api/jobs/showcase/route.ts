export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { 메인칸, 칸수 } from "@/lib/companyPlans";
import jwt from "jsonwebtoken";

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

const 등급 = ["EVENT", "PREMIUM", "STANDARD"] as const;
type 등급 = (typeof 등급)[number];

/**
 * 이벤트 채용관 설정. app_settings.event_showcase 에 이렇게 둔다.
 *
 *   {"from":"2026-10-12","to":"2026-10-31","until":"2026-11-30","title":"오픈이벤트 채용관"}
 *
 * from~to 사이에 가입하고 그 사이에 공고를 올린 곳이 대상이고, until 까지
 * 그 줄을 세운다. 설정이 없거나 until 이 지났으면 줄 자체가 안 생긴다 —
 * 이벤트가 끝나면 값 하나만 지우면 된다.
 */
type 이벤트설정 = { from: string; to: string; until: string; title?: string };

async function 이벤트설정읽기(): Promise<이벤트설정 | null> {
  try {
    const { rows } = await pool.query(
      `SELECT value, to_char(CURRENT_DATE, 'YYYY-MM-DD') AS 오늘
         FROM app_settings WHERE key = 'event_showcase'`);
    if (!rows[0]?.value) return null;
    const v = JSON.parse(rows[0].value) as 이벤트설정;
    if (!v?.from || !v?.to || !v?.until || v.until < rows[0].오늘) return null;
    return v;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const tier = (sp.get("tier") || "PREMIUM").toUpperCase() as 등급;
  const 빼기 = (sp.get("exclude") || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 40);
  if (!등급.includes(tier)) return err("REQ_001", "알 수 없는 채용관입니다.", 400);
  const 칸 = 칸수(tier);
  // 한 번에 세 바퀴 분량을 받아 두고 화면이 5초마다 돌린다. 5초마다 서버를
  // 부르면 방문자 한 사람이 1분에 열두 번 부른다.
  const 뽑을수 = 칸 * 3;

  try {
    // 이벤트 채용관은 산 자리가 아니라 「이벤트 기간에 가입하고 공고를 올린
    // 곳」이다. 차례도 노출 수가 아니라 **먼저 올린 순**이다 — 선착순이라고
    // 약속했으면 그 순서가 화면에 그대로 보여야 한다.
    if (tier === "EVENT") {
      const 설정 = await 이벤트설정읽기();
      if (!설정) return ok({ items: [], slots: 칸, cols: 메인칸.EVENT.열, 표: null, title: null });
      const { rows } = await pool.query(
        `SELECT j.id, j.title, j.job_type, j.company_id, j.company_name, j.brand_name, j.logo_url,
                j.cover_images, j.signboard_url, j.company_type, j.location, j.work_type,
                j.employment_type, j.experience_level, j.deadline, j.created_at, j.categories
           FROM v_active_jobs j
           JOIN companies c ON c.id = j.company_id
          WHERE j.is_sample IS NOT TRUE
            AND c.created_at::date BETWEEN $1::date AND $2::date
            AND j.created_at::date BETWEEN $1::date AND $2::date
          ORDER BY j.created_at ASC
          LIMIT $3`,
        [설정.from, 설정.to, 뽑을수]
      );
      const 표 = rows.length
        ? jwt.sign({ ids: rows.map((r) => r.id) }, process.env.JWT_SECRET!, { expiresIn: "12h" })
        : null;
      return ok({ items: rows, slots: 칸, cols: 메인칸.EVENT.열, 표,
                  title: 설정.title || "오픈이벤트 채용관" });
    }

    const 산곳 = await pool.query(      `SELECT id, title, job_type, company_id, company_name, brand_name, logo_url,
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
    // 두 채용관이 같은 공고를 채우지 않도록, 스탠다드관은 프리미엄관이 쓴 것을
    // exclude 로 받아 빼고 채운다.
    const 모자람 = Math.max(0, 칸 - 산곳.rowCount!);
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

    // 셀 수 있는 것을 여기서 못 박아 표로 끊어 준다. 아래 POST 는 이 표에 적힌
    // 것만 센다 — 노출 수는 산 사람에게 보여주는 영수증이라 아무나 고쳐 쓸 수
    // 있으면 영수증이 아니다. (표를 받아다 여러 번 되보내는 것까지는 못 막는다.
    // 그건 사람이 새로고침하는 것과 같은 비용이라 여기서 볼 일은 아니다.)
    const 표 = 산곳.rowCount
      ? jwt.sign({ ids: 산곳.rows.map((r) => r.id) }, process.env.JWT_SECRET!, { expiresIn: "12h" })
      : null;

    return ok({ slots: 칸, cols: 메인칸[tier].열, items: [...산곳.rows, ...채움], 표 });
  } catch (e) {
    console.error("[showcase GET]", e);
    return err("SERVER_001", "채용관을 불러오지 못했습니다.", 500);
  }
}

/**
 * 실제로 화면에 뜬 것만 센다. 화면이 모아 두었다가 한 번에 알려 준다.
 *
 * 무엇을 셀 수 있는지는 GET 이 내준 표가 정한다. 표에 없는 id 는 버린다.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  let 셀수있는것: Set<string>;
  try {
    const p = jwt.verify(String(body?.표 || ""), process.env.JWT_SECRET!) as { ids?: string[] };
    셀수있는것 = new Set(Array.isArray(p.ids) ? p.ids : []);
  } catch {
    return ok({ counted: 0 });
  }
  const ids = [...new Set(
    (Array.isArray(body?.ids) ? body.ids : []).filter((x: any) => typeof x === "string" && 셀수있는것.has(x))
  )];
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
