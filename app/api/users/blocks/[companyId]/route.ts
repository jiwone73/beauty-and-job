export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 기업 차단 해제
export async function DELETE(req: NextRequest, { params }: { params: { companyId: string } }) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  try {
    await pool.query(
      `DELETE FROM user_company_blocks WHERE user_id = $1 AND company_id = $2`,
      [auth!.sub, params.companyId]
    );
    return ok({ blocked: false });
  } catch (e: any) {
    console.error("[blocks DELETE]", e);
    return err("BLOCK_004", "차단 해제 실패: " + e.message, 500);
  }
}