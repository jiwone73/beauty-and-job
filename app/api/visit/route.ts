export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifyAccessToken } from '@/lib/jwt'
import { 채널구하기 } from '@/lib/channel'

// 방문 로깅 비콘 수신 (실패해도 조용히 무시 — 페이지 영향 없음)
export async function POST(req: NextRequest) {
  try {
    let vid = req.cookies.get('bw_vid')?.value
    let setCookie = false
    if (!vid) { vid = crypto.randomUUID(); setCookie = true }

    let userId: string | null = null
    const token = req.headers.get('authorization')?.replace('Bearer ', '').trim()
    if (token) {
      try {
        const p = verifyAccessToken(token)
        if ((p?.owner_type === 'user' || p?.owner_type === 'company') && p.sub) userId = p.sub
      } catch {}
    }

    // 채널은 그날의 첫 핑(아래 INSERT)에만 쓰인다 — ON CONFLICT 쪽엔 없어서
    // 같은 날 재방문이 값을 덮어쓰지 않는다.
    let body: any = {}
    try { body = await req.json() } catch {}
    const { channel, campaign } = 채널구하기({
      referrer: body?.referrer,
      utmSource: body?.utm_source,
      utmMedium: body?.utm_medium,
      utmCampaign: body?.utm_campaign,
      selfHost: req.headers.get('host'),
    })

    await pool.query(
      `INSERT INTO site_visits (visitor_key, visit_date, user_id, channel, utm_source, utm_medium, utm_campaign)
       VALUES ($1, (now() AT TIME ZONE 'Asia/Seoul')::date, $2::uuid, $3, $4, $5, $6)
       ON CONFLICT (visitor_key, visit_date)
       DO UPDATE SET user_id = COALESCE(EXCLUDED.user_id, site_visits.user_id), last_visit_at = now()`,
      [vid, userId, channel, body?.utm_source || null, body?.utm_medium || null, campaign]
    )

    const res = NextResponse.json({ success: true })
    if (setCookie) {
      res.cookies.set('bw_vid', vid, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/' })
    }
    return res
  } catch {
    return NextResponse.json({ success: false })
  }
}
