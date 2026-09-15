export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { 이용권, 무료남은장 } from "@/lib/companyEntitlement";

/**
 * 내 이용권 — 무엇을 언제까지 쓰는가, 그동안 얼마나 노출됐는가.
 *
 * 노출 횟수를 숨기면 산 사람은 값이 무엇이었는지 끝내 알 수 없다. 메인 채용관은
 * 자리를 파는 상품이라 이 숫자가 곧 영수증이다.
 */
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;
  try {
    const { plan, paidUntil, 남은일 } = await 이용권(auth!.sub);
    // 무료로 몇 번 더 올릴 수 있는가. 소진되는 횟수라, 다 쓰고 나서 막히기 전에
    // 미리 보여야 한다 — 여섯 번째를 누르다 막혀서 알게 되면 늦다.
    const 무료남은 = plan ? null : await 무료남은장(auth!.sub);
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS 진행중,
              COALESCE(SUM(main_impressions), 0)::bigint AS 노출,
              to_char(MIN(listed_until), 'YYYY-MM-DD') AS 먼저끝나는게재일
         FROM job_postings
        WHERE company_id = $1 AND status = 'ACTIVE'
          AND (listed_until IS NULL OR listed_until >= CURRENT_DATE)`,
      [auth!.sub]
    );
    const r = rows[0];
    return ok({
      plan, paidUntil, 남은일, 무료남은,
      진행중: r.진행중,
      노출: Number(r.노출),
      게재종료: r.먼저끝나는게재일,
    });
  } catch (e) {
    console.error("[company me plan]", e);
    return err("SERVER_001", "이용권을 불러오지 못했습니다.", 500);
  }
}
