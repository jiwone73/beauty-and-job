export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 제안 거절. 구직자만 건다.
//
// 지금까지 할 수 있는 건 「치우기」(hidden_at)뿐이었는데 그건 내 화면에서만
// 사라지는 것이라, 기업 쪽에는 계속 「읽음 · 답변 대기」로 남아 상대를 기다리게
// 뒀다. 거절은 상대에게 전해져야 한다. 목록에서도 같이 내린다.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, res } = requireAuth(req, "user");
  if (res) return res;
  const body = await req.json().catch(() => ({}));
  try {
    const { rowCount, rows } = await pool.query(
      `UPDATE proposals
          SET declined_at = COALESCE(declined_at, NOW()), hidden_at = COALESCE(hidden_at, NOW())
        WHERE id = $1 AND user_id = $2
        RETURNING company_id,
                  (SELECT COALESCE(brand_name, company_name) FROM companies WHERE id = company_id) AS co_name`,
      [params.id, auth!.sub]
    );
    if (!rowCount) return err("PROP_DEC_001", "제안을 찾을 수 없습니다.", 404);

    // 거절하는 순간이 「이 매장은 다시 안 받을래」를 정하는 순간이다. 따로 두면
    // 아무도 찾아가지 않는다.
    if (body?.block) {
      const r = rows[0];
      await pool.query(
        `INSERT INTO user_company_blocks (user_id, company_id, company_name, blocked_by)
         SELECT $1, $2, $3, 'USER'
          WHERE NOT EXISTS (
            SELECT 1 FROM user_company_blocks WHERE user_id = $1 AND company_id = $2)`,
        [auth!.sub, r.company_id, r.co_name || ""]
      );
    }
    return ok({ declined: true, blocked: !!body?.block });
  } catch (e: any) {
    console.error("[proposal decline]", e);
    return err("PROP_DEC_002", "거절하지 못했습니다.", 500);
  }
}
