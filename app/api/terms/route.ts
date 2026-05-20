export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok } from '@/lib/api'

export async function GET(req: NextRequest) {
  const result = await pool.query(
    `SELECT id, type, version, title, is_required, is_active
     FROM terms WHERE is_active = true
     ORDER BY is_required DESC, type`
  )
  return ok(result.rows)
}
