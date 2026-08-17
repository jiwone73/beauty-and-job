export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { ok, requireAuth } from "@/lib/api";
import { IDLE_GAP_MIN, todayMinutes, touchWorkSession } from "@/lib/albaWork";

// 근무 시간 자동 측정.
//
// 로그인·로그아웃 기준으로 재면 안 된다 — 로그아웃을 누르는 사람이 없고,
// '로그인 저장하기'로 며칠씩 로그인이 유지되면 하루 24시간이 잡혀 버린다.
// 그래서 관리자 창이 화면에 떠 있고 최근에 일한 흔적이 있을 때만 센다.
//
// 신호는 두 갈래다 — 이 화면이 주기적으로 두드리는 것과, 공고를 저장하는 것.
// 외부 사이트를 함께 띄워 놓고 자료를 찾는 동안에는 관리자 창에 조작이 없으므로
// 저장 시각도 신호로 받아야 실제 일한 시간에 가까워진다.
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const adminId = auth!.sub;
  const { sessionId, startedAt } = await touchWorkSession(adminId);

  return ok({
    sessionId,
    startedAt,
    todayMinutes: await todayMinutes(adminId),
    idleGapMin: IDLE_GAP_MIN,
  });
}
