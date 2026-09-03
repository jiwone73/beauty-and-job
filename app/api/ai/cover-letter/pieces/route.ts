export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, requireAuth } from "@/lib/api";

// 초안 창이 「내 이력서에서 가져온 것」으로 보여 줄 조각들.
// 무엇으로 글을 쓰는지 눈에 보여야, 빼고 싶은 것을 끌 수 있다.
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;
  const userId = auth!.sub;

  const [me, prof, careers, certs] = await Promise.all([
    pool.query(`SELECT job_type, office_job_areas FROM users WHERE id = $1`, [userId]),
    pool.query(`SELECT intro, skills, skill_areas, office_job_areas FROM user_profiles WHERE user_id = $1`, [userId]),
    pool.query(`SELECT company, position, start_date, end_date, company_public FROM user_careers WHERE user_id = $1 ORDER BY start_date DESC LIMIT 3`, [userId]),
    pool.query(`SELECT name FROM user_certificates WHERE user_id = $1 LIMIT 4`, [userId]),
  ]);
  const u = me.rows[0] || {};
  const p = prof.rows[0] || {};

  const 조각: string[] = [];
  if (String(p.intro || "").trim()) 조각.push(p.intro.trim());
  for (const v of [...(p.skill_areas || []), ...((p.office_job_areas?.length ? p.office_job_areas : u.office_job_areas) || [])]) 조각.push(v);
  for (const v of p.skills || []) 조각.push(v);
  for (const c of careers.rows) {
    // 가려 둔 매장은 이름 대신 직책만 — 창에서도 이름이 보이면 안 된다.
    const 이름 = c.company_public === false ? null : c.company;
    const 조각글 = [이름, c.position].filter(Boolean).join(" ");
    if (조각글) 조각.push(조각글);
  }
  for (const c of certs.rows) if (c.name) 조각.push(c.name);

  return ok({ items: Array.from(new Set(조각)).slice(0, 12) });
}
