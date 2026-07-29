export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 비회원(외부) 기업 목록 — 공고수·지원수·연결(회원전환) 여부 포함
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        ec.id, ec.name, ec.logo_url, ec.homepage_url, ec.contact_email,
        ec.source_site, ec.source_url, ec.claimed_company_id, ec.created_at,
        cc.company_name AS claimed_company_name,
        COALESCE(j.cnt, 0) AS job_count,
        COALESCE(j.jobs, '[]'::json) AS jobs,
        COALESCE(ap.app_cnt, 0) AS application_count,
        COALESCE(ap.pending_cnt, 0) AS pending_count
      FROM external_companies ec
      LEFT JOIN companies cc ON cc.id = ec.claimed_company_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt,
          json_agg(json_build_object(
            'id', jp.id, 'title', jp.title, 'status', jp.status, 'created_at', jp.created_at
          ) ORDER BY jp.created_at DESC) AS jobs
        FROM job_postings jp WHERE jp.external_company_id = ec.id
      ) j ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(a.id) AS app_cnt,
          COUNT(a.id) FILTER (WHERE a.delivery_status = 'PENDING') AS pending_cnt
        FROM applications a
        JOIN job_postings jp2 ON jp2.id = a.job_posting_id
        WHERE jp2.external_company_id = ec.id
      ) ap ON true
      ORDER BY ec.created_at DESC
    `);
    return ok({ items: result.rows });
  } finally {
    client.release();
  }
}

// 비회원 기업 정보 수정 (기업명·홈페이지·연락처·로고)
export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const b = await req.json().catch(() => ({}));
  const id = (b.id || "").trim();
  if (!id) return err("VALIDATION_001", "id가 필요합니다.", 400);
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (b.name !== undefined && !name) return err("VALIDATION_001", "기업명은 비울 수 없습니다.", 400);

  const client = await pool.connect();
  try {
    const r = await client.query(
      `UPDATE external_companies SET
         name          = COALESCE($2, name),
         homepage_url  = $3,
         contact_email = $4,
         logo_url      = $5,
         updated_at    = now()
       WHERE id = $1
       RETURNING id`,
      [
        id,
        b.name !== undefined ? name : null,
        typeof b.homepage_url === "string" ? b.homepage_url.trim() || null : null,
        typeof b.contact_email === "string" ? b.contact_email.trim() || null : null,
        typeof b.logo_url === "string" ? b.logo_url.trim() || null : null,
      ]
    );
    if (r.rowCount === 0) return err("NOT_FOUND", "외부 기업을 찾을 수 없습니다.", 404);
    return ok({ success: true });
  } finally {
    client.release();
  }
}

// 비회원 기업 삭제 (연결된 공고가 없을 때만)
export async function DELETE(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const id = (new URL(req.url).searchParams.get("id") || "").trim();
  if (!id) return err("VALIDATION_001", "id가 필요합니다.", 400);
  const client = await pool.connect();
  try {
    const cnt = await client.query(
      `SELECT COUNT(*)::int AS n FROM job_postings WHERE external_company_id = $1`,
      [id]
    );
    if ((cnt.rows[0]?.n || 0) > 0) {
      return err("VALIDATION_002", "이 기업에 연결된 공고가 있어요. 공고를 먼저 삭제하거나 다른 기업으로 옮긴 뒤 삭제하세요.", 409);
    }
    await client.query(`DELETE FROM external_companies WHERE id = $1`, [id]);
    return ok({ success: true });
  } finally {
    client.release();
  }
}
