export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { 자소서짓기, type 이력자료 } from "@/lib/ai/coverLetter";
import { 하루쓴횟수, 하루한도 } from "@/lib/ai/quota";
import { shortenRegion } from "@/lib/memberFormat";
import { addressRegion } from "@/lib/regionShort";

// 자기소개서 초안.
//
// 화면에서 값을 받지 않는다 — 이미 저장돼 있는 것으로 만든다. 클라이언트가
// 보내면 무엇이든 보낼 수 있어 요금이 사람 손에 달리고, 화면마다 무엇을
// 넘겼는지가 갈린다. 공고 아이디 하나만 받는다.
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;
  const userId = auth!.sub;

  const 쓴횟수 = await 하루쓴횟수(userId, "cover_letter");
  if (쓴횟수 >= 하루한도.cover_letter) {
    return err("AI_LIMIT", `자기소개서 작성은 하루 ${하루한도.cover_letter}번까지예요. 내일 다시 눌러 주세요.`, 429);
  }

  const { job_id, position_title, work_location } = await req.json().catch(() => ({} as any));

  const [me, prof, careers, certs, langs] = await Promise.all([
    pool.query(`SELECT name, job_type, preferred_regions, office_job_areas FROM users WHERE id = $1`, [userId]),
    pool.query(`SELECT intro, skills, skill_areas, office_job_areas, is_entry_level, salary_type, salary_min FROM user_profiles WHERE user_id = $1`, [userId]),
    pool.query(`SELECT company, department, position, start_date, end_date, description, company_public FROM user_careers WHERE user_id = $1 ORDER BY start_date DESC LIMIT 5`, [userId]),
    pool.query(`SELECT name FROM user_certificates WHERE user_id = $1 LIMIT 6`, [userId]),
    pool.query(`SELECT language, level FROM user_languages WHERE user_id = $1 LIMIT 4`, [userId]),
  ]);
  const u = me.rows[0] || {};
  const p = prof.rows[0] || {};

  let 공고: 이력자료["공고"] = null;
  if (job_id) {
    const j = await pool.query(
      `SELECT jp.title, jp.address, COALESCE(c.brand_name, c.company_name) AS brand
         FROM job_postings jp LEFT JOIN companies c ON c.id = jp.company_id
        WHERE jp.id = $1`, [job_id]
    );
    if (j.rowCount) {
      공고 = {
        매장: j.rows[0].brand || null,
        제목: j.rows[0].title || null,
        분야: String(position_title || "").trim() || null,
        근무지: addressRegion(String(work_location || j.rows[0].address || "")) || null,
      };
    }
  }

  const 급여 = p.salary_min
    ? `${p.salary_type === "ANNUAL" ? "연" : p.salary_type === "HOURLY" ? "시급" : p.salary_type === "DAILY" ? "일급" : "월"} ` +
      `${(p.salary_type === "HOURLY" || p.salary_type === "DAILY")
        ? `${Number(p.salary_min).toLocaleString()}원`
        : `${Math.round(Number(p.salary_min) / 10000).toLocaleString()}만원`} 이상`
    : null;

  const 자료: 이력자료 = {
    이름: u.name,
    한줄소개: p.intro,
    구직유형: u.job_type,
    희망직군: [...(p.skill_areas || []), ...((p.office_job_areas?.length ? p.office_job_areas : u.office_job_areas) || [])],
    스킬: p.skills || [],
    자격증: (certs.rows || []).map((c: any) => c.name).filter(Boolean),
    어학: langs.rows || [],
    신입: !!p.is_entry_level,
    경력: (careers.rows || []).map((c: any) => ({
      // 가려 둔 매장은 모델에게도 이름을 주지 않는다 — 초안에 적히면 그대로 나간다.
      company: c.company_public === false ? null : c.company,
      department: c.department, position: c.position,
      startDate: c.start_date ? String(c.start_date).slice(0, 7) : null,
      endDate: c.end_date ? String(c.end_date).slice(0, 7) : null,
      description: c.description,
    })),
    희망근무지: Array.isArray(u.preferred_regions) && u.preferred_regions.length
      ? u.preferred_regions.map((r: any) => shortenRegion([r?.sido, r?.sigungu].filter(Boolean).join(" "))).filter(Boolean).join(", ")
      : null,
    희망급여: 급여,
    공고,
  };

  try {
    const 글 = await 자소서짓기(자료);
    if (!글) return err("AI_EMPTY", "초안을 만들지 못했어요. 잠시 후 다시 눌러 주세요.", 502);
    await pool.query(
      `INSERT INTO ai_usage (user_id, day, kind, count) VALUES ($1, CURRENT_DATE, 'cover_letter', 1)
       ON CONFLICT (user_id, day, kind) DO UPDATE SET count = ai_usage.count + 1`, [userId]
    );
    return ok({ text: 글, left: Math.max(0, 하루한도.cover_letter - 쓴횟수 - 1) });
  } catch (e: any) {
    console.error("[ai cover-letter]", e?.message || e);
    return err("AI_FAIL", "초안을 만들지 못했어요. 잠시 후 다시 눌러 주세요.", 502);
  }
}
