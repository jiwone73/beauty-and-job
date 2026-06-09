export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, requireAuth } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  await pool.query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND company_id = $2`,
    [params.id, auth!.sub]
  );
  return ok({ updated: true });
}
// 개별 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;
  await pool.query(
    `DELETE FROM notifications WHERE id = $1 AND company_id = $2`,
    [params.id, auth!.sub]
  );
  return ok({ deleted: true });
}
