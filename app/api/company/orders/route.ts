export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { 이용권 } from "@/lib/companyEntitlement";
import { 값, 플랜, 플랜인가, 기간인가, 등급높이, 준비중 } from "@/lib/companyPlans";

/** 내가 낸 주문. 「내 이용권」 화면이 이걸로 내역을 그린다. */
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;
  try {
    const { rows } = await pool.query(
      `SELECT id, plan, days, amount, status, depositor,
              to_char(applied_from, 'YYYY-MM-DD')  AS applied_from,
              to_char(applied_until, 'YYYY-MM-DD') AS applied_until,
              created_at
         FROM company_orders WHERE company_id = $1
        ORDER BY created_at DESC LIMIT 50`,
      [auth!.sub]
    );
    return ok(rows);
  } catch (e) {
    console.error("[company orders GET]", e);
    return err("SERVER_001", "주문 내역을 불러오지 못했습니다.", 500);
  }
}

/**
 * 이용권 주문.
 *
 * 무통장입금이라 여기서는 「사겠다」는 기록만 남는다. 실제 적용은 관리자가
 * 입금을 확인할 때다. 값은 화면이 보낸 것을 믿지 않고 서버가 다시 계산한다.
 */
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const plan = body?.plan;
  const days = Number(body?.days);
  const depositor = String(body?.depositor || "").trim();
  if (!플랜인가(plan)) return err("REQ_001", "플랜을 골라 주세요.", 400);
  if (!기간인가(days)) return err("REQ_002", "기간을 골라 주세요.", 400);
  if (!depositor) return err("REQ_003", "입금자명을 적어 주세요.", 400);

  // 판매가 닫혀 있으면 주문을 받지 않는다. 화면에서 막는 것만으로는 이 API 를
  // 직접 부르면 그대로 넘어간다.
  const 스위치 = await pool.query(
    `SELECT key, value FROM app_settings WHERE key IN ('plan_sales', 'plans_open')`);
  const 설정: Record<string, string> = {};
  for (const r of 스위치.rows) 설정[r.key] = r.value;
  if (설정.plan_sales !== "on") {
    return err("PLAN_010", "지금은 온라인 신청을 받지 않습니다. 고객센터로 문의해 주세요.", 403);
  }
  // 아직 안 여는 상품은 받지 않는다 — 화면의 「오픈 준비중」과 같은 스위치다.
  const 열림 = (설정.plans_open ?? "LIGHT").split(",").map((x) => x.trim());
  if (!열림.includes(plan)) {
    return err("PLAN_013", `${플랜[plan].name}은(는) ${준비중}입니다.`, 403);
  }

  // 쓰고 있는 것보다 낮은 등급은 이용 중에 받지 않는다. 받으면 남은 기간을
  // 어떻게 셀지가 매번 분쟁이 된다 — 끝난 뒤에 신청하면 된다.
  const { plan: 지금 } = await 이용권(auth!.sub);
  if (지금 && 등급높이(plan) < 등급높이(지금)) {
    return err("PLAN_011",
      `${플랜[지금].name} 이용 중에는 그보다 낮은 플랜을 신청할 수 없습니다. 기간이 끝난 뒤에 신청해 주세요.`, 409);
  }

  // 같은 기업이 같은 플랜으로 입금대기를 여러 건 쌓지 않게 한다.
  const 대기 = await pool.query(
    `SELECT 1 FROM company_orders WHERE company_id = $1 AND status = 'PENDING' LIMIT 1`,
    [auth!.sub]
  );
  if ((대기.rowCount ?? 0) > 0) {
    return err("PLAN_012", "입금을 기다리는 주문이 이미 있습니다. 입금이 확인된 뒤에 다시 신청해 주세요.", 409);
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO company_orders (company_id, plan, days, amount, depositor)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [auth!.sub, plan, days, 값(plan, days), depositor]
    );
    return ok({ id: rows[0].id, amount: 값(plan, days) }, 201);
  } catch (e) {
    console.error("[company orders POST]", e);
    return err("SERVER_001", "신청하지 못했습니다.", 500);
  }
}
