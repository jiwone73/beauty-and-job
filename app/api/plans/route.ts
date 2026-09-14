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
    const { rows } = await pool.query(`SELECT value FROM app_settings WHERE key = 'plan_sales'`);
    return ok({ sales: rows[0]?.value === "on" });
  } catch {
    // 스위치를 못 읽으면 닫힌 것으로 본다 — 팔 수 없는 상태로 여는 쪽이 안전하다.
    return ok({ sales: false });
  }
}
