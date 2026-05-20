import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, TokenPayload } from './jwt'

export function ok(data: unknown, status = 200, meta?: object) {
  const body: any = { success: true, data }
  if (meta) body.meta = meta
  return NextResponse.json(body, { status })
}

export function err(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status })
}

export function getAuth(req: NextRequest): TokenPayload | null {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return null
    return verifyAccessToken(token)
  } catch {
    return null
  }
}

export function requireAuth(req: NextRequest, ownerType?: string) {
  const auth = getAuth(req)
  if (!auth) return { auth: null, res: err('AUTH_001', '인증이 필요합니다.', 401) }
  if (ownerType && auth.owner_type !== ownerType)
    return { auth: null, res: err('AUTH_002', '권한이 없습니다.', 403) }
  return { auth, res: null }
}
