export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 제안 열어봄 표시. 기업 쪽 성과(제안→열람)가 여기서 나온다.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;
  try {
    const { rowCount } = await pool.query(
      `UPDATE proposals SET read_at = NOW()
       WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
      [params.id, auth!.sub]
    );
    return ok({ read: true, updated: rowCount });
  } catch (e: any) {
    console.error("[proposal PATCH]", e);
    return err("PROPOSAL_003", "처리에 실패했습니다.", 500);
  }
}

// 목록에서 치우기. 기업에는 알리지 않는다 — 거절 통보는 좁은 업계에서
// 서로에게 부담이고, 기업이 할 수 있는 일도 없다. 열람 여부까지만 보여준다.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;
  try {
    await pool.query(
      `UPDATE proposals SET hidden_at = NOW() WHERE id = $1 AND user_id = $2`,
      [params.id, auth!.sub]
    );
    return ok({ hidden: true });
  } catch (e: any) {
    console.error("[proposal DELETE]", e);
    return err("PROPOSAL_004", "처리에 실패했습니다.", 500);
  }
}
