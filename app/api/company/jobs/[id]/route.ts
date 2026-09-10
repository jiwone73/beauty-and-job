export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 공고 단건 조회
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const result = await pool.query(
    `SELECT * FROM job_postings WHERE id = $1 AND company_id = $2`,
    [params.id, auth!.sub]
  );

  if (result.rowCount === 0) {
    return err("JOB_001", "공고를 찾을 수 없습니다.", 404);
  }
  return ok(result.rows[0]);
}

// 공고 수정 (상태 변경 포함)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));

  // 수정 가능한 필드 목록 (whitelist 방식 - 보안)
  //
  // 폼이 보내는 값은 하나도 빠짐없이 여기 있어야 한다. 빠진 칸은 저장이 조용히
  // 무시되고, 그러면 미리보기에는 새 값이 공고에는 옛 값이 남는다 — 폼 = 미리보기 =
  // 실제공고가 그 자리에서 깨진다. 등록(POST)이 넣는 칸과 같은 목록을 쓴다.
  const allowedFields = [
    "title", "job_type", "description", "requirements", "preferred_qualifications",
    "benefits", "employment_type", "benefit_tags", "salary_min", "salary_max", "salary_type",
    "salary_text",
    "location", "address", "work_locations", "work_type", "experience_level",
    "deadline", "status", "categories", "detail_images",
    "hiring_process",
    "work_days", "work_time", "work_time_slots", "work_period",
    "headcount", "headcount_text", "contact_methods", "responsibilities", "education",
    "gender_preference", "positions",
    "cover_images", "source_url",
    // 지원방법 — 「뷰티워크 온라인지원」이냐 바깥 주소냐.
    "apply_method", "external_apply_url",
    // 접수담당자
    "external_contact_name", "external_contact_phone", "external_contact_email",
    "external_contact_kakao",
    // 칸마다 가릴지 — 적어는 두되 구직자에게 보일지는 따로 고른다.
    "contact_name_hidden", "contact_phone_hidden", "contact_email_hidden", "contact_kakao_hidden",
  ];

  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;
  const jsonbFields = ["detail_images", "hiring_process", "positions", "work_locations", "cover_images"];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = $${idx++}`);
      // null 은 그대로 NULL 로 넣는다. JSON.stringify(null) 은 "null" 이라
      // 「값 없음」이 아니라 JSON null 이 저장돼 읽는 쪽이 갈린다.
      values.push(jsonbFields.includes(field) && body[field] !== null
        ? JSON.stringify(body[field]) : body[field]);
    }
  }

  if (updates.length === 0) {
    return err("VALIDATION_001", "수정할 항목이 없습니다.", 400);
  }

  // 상태가 CLOSED로 변경되면 closed_at 자동 설정
  if (body.status === "CLOSED") {
    updates.push(`closed_at = NOW()`);
  }
  updates.push(`updated_at = NOW()`);

  values.push(params.id, auth!.sub);
  const query = `
    UPDATE job_postings
    SET ${updates.join(", ")}
    WHERE id = $${idx++} AND company_id = $${idx++}
    RETURNING *
  `;

  const result = await pool.query(query, values);

  if (result.rowCount === 0) {
    return err("JOB_001", "공고를 찾을 수 없거나 권한이 없습니다.", 404);
  }
  return ok(result.rows[0]);
}

// 공고 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const result = await pool.query(
    `DELETE FROM job_postings WHERE id = $1 AND company_id = $2 RETURNING id`,
    [params.id, auth!.sub]
  );

  if (result.rowCount === 0) {
    return err("JOB_001", "공고를 찾을 수 없거나 권한이 없습니다.", 404);
  }
  return ok({ deleted: true });
}