export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 대화방 차단. 어느 쪽이 걸든 효과는 같다 — 서로 보이지 않고 말도 오가지 않는다.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, res } = requireAuth(req);
  if (res) return res;
  try {
    const { rows } = await pool.query(
      `SELECT p.company_id, p.user_id,
              (SELECT COALESCE(brand_name, company_name) FROM companies WHERE id = p.company_id) AS co_name
         FROM proposals p WHERE p.id = $1`,
      [params.id]
    );
    if (!rows.length) return err("PROP_BLK_001", "대화를 찾을 수 없습니다.", 404);
    const r = rows[0];
    const 나 = auth!.owner_type === "user" && r.user_id === auth!.sub ? "USER"
      : auth!.owner_type === "company" && r.company_id === auth!.sub ? "COMPANY" : null;
    if (!나) return err("PROP_BLK_001", "대화를 찾을 수 없습니다.", 404);

    // 이미 걸려 있으면 그대로 둔다 — 누가 먼저 걸었는지가 바뀌면 안 된다.
    await pool.query(
      `INSERT INTO user_company_blocks (user_id, company_id, company_name, blocked_by)
       SELECT $1, $2, $3, $4
        WHERE NOT EXISTS (
          SELECT 1 FROM user_company_blocks WHERE user_id = $1 AND company_id = $2)`,
      [r.user_id, r.company_id, r.co_name || "", 나]
    );
    return ok({ blocked: true }, 201);
  } catch (e: any) {
    console.error("[proposal block]", e);
    return err("PROP_BLK_002", "차단하지 못했습니다.", 500);
  }
}
