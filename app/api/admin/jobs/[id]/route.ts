export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 공고 단건 조회 (관리자 편집용 — 기업 정보 포함)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const result = await pool.query(
    `SELECT
       jp.*,
       c.company_name, c.brand_name,
       c.description AS company_description,
       c.website_url,
       c.address AS company_address,
       c.region_sido AS company_region_sido,
       c.region_sigungu AS company_region_sigungu,
       c.industry AS company_industry,
       c.company_size, c.founded_year,
       c.representative_name, c.company_phone,
       c.logo_url, c.cover_images, c.is_member
     FROM job_postings jp
     LEFT JOIN companies c ON c.id = jp.company_id
     WHERE jp.id = $1`,
    [params.id]
  );

  if (result.rowCount === 0) {
    return err("JOB_001", "공고를 찾을 수 없습니다.", 404);
  }

  const j = result.rows[0];
  return ok({
    ...j,
    company: {
      company_name: j.company_name || "",
      brand_name: j.brand_name || "",
      description: j.company_description || "",
      website_url: j.website_url || "",
      address: j.company_address || "",
      region_sido: j.company_region_sido || "",
      region_sigungu: j.company_region_sigungu || "",
      industry: j.company_industry || "",
      company_size: j.company_size || "",
      founded_year: j.founded_year || "",
      representative_name: j.representative_name || "",
      company_phone: j.company_phone || "",
      logo_url: j.logo_url || null,
      cover_images: j.cover_images || [],
      is_member: j.is_member === true,
    },
  });
}

// 공고 수정 (관리자 — 상태 변경 포함, 비회원 기업 정보도 함께 갱신)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));

  // 수정 가능한 필드 화이트리스트 (문자열 인젝션 방지)
  const allowedFields = [
    "title", "job_type", "job_category_id",
    "description", "requirements", "preferred_qualifications",
    "benefits", "employment_type", "benefit_tags",
    "salary_min", "salary_max", "salary_type",
    "location", "address", "work_type", "experience_level",
    "deadline", "status", "categories", "detail_images",
    "hiring_process", "notes",
    "work_days", "work_time", "work_time_slots", "work_period",
    "responsibilities", "headcount", "education", "source_url",
    "salary_text", "headcount_text", "gender_preference", "positions", "work_locations",
    "apply_method", "external_apply_url",
    "external_contact_name", "external_contact_phone", "external_contact_email",
    "external_contact_kakao",
    "contact_methods",
  ];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;
    const jsonbFields = ["detail_images", "hiring_process", "positions", "work_locations"];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        values.push(jsonbFields.includes(field) ? JSON.stringify(body[field]) : body[field]);
      }
    }

    if (updates.length === 0) {
      await client.query("ROLLBACK");
      return err("VALIDATION_001", "수정할 항목이 없습니다.", 400);
    }

    if (body.status === "CLOSED") updates.push(`closed_at = NOW()`);
    updates.push(`updated_at = NOW()`);
    values.push(params.id);

    const result = await client.query(
      `UPDATE job_postings SET ${updates.join(", ")} WHERE id = $${idx} RETURNING id, company_id, title, status, created_at`,
      values
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return err("JOB_001", "공고를 찾을 수 없습니다.", 404);
    }

    // 비회원(외부) 공고: 연결된 기업 레코드의 기본 정보도 함께 갱신
    const companyId = result.rows[0].company_id;
    const nm = body.new_company;
    if (companyId && nm && typeof nm === "object") {
      const memberRes = await client.query(
        `SELECT is_member FROM companies WHERE id = $1`,
        [companyId]
      );
      if (memberRes.rows[0]?.is_member === false) {
        const nmFoundedYear = nm.founded_year ? (parseInt(String(nm.founded_year), 10) || null) : null;
        await client.query(
          `UPDATE companies SET
             company_name = COALESCE(NULLIF($2, ''), company_name),
             brand_name = $3,
             website_url = $4,
             description = $5,
             address = $6,
             industry = $7,
             company_size = $8,
             founded_year = $9,
             representative_name = $10,
             company_phone = $11,
             updated_at = now()
           WHERE id = $1`,
          [
            companyId,
            (nm.company_name || "").trim(),
            (nm.brand_name || "").trim() || null,
            (nm.homepage_url || "").trim() || null,
            (nm.description || "").trim() || null,
            (nm.address || "").trim() || null,
            (nm.industry || "").trim() || null,
            (nm.company_size || "").trim() || null,
            nmFoundedYear,
            (nm.representative_name || "").trim() || null,
            (nm.company_phone || "").replace(/\D/g, "") || null,
          ]
        );
      }
    }

    await client.query("COMMIT");
    return ok(result.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// 공고 삭제 (관리자)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM applications WHERE job_posting_id = $1`, [params.id]);
    const result = await client.query(
      `DELETE FROM job_postings WHERE id = $1 RETURNING id`,
      [params.id]
    );
    if (result.rowCount === 0) return err("JOB_001", "공고를 찾을 수 없습니다.", 404);
    return ok({ deleted: true });
  } finally {
    client.release();
  }
}
