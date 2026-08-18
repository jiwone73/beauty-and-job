export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // findByCompany 가 euc-kr TextDecoder 를 쓴다
export const maxDuration = 60;

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { checkHiringFor } from "@/lib/external/checkHiring";

// 외부업체의 활성공고를 매일 조금씩 갱신한다.
//
// 왜 10곳인가: 업체 하나를 조회하는 데 5초쯤 걸린다(실측). 함수 시간 제한 안에
// 끝내려면 이게 상한이다. 활성 업체가 83곳이라 여드레에 한 바퀴 돈다. 공고가
// 평균 34일 붙어 있으므로 그 사이 올라왔다 사라지는 공고는 거의 없다.
//
// 왜 9 + 1 인가: 공고를 내는 곳(found_count > 0)에 9칸을 주고, 지금 0건인 곳에
// 1칸을 준다. 0건인 곳을 아예 안 보면 한 번 0이 된 업체가 영영 후보에서 빠져
// 다시 뽑기 시작해도 모르게 된다. 한 칸이면 147곳을 다섯 달에 한 바퀴 도는데,
// 그 정도면 충분하다(0건 업체는 엿새를 두고 봐도 그대로였다).
const ACTIVE_SLOTS = 9;
const IDLE_SLOTS = 1;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return err("AUTH_001", "권한이 없습니다.", 401);
  }

  // 확인한 지 가장 오래된 순. 한 번도 확인 안 한 업체가 맨 앞에 온다.
  const pick = async (idle: boolean, limit: number) =>
    (
      await pool.query(
        `SELECT id, brand_name FROM target_companies
          WHERE COALESCE(found_count, 0) ${idle ? "= 0" : "> 0"}
          ORDER BY last_checked_at ASC NULLS FIRST
          LIMIT $1`,
        [limit]
      )
    ).rows as { id: string; brand_name: string }[];

  try {
    const targets = [...(await pick(false, ACTIVE_SLOTS)), ...(await pick(true, IDLE_SLOTS))];
    if (!targets.length) return ok({ checked: 0 });

    // 1쪽만 보고, 업체 사이에 1초 쉰다 — 상대 사이트에 몰아치지 않게.
    // 45초를 넘기면 남은 업체는 다음 날로 미룬다(무료 요금제 함수 제한 60초).
    const r = await checkHiringFor(targets, { maxPages: 1, gapMs: 1000, deadlineMs: 45_000 });
    return ok({
      checked: r.updated.length,
      hiring: r.hiring,
      jobs: r.jobs,
      newly: r.newly,
      brands: targets.map((t) => t.brand_name),
    });
  } catch (e) {
    console.error("[cron target-hiring]", e);
    return err("SERVER_001", "조회 중 오류가 발생했습니다.", 500);
  }
}
