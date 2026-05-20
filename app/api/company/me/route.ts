export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, requireAuth } from '@/lib/api'

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'company')
  if (authErr) return authErr

  const result = await pool.query(
    `SELECT id, company_name, brand_name, business_number, company_type,
            email, phone, logo_url, description, website_url, address,
            status, created_at
     FROM companies WHERE id = $1`,
    [auth!.sub]
  )

  if (result.rowCount === 0) {
    return ok(null, 404)
  }

  return ok(result.rows[0])
}
