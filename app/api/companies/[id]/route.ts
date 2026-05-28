export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'

// 브랜드(기업) 공개 상세 — 회사정보 + 채용 중 공고
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  if (!id) return err('COMPANY_002', '회사 ID가 없습니다.', 400)

  try {
    // 회사 기본 정보 (공개 필드만)
    const companyRes = await pool.query(
      `SELECT id, company_name, brand_name, logo_url, description,
              website_url, address, company_type, created_at
       FROM companies
       WHERE id = $1`,
      [id]
    )
    if (companyRes.rowCount === 0) {
      return err('COMPANY_004', '회사를 찾을 수 없습니다.', 404)
    }
    const company = companyRes.rows[0]

    // 해당 회사의 활성 공고 (기존 v_active_jobs 재활용)
    const jobsRes = await pool.query(
      `SELECT id, title, job_type, company_id, company_name, brand_name, logo_url, company_type,
              location, work_type, salary_min, salary_max, salary_type,
              is_featured, deadline, created_at
       FROM v_active_jobs
       WHERE company_id = $1
       ORDER BY is_featured DESC, created_at DESC`,
      [id]
    )

    return ok({ company, jobs: jobsRes.rows })
  } catch (e: any) {
    console.error('[company detail]', e)
    return err('COMPANY_001', '회사 정보 조회 실패: ' + e.message, 500)
  }
}