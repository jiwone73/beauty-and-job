export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { 이용권, 보관 } from "@/lib/companyEntitlement";
import { 플랜, 보관일수, 보관환산 } from "@/lib/companyPlans";

/**
 * 남은 기간 보관하기(키핑).
 *
 * 사람을 빨리 뽑았을 때 남은 기간이 그냥 타 버리면 그것이 곧 환불 요청이 된다.
 * 세워 뒀다가 다음 채용 때 쓰게 한다.
 *
 * **저절로 보관하지 않는다.** 공고 하나를 닫았다고 이용권을 거둬 가면, 내일
 * 새 공고를 올리려던 사람의 이용권이 어제 사라져 있다. 사장님이 누를 때만 한다.
 *
 * 누르는 순간 이용권은 끝난다 — 걸어 둘 공고가 없어야 누를 수 있으므로
 * 내려갈 공고도 없다.
 */
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { plan, 남은일 } = await 이용권(auth!.sub);
    if (!plan || 남은일 <= 0) {
      await client.query("ROLLBACK");
      return err("KEEP_001", "보관할 이용 기간이 없습니다.", 409);
    }

    // 걸린 공고가 하나라도 있으면 아직 채용 중이다. 여기서 보관해 주면
    // 공고는 걸려 있는데 이용권이 없는 상태가 되어 게재 종료일이 붕 뜬다.
    const { rows: 걸림 } = await client.query(
      `SELECT COUNT(*)::int AS n FROM job_postings WHERE company_id = $1 AND status = 'ACTIVE'`,
      [auth!.sub]
    );
    if (걸림[0].n > 0) {
      await client.query("ROLLBACK");
      return err("KEEP_002",
        `진행 중인 공고 ${걸림[0].n}건을 먼저 마감해 주세요. 공고를 모두 닫은 뒤에 보관할 수 있습니다.`, 409);
    }

    // 이미 세워 둔 것이 있으면 합친다. 플랜이 다르면 이번 플랜 기준으로 환산해
    // 얹는다 — 서로 다른 기준의 일수를 그냥 더하면 값어치가 어긋난다.
    const 옛 = await 보관(auth!.sub);
    const 합 = 남은일 + (옛.plan ? 보관환산(옛.plan, 옛.days, plan) : 0);

    const { rows } = await client.query(
      `UPDATE companies
          SET kept_days  = $2,
              kept_plan  = $3,
              kept_until = CURRENT_DATE + $4::int,
              -- 이용권은 여기서 끝난다. 어제로 밀어 두면 이용권() 이 스스로
              -- 스타트로 읽는다 — 등급 칸을 지울 필요가 없다.
              paid_until = CURRENT_DATE - 1,
              updated_at = now()
        WHERE id = $1
        RETURNING kept_days, to_char(kept_until, 'YYYY-MM-DD') AS kept_until`,
      [auth!.sub, 합, plan, 보관일수]
    );

    await client.query("COMMIT");
    return ok({
      days: rows[0].kept_days,
      plan,
      planName: 플랜[plan].name,
      until: rows[0].kept_until,
    });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[company plan keep]", e);
    return err("SERVER_001", "보관하지 못했습니다.", 500);
  } finally {
    client.release();
  }
}
