export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 지원서 사본의 임시저장. 계정 하나로 폰이든 PC든 이어 쓸 수 있어야 하므로
// 브라우저가 아니라 서버(사람 + 공고 키)에 둔다.

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;
  const r = await pool.query(
    `SELECT resume, cover_letter, updated_at FROM application_drafts WHERE user_id = $1 AND job_posting_id = $2`,
    [auth!.sub, params.id]
  );
  if (r.rowCount === 0) return ok({ draft: null });
  return ok({ draft: r.rows[0] });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;
  const body = await req.json().catch(() => ({}));
  const { resume, cover_letter } = body;
  if (!resume) return err("DRAFT_001", "이력서 내용이 없습니다.", 400);
  await pool.query(
    `INSERT INTO application_drafts (user_id, job_posting_id, resume, cover_letter, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, job_posting_id) DO UPDATE SET
       resume = EXCLUDED.resume, cover_letter = EXCLUDED.cover_letter, updated_at = NOW()`,
    [auth!.sub, params.id, JSON.stringify(resume), cover_letter || null]
  );
  return ok({ saved: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;
  await pool.query(`DELETE FROM application_drafts WHERE user_id = $1 AND job_posting_id = $2`, [auth!.sub, params.id]);
  return ok({ deleted: true });
}
