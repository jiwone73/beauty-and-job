export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'
import { supabaseAdmin } from '@/lib/supabase'
const LICENSE_BUCKET = "business-licenses";
// 기업회원 목록 조회 (공고수 + 최근 공고 + 사업자등록증 서명URL 포함)
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT
        c.id, c.company_name, c.brand_name, c.business_number,
        c.company_type, c.email::text AS email, c.phone,
        c.logo_url, c.cover_images, c.description, c.website_url, c.address,
        c.company_size, c.founded_year, c.region_sido, c.region_sigungu,
        c.status, c.business_license_path, c.created_at,
        COALESCE(j.cnt, 0) AS job_count,
        COALESCE(j.jobs, '[]'::json) AS jobs
      FROM companies c
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt,
          json_agg(json_build_object(
            'id', jp.id, 'title', jp.title, 'status', jp.status, 'created_at', jp.created_at
          ) ORDER BY jp.created_at DESC) AS jobs
        FROM job_postings jp WHERE jp.company_id = c.id
      ) j ON true
      ORDER BY c.created_at DESC
    `)
    // 사업자등록증은 비공개 버킷 → 30분짜리 서명 URL 생성
    const items = await Promise.all(
      result.rows.map(async (row) => {
        let business_license_url: string | null = null
        if (row.business_license_path) {
          const { data } = await supabaseAdmin.storage
            .from(LICENSE_BUCKET)
            .createSignedUrl(row.business_license_path, 60 * 30)
          business_license_url = data?.signedUrl ?? null
        }
        const { business_license_path, ...rest } = row
        return { ...rest, business_license_url }
      })
    )
    return ok({ items })
  } finally {
    client.release()
  }
}
// 기업 상태 변경 (승인/반려/정지)
export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr
  const { id, status } = await req.json()
  if (!id || !status) return err('BAD_REQUEST', 'id, status 필요', 400)
  if (!['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'].includes(status))
    return err('BAD_REQUEST', '잘못된 status', 400)
  const client = await pool.connect()
  try {
    await client.query(`UPDATE companies SET status = $1::company_status, updated_at = now() WHERE id = $2`, [status, id])
    return ok({ success: true })
  } finally {
    client.release()
  }
}
// 기업 삭제
export async function DELETE(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return err('BAD_REQUEST', 'id 필요', 400)
  const client = await pool.connect()
  try {
    // 기업의 공고에 달린 지원 → 공고 → 기업 순으로 삭제
    await client.query(`DELETE FROM applications WHERE job_posting_id IN (SELECT id FROM job_postings WHERE company_id = $1)`, [id])
    await client.query(`DELETE FROM job_postings WHERE company_id = $1`, [id])
    await client.query(`DELETE FROM companies WHERE id = $1`, [id])
    return ok({ success: true })
  } finally {
    client.release()
  }
}