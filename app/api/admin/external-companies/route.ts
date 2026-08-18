export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 비회원(외부) 기업 = companies.is_member = false.
// 공고 등록 시 /api/admin/jobs 에서 동명 재사용/생성됨. 여기서 목록·수정·삭제를 관리.

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        c.id, c.company_name, c.brand_name, c.email::text AS email, c.phone,
        c.logo_url, c.website_url, c.region_sido, c.region_sigungu, c.address,
        c.merged_into_company_id, c.created_at,
        c.onboarding_status, c.invited_at, c.invite_channel, c.invite_count, c.joined_at, c.linked_at,
        mc.company_name AS merged_into_name,
        COALESCE(j.cnt, 0) AS job_count,
        COALESCE(j.jobs, '[]'::json) AS jobs,
        -- 외부 공고는 연락처가 기업이 아니라 공고에 붙어 온다. 안내 발송용으로 끌어올린다.
        COALESCE(c.phone, j.job_phone) AS contact_phone,
        COALESCE(c.email::text, j.job_email) AS contact_email,
        COALESCE(ap.app_cnt, 0) AS application_count,
        COALESCE(ap.pending_cnt, 0) AS pending_count
      FROM companies c
      LEFT JOIN companies mc ON mc.id = c.merged_into_company_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt,
          json_agg(json_build_object(
            'id', jp.id, 'title', jp.title, 'status', jp.status, 'created_at', jp.created_at,
            'source_url', jp.source_url, 'external_apply_url', jp.external_apply_url,
            'contact_phone', jp.external_contact_phone, 'contact_email', jp.external_contact_email,
            'created_by', jp.created_by
          ) ORDER BY jp.created_at DESC) AS jobs,
          MIN(jp.external_contact_phone) FILTER (WHERE jp.external_contact_phone IS NOT NULL) AS job_phone,
          MIN(jp.external_contact_email) FILTER (WHERE jp.external_contact_email IS NOT NULL) AS job_email
        FROM job_postings jp WHERE jp.company_id = c.id
      ) j ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(a.id)::int AS app_cnt,
          COUNT(a.id) FILTER (WHERE a.delivery_status = 'PENDING')::int AS pending_cnt
        FROM applications a
        JOIN job_postings jp2 ON jp2.id = a.job_posting_id
        WHERE jp2.company_id = c.id
      ) ap ON true
      WHERE c.is_member = false
      ORDER BY c.created_at DESC
    `);
    return ok({ items: result.rows });
  } finally {
    client.release();
  }
}

// 비회원 기업 정보 수정 (기업명·홈페이지·전화)
export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const b = await req.json().catch(() => ({}));
  const id = (b.id || "").trim();
  if (!id) return err("VALIDATION_001", "id가 필요합니다.", 400);
  const name = typeof b.company_name === "string" ? b.company_name.trim() : "";
  if (b.company_name !== undefined && !name) return err("VALIDATION_001", "기업명은 비울 수 없습니다.", 400);

  const client = await pool.connect();
  try {
    const r = await client.query(
      `UPDATE companies SET
         company_name = COALESCE($2, company_name),
         website_url  = $3,
         phone        = $4,
         updated_at   = now()
       WHERE id = $1 AND is_member = false
       RETURNING id`,
      [
        id,
        b.company_name !== undefined ? name : null,
        typeof b.website_url === "string" ? b.website_url.trim() || null : null,
        typeof b.phone === "string" ? b.phone.replace(/[^0-9]/g, "") || null : null,
      ]
    );
    if (r.rowCount === 0) return err("NOT_FOUND", "비회원 기업을 찾을 수 없습니다.", 404);
    return ok({ success: true });
  } finally {
    client.release();
  }
}

// 비회원 기업 삭제 (연결된 공고도 함께 삭제 — 공고중이어도 허용)
export async function DELETE(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const id = (new URL(req.url).searchParams.get("id") || "").trim();
  if (!id) return err("VALIDATION_001", "id가 필요합니다.", 400);
  const client = await pool.connect();
  try {
    const chk = await client.query(`SELECT is_member FROM companies WHERE id = $1`, [id]);
    if (chk.rowCount === 0) return err("NOT_FOUND", "기업을 찾을 수 없습니다.", 404);
    if (chk.rows[0].is_member) return err("VALIDATION_002", "회원 기업은 여기서 삭제할 수 없습니다.", 409);
    try {
      await client.query("BEGIN");
      // 공고에 딸린 참조부터 정리(applications·visibility_upgrades는 NO ACTION, bookmarks는 CASCADE)
      await client.query(
        `DELETE FROM applications WHERE job_posting_id IN (SELECT id FROM job_postings WHERE company_id = $1)`, [id]);
      await client.query(
        `DELETE FROM visibility_upgrades WHERE job_posting_id IN (SELECT id FROM job_postings WHERE company_id = $1)`, [id]);
      const delJobs = await client.query(`DELETE FROM job_postings WHERE company_id = $1`, [id]);
      await client.query(`DELETE FROM companies WHERE id = $1 AND is_member = false`, [id]);
      await client.query("COMMIT");
      return ok({ success: true, deleted_jobs: delJobs.rowCount || 0 });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  } finally {
    client.release();
  }
}
