export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { 값, 플랜, 플랜인가, 기간인가, type PlanId } from "@/lib/companyPlans";
import { 보관더할일 } from "@/lib/companyEntitlement";

/**
 * 기업 이용권 주문.
 *
 * 결제 모듈이 붙기 전이라 무통장입금으로 받는다. 그래서 「입금을 확인했는가」가
 * 곧 주문의 상태이고, 확인하는 사람은 관리자다. PG 가 붙어도 이 표와 이 화면은
 * 그대로 쓰고 결제수단 칸만 는다.
 */

export async function GET(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const status = new URL(req.url).searchParams.get("status") || "";
  const where = ["PENDING", "PAID", "CANCELED"].includes(status) ? `WHERE o.status = '${status}'` : "";
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.company_id, c.company_name, o.plan, o.days, o.amount, o.status, o.kept_days,
              o.depositor,
              to_char(o.applied_from,  'YYYY-MM-DD') AS applied_from,
              to_char(o.applied_until, 'YYYY-MM-DD') AS applied_until,
              o.confirmed_at, o.created_at,
              c.plan AS company_plan,
              to_char(c.paid_until, 'YYYY-MM-DD') AS company_paid_until
         FROM company_orders o
         JOIN companies c ON c.id = o.company_id
         ${where}
        ORDER BY (o.status = 'PENDING') DESC, o.created_at DESC
        LIMIT 300`
    );
    return ok(rows);
  } catch (e) {
    console.error("[admin orders GET]", e);
    return err("SERVER_001", "주문을 불러오지 못했습니다.", 500);
  }
}

/** 손으로 주문 넣기 — 전화·문자로 받은 것을 관리자가 대신 적는다. */
export async function POST(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const body = await req.json().catch(() => ({}));
  const companyId = String(body?.companyId || "").trim();
  const plan = body?.plan;
  const days = Number(body?.days);
  const depositor = String(body?.depositor || "").trim() || null;
  if (!companyId) return err("REQ_001", "기업을 골라 주세요.", 400);
  if (!플랜인가(plan)) return err("REQ_002", "플랜이 올바르지 않습니다.", 400);
  if (!기간인가(days)) return err("REQ_003", "기간이 올바르지 않습니다.", 400);
  try {
    const { rows } = await pool.query(
      `INSERT INTO company_orders (company_id, plan, days, amount, depositor)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [companyId, plan, days, 값(plan, days), depositor]
    );
    return ok(rows[0], 201);
  } catch (e) {
    console.error("[admin orders POST]", e);
    return err("SERVER_001", "주문을 넣지 못했습니다.", 500);
  }
}

/**
 * 입금 확인 / 취소.
 *
 * 확인하면 이용권이 붙는다. 이용 중이면 남은 기간에 이어 붙이고, 끝났으면
 * 오늘부터 센다. 그 기업이 걸어 둔 공고의 게재 종료일도 같이 민다 — 이용권은
 * 늘었는데 공고가 먼저 내려가면 무엇을 산 것인지 알 수 없다.
 */
export async function PATCH(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || "").trim();
  const action = body?.action;
  if (!id) return err("REQ_001", "주문을 고르지 못했습니다.", 400);
  if (action !== "confirm" && action !== "cancel") return err("REQ_002", "알 수 없는 동작입니다.", 400);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT id, company_id, plan, days, status FROM company_orders WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const o = rows[0];
    if (!o) { await client.query("ROLLBACK"); return err("ORDER_001", "없는 주문입니다.", 404); }
    if (o.status !== "PENDING") {
      await client.query("ROLLBACK");
      return err("ORDER_002", "이미 처리된 주문입니다.", 409);
    }

    if (action === "cancel") {
      await client.query(
        `UPDATE company_orders SET status = 'CANCELED', canceled_at = now(), updated_at = now() WHERE id = $1`,
        [id]
      );
      await client.query("COMMIT");
      return ok({ id, status: "CANCELED" });
    }

    // 세워 둔 기간이 있으면 여기서 함께 푼다. 이 플랜 기준으로 환산해 얹고,
    // 얹은 만큼 보관함을 비운다 — 두 번 쓰이면 안 된다.
    // 이 기업 행을 잠그고 읽는다. 트랜잭션 밖에서 읽으면 두 주문을 나란히
    // 확인할 때 같은 보관분을 둘 다 얹는다.
    const { rows: 보관행 } = await client.query(
      `SELECT kept_days, kept_plan, to_char(kept_until, 'YYYY-MM-DD') AS kept_until,
              (kept_until IS NOT NULL AND kept_until >= CURRENT_DATE) AS 살아있음
         FROM companies WHERE id = $1 FOR UPDATE`,
      [o.company_id]
    );
    const k = 보관행[0];
    const 세운것 = k?.살아있음 && 플랜인가(k.kept_plan) && Number(k.kept_days) > 0
      ? { days: Number(k.kept_days), plan: k.kept_plan as PlanId, until: k.kept_until }
      : { days: 0, plan: null, until: null };
    const 얹을일 = 보관더할일(세운것, o.plan);
    const 총일 = Number(o.days) + 얹을일;

    // 이어 붙일 자리를 찾는다. 기간이 남아 있으면 그 끝 다음 날부터, 아니면 오늘부터.
    // 「오늘부터 30일」은 오늘을 넣어 세므로 마지막 날이 오늘+29 다.
    const 적용 = await client.query(
      `UPDATE companies
          SET plan = $2,
              paid_until = GREATEST(COALESCE(paid_until, CURRENT_DATE - 1), CURRENT_DATE - 1) + ($3 || ' days')::interval,
              kept_days = CASE WHEN $4::int > 0 THEN 0 ELSE kept_days END,
              kept_plan = CASE WHEN $4::int > 0 THEN NULL ELSE kept_plan END,
              kept_until = CASE WHEN $4::int > 0 THEN NULL ELSE kept_until END,
              updated_at = now()
        WHERE id = $1
        RETURNING to_char(paid_until, 'YYYY-MM-DD') AS paid_until,
                  to_char((paid_until - ($3 || ' days')::interval)::date + 1, 'YYYY-MM-DD') AS 시작`,
      [o.company_id, o.plan, String(총일), 얹을일]
    );
    const 새끝 = 적용.rows[0]?.paid_until;
    // 영수증에 적을 시작일. 연장이면 오늘이 아니라 옛 기간이 끝난 다음 날이다.
    const 시작 = 적용.rows[0]?.시작;

    // 걸려 있는 공고의 게재 기간도 같이 민다.
    await client.query(
      `UPDATE job_postings SET listed_until = $2::date, updated_at = now()
        WHERE company_id = $1 AND status = 'ACTIVE'`,
      [o.company_id, 새끝]
    );

    await client.query(
      `UPDATE company_orders
          SET status = 'PAID', confirmed_at = now(), updated_at = now(),
              applied_from = $3::date, applied_until = $2::date, kept_days = $4::int
        WHERE id = $1`,
      [id, 새끝, 시작, 얹을일]
    );
    await client.query("COMMIT");
    return ok({ id, status: "PAID", paidUntil: 새끝, plan: o.plan,
                planName: 플랜[o.plan as keyof typeof 플랜].name, 보관일: 얹을일 });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[admin orders PATCH]", e);
    return err("SERVER_001", "처리하지 못했습니다.", 500);
  } finally {
    client.release();
  }
}
