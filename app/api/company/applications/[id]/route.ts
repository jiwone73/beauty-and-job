export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 지원자 단건 조회 (상세)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;
  const result = await pool.query(
    `SELECT a.id, a.status, a.applied_at, a.viewed_at, a.cover_letter, a.note,
            a.user_id, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
            u.job_type AS user_job_type, u.portfolio_url, u.portfolio_filename,
            u.avatar_url AS user_avatar_url,
            a.job_posting_id, jp.title AS job_title
     FROM applications a
     JOIN users u ON u.id = a.user_id
     JOIN job_postings jp ON jp.id = a.job_posting_id
     WHERE a.id = $1 AND jp.company_id = $2`,
    [params.id, auth!.sub]
  );
  if (result.rowCount === 0) {
    return err("APP_002", "지원 내역을 찾을 수 없습니다.", 404);
  }
  // 처음 조회 시 viewed_at 자동 기록
  if (!result.rows[0].viewed_at) {
    pool.query(
      `UPDATE applications SET viewed_at = NOW() WHERE id = $1`,
      [params.id]
    ).catch((e) => console.error("[viewed_at update]", e));
  }
  return ok(result.rows[0]);
}

// 지원자 상태/메모 수정
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));

  // 수정 가능한 필드 (whitelist)
  const allowedFields = ["status", "note"];
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

  updates.push(`updated_at = NOW()`);
  values.push(params.id, auth!.sub);

  // 권한 체크: 본인 회사 공고에 지원한 사람만 수정 가능
  const query = `
    UPDATE applications a
    SET ${updates.join(", ")}
    FROM job_postings jp
    WHERE a.id = $${idx++}
      AND a.job_posting_id = jp.id
      AND jp.company_id = $${idx++}
    RETURNING a.id, a.status, a.note, a.updated_at
  `;

  const result = await pool.query(query, values);

  if (result.rowCount === 0) {
    return err("APP_002", "지원 내역을 찾을 수 없거나 권한이 없습니다.", 404);
  }
  return ok(result.rows[0]);
}