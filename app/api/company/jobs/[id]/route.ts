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
  const allowedFields = [
    "title", "description", "requirements", "preferred_qualifications",
    "salary_min", "salary_max", "salary_type",
    "location", "address", "work_type", "experience_level",
    "deadline", "status",
  ];

  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = $${idx++}`);
      values.push(body[field]);
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