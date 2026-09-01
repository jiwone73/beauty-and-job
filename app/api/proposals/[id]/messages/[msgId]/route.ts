export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 면접 약속에 답한다. 제안한 쪽은 못 누르고 받은 쪽만 누른다 — 혼자 잡고
// 혼자 수락하면 약속이 아니다.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; msgId: string } }
) {
  const { auth, res } = requireAuth(req);
  if (res) return res;
  try {
    const b = await req.json().catch(() => ({}));
    const 답 = b?.status === "ACCEPTED" ? "ACCEPTED" : b?.status === "DECLINED" ? "DECLINED" : null;
    if (!답) return err("PROP_MSG_003", "수락 또는 거절만 됩니다.", 400);

    const { rows } = await pool.query(
      `SELECT m.sender, p.company_id, p.user_id
         FROM proposal_messages m JOIN proposals p ON p.id = m.proposal_id
        WHERE m.id = $1 AND m.proposal_id = $2 AND m.kind = 'APPOINTMENT'`,
      [params.msgId, params.id]
    );
    if (!rows.length) return err("PROP_MSG_001", "약속을 찾을 수 없습니다.", 404);

    const r = rows[0];
    const 나 = auth!.owner_type === "user" && r.user_id === auth!.sub ? "USER"
      : auth!.owner_type === "company" && r.company_id === auth!.sub ? "COMPANY" : null;
    if (!나) return err("PROP_MSG_001", "약속을 찾을 수 없습니다.", 404);
    if (나 === r.sender) return err("PROP_MSG_004", "내가 제안한 약속이에요.", 400);

    await pool.query(
      `UPDATE proposal_messages SET appointment_status = $1
        WHERE id = $2 AND appointment_status = 'PROPOSED'`,
      [답, params.msgId]
    );
    await pool.query(`UPDATE proposals SET last_message_at = NOW() WHERE id = $1`, [params.id]).catch(() => {});
    return ok({ status: 답 });
  } catch (e: any) {
    console.error("[appointment PATCH]", e);
    return err("PROP_MSG_002", "처리하지 못했습니다.", 500);
  }
}
