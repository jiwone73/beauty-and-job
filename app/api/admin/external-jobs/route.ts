export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 외부 공고 목록
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const rows = await pool.query(
    `SELECT jp.id, jp.title, jp.job_type, jp.status, jp.apply_method,
            jp.external_apply_url, jp.external_contact_email, jp.deadline, jp.created_at,
            ec.id AS external_company_id, ec.name AS company_name, ec.homepage_url,
            ec.claimed_company_id,
            (SELECT COUNT(*)::int FROM applications a WHERE a.job_posting_id = jp.id) AS application_count,
            (SELECT COUNT(*)::int FROM applications a WHERE a.job_posting_id = jp.id AND a.delivery_status = 'PENDING') AS pending_count
     FROM job_postings jp
     LEFT JOIN external_companies ec ON ec.id = jp.external_company_id
     WHERE jp.source = 'EXTERNAL'
     ORDER BY jp.created_at DESC
     LIMIT 200`
  );
  return ok(rows.rows);
}

// 외부 공고 등록 (외부 기업 + 공고 동시 생성)
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const b = await req.json().catch(() => ({}));
  const company_name = (b.company_name || "").trim();
  const title = (b.title || "").trim();
  const job_type = b.job_type === "OFFICE" ? "OFFICE" : "STORE";
  const apply_method = ["REDIRECT", "EMAIL", "MANAGED"].includes(b.apply_method) ? b.apply_method : "MANAGED";
  const external_apply_url = (b.external_apply_url || "").trim() || null;
  const contact_email = (b.contact_email || "").trim().toLowerCase() || null;

  if (!company_name) return err("VALIDATION_001", "기업명을 입력해주세요.", 400);
  if (!title) return err("VALIDATION_001", "공고 제목을 입력해주세요.", 400);
  if (apply_method === "REDIRECT" && !external_apply_url)
    return err("VALIDATION_001", "링크형은 외부 지원 URL이 필요합니다.", 400);
  if (apply_method === "EMAIL" && !contact_email)
    return err("VALIDATION_001", "이메일 중계형은 채용 이메일이 필요합니다.", 400);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 외부 기업: 홈페이지 or 이름으로 재사용, 없으면 생성
    const homepage = (b.homepage_url || "").trim() || null;
    let ecId: string | null = null;
    const found = await client.query(
      `SELECT id FROM external_companies
       WHERE ($1::text IS NOT NULL AND homepage_url = $1) OR (lower(name) = lower($2))
       ORDER BY (homepage_url = $1) DESC LIMIT 1`,
      [homepage, company_name]
    );
    if ((found.rowCount ?? 0) > 0) {
      ecId = found.rows[0].id;
      await client.query(
        `UPDATE external_companies SET
           logo_url = COALESCE($2, logo_url),
           homepage_url = COALESCE($3, homepage_url),
           contact_email = COALESCE($4, contact_email),
           source_site = COALESCE($5, source_site),
           source_url = COALESCE($6, source_url),
           updated_at = now()
         WHERE id = $1`,
        [ecId, (b.logo_url || "").trim() || null, homepage, contact_email, (b.source_site || "").trim() || null, (b.source_url || "").trim() || null]
      );
    } else {
      const ins = await client.query(
        `INSERT INTO external_companies (name, logo_url, homepage_url, contact_email, source_site, source_url)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [company_name, (b.logo_url || "").trim() || null, homepage, contact_email, (b.source_site || "").trim() || null, (b.source_url || "").trim() || null]
      );
      ecId = ins.rows[0].id;
    }

    const jobIns = await client.query(
      `INSERT INTO job_postings
         (company_id, source, external_company_id, apply_method, external_apply_url, external_contact_email,
          title, job_type, categories, location, address, description, deadline, experience_level, status)
       VALUES (NULL, 'EXTERNAL', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ANY', 'ACTIVE')
       RETURNING id, title, created_at`,
      [
        ecId, apply_method, external_apply_url, contact_email,
        title, job_type, b.categories || [], (b.location || "").trim() || null,
        (b.address || "").trim() || null, (b.description || "").trim() || null,
        b.deadline || null,
      ]
    );

    await client.query("COMMIT");
    return ok({ id: jobIns.rows[0].id, external_company_id: ecId }, 201);
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error("[external-jobs POST]", e);
    return err("SERVER_001", "등록 중 오류가 발생했습니다.", 500);
  } finally {
    client.release();
  }
}
