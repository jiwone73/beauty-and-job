export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, requireAuth } from '@/lib/api'

/**
 * 회원 유입채널별 성과 — 방문자·가입·이력서·전환율.
 *
 * 「방문자」는 site_visits 의 방문자별 가장 이른 줄(진짜 첫 유입) 하나만
 * 센다 — 같은 사람이 여러 날 다녀가며 채널이 갈라 보여도 두 번 잡히지
 * 않는다. 이 기능을 켜기 전에 가입한 사람은 channel 이 비어 있어 「미확인」
 * 으로 묶인다.
 */
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  try {
    const [visitors, signups, resumes] = await Promise.all([
      pool.query(`
        WITH 첫방문 AS (
          SELECT DISTINCT ON (visitor_key) visitor_key, COALESCE(channel, '미확인') AS channel
          FROM site_visits
          ORDER BY visitor_key, visit_date ASC
        )
        SELECT channel, COUNT(*)::int AS 방문자
        FROM 첫방문
        GROUP BY channel
      `),
      pool.query(`
        SELECT COALESCE(channel, '미확인') AS channel, COUNT(*)::int AS 가입
        FROM (
          SELECT signup_channel AS channel FROM users
          UNION ALL
          SELECT signup_channel AS channel FROM companies
        ) x
        GROUP BY channel
      `),
      pool.query(`
        SELECT COALESCE(u.signup_channel, '미확인') AS channel, COUNT(DISTINCT u.id)::int AS 이력서
        FROM users u
        JOIN resumes r ON r.user_id = u.id
        GROUP BY channel
      `),
    ])

    const 표: Record<string, { channel: string; 방문자: number; 가입: number; 이력서: number }> = {}
    const 칸얻기 = (channel: string) =>
      (표[channel] ??= { channel, 방문자: 0, 가입: 0, 이력서: 0 })
    for (const r of visitors.rows) 칸얻기(r.channel).방문자 = r.방문자
    for (const r of signups.rows) 칸얻기(r.channel).가입 = r.가입
    for (const r of resumes.rows) 칸얻기(r.channel).이력서 = r.이력서

    const rows = Object.values(표)
      .map((r) => ({ ...r, 전환율: r.방문자 > 0 ? Math.round((r.가입 / r.방문자) * 1000) / 10 : 0 }))
      .sort((a, b) => b.방문자 - a.방문자)

    return ok({ rows })
  } catch {
    return ok({ rows: [] })
  }
}
