export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { 이용권, 보관, 무료칸 } from "@/lib/companyEntitlement";
import { 플랜, 스타트 } from "@/lib/companyPlans";

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
    const 세운것 = await 보관(auth!.sub);
    // 무료로 몇 건이 남았는가. 유료 기간 안이면 볼 일이 없지만 같이 보낸다 —
    // 기간이 끝나면 다시 이 숫자가 문이 된다.
    const { 쓴것: 무료쓴것, 남은것: 무료남은것 } = await 무료칸(auth!.sub);
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
      plan, paidUntil, 남은일, 무료건수: 스타트.무료건수, 무료쓴것, 무료남은것,
      진행중: r.진행중,
      노출: Number(r.노출),
      게재종료: r.먼저끝나는게재일,
      // 화면은 이름까지 받아야 「라이트 20일」을 그릴 수 있다.
      보관: Object.entries(세운것).map(([plan, v]) => ({
        plan, name: 플랜[plan as keyof typeof 플랜].name, days: v.days, until: v.until,
      })),
      // 지금 보관할 수 있는가. 걸린 공고가 있으면 아직 채용 중이다.
      보관가능: !!plan && 남은일 > 0 && r.진행중 === 0,
    });
  } catch (e) {
    console.error("[company me plan]", e);
    return err("SERVER_001", "이용권을 불러오지 못했습니다.", 500);
  }
}
