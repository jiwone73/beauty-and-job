export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifyAccessToken } from '@/lib/jwt'

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

    await pool.query(
      `INSERT INTO site_visits (visitor_key, visit_date, user_id)
       VALUES ($1, (now() AT TIME ZONE 'Asia/Seoul')::date, $2::uuid)
       ON CONFLICT (visitor_key, visit_date)
       DO UPDATE SET user_id = COALESCE(EXCLUDED.user_id, site_visits.user_id), last_visit_at = now()`,
      [vid, userId]
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
