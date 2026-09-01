export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 대화방 신고. 양쪽 다 신고할 수 있어야 해서 owner 를 지정하지 않고
// 받은 뒤에 당사자인지 따진다.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, res } = requireAuth(req);
  if (res) return res;
  try {
    const { rows } = await pool.query(`SELECT company_id, user_id FROM proposals WHERE id = $1`, [params.id]);
    if (!rows.length) return err("PROP_RPT_001", "대화를 찾을 수 없습니다.", 404);
    const r = rows[0];
    const 나 = auth!.owner_type === "user" && r.user_id === auth!.sub ? "USER"
      : auth!.owner_type === "company" && r.company_id === auth!.sub ? "COMPANY" : null;
    if (!나) return err("PROP_RPT_001", "대화를 찾을 수 없습니다.", 404);

    const b = await req.json().catch(() => ({}));
    const 사유 = String(b?.reason || "").trim().slice(0, 500);
    if (!사유) return err("PROP_RPT_002", "신고 사유를 골라주세요.", 400);

    await pool.query(
      `INSERT INTO proposal_reports (proposal_id, reporter, reason) VALUES ($1, $2, $3)`,
      [params.id, 나, 사유]
    );
    return ok({ reported: true }, 201);
  } catch (e: any) {
    console.error("[proposal report]", e);
    return err("PROP_RPT_003", "신고하지 못했습니다.", 500);
  }
}
