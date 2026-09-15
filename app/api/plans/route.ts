export const dynamic = "force-dynamic";
import pool from "@/lib/db";
import { ok } from "@/lib/api";

/**
 * 지금 이용권을 팔 수 있는가.
 *
 * 통신판매업 신고번호가 나오기 전에는 결제를 열 수 없다. 그동안은 요금제를
 * 보여주되 「시작하기」가 「문의하기」로 바뀐다. 신고번호가 나온 날 관리자가
 * 스위치만 켜면 된다(app_settings.plan_sales).
 */
export async function GET() {
  try {
    const { rows } = await pool.query(
      `SELECT key, value FROM app_settings WHERE key IN ('plan_sales', 'plan_bank', 'plans_open')`
    );
    const v: Record<string, string> = {};
    for (const r of rows) v[r.key] = r.value;
    // 지금 팔 수 있는 상품. 인재 열람을 파는 상품(스탠다드·프리미엄)은 이력서가
    // 쌓이기 전에는 팔 물건이 없다 — 돈을 받고 열었는데 볼 사람이 없으면 그게
    // 첫 환불이다. 이력서가 모이는 동안 「오픈 준비중」으로 세워 둔다.
    const 열림 = (v.plans_open ?? "LIGHT").split(",").map((x) => x.trim()).filter(Boolean);
    return ok({ sales: v.plan_sales === "on", bank: v.plan_bank || "", open: 열림 });
  } catch {
    // 스위치를 못 읽으면 닫힌 것으로 본다 — 팔 수 없는 상태로 여는 쪽이 안전하다.
    return ok({ sales: false, bank: "", open: [] });
  }
}
