export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import { ok, requireAuth } from '@/lib/api'

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr
  return ok({ valid: true })
}