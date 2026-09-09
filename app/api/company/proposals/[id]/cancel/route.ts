export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 기업이 보낸 제안을 거둔다.
//
// 잘못 보냈거나 이미 다른 사람을 뽑았을 때 거둘 방법이 없었다. 공고를 마감하면
// 대기 중인 제안이 같이 닫히지만, 공고는 살려 두고 이 사람에게만 거두고 싶은
// 경우가 있다.
//
// 어느 단계에서나 거둘 수 있다. 대화 중에 갑자기 다른 사람을 뽑는 일이 제일
// 흔한데, 수락 전으로 묶어 두면 그때 정리할 길이 없다.
//
// 거둔 제안은 구직자 화면에서 사라지지 않고 「취소됨」으로 남는다 — 제안이
// 가면 알림이 이미 나가므로, 알림을 누르고 들어왔는데 아무것도 없으면 더
// 이상하다. 이미 끝난 것(거절)만 막는다.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, res } = requireAuth(req, "company");
  if (res) return res;

  const { rows } = await pool.query(
    `SELECT interested_at, declined_at, canceled_at FROM proposals
      WHERE id = $1 AND company_id = $2`,
    [params.id, auth!.sub]
  );
  const 제안 = rows[0];
  if (!제안) return err("PROP_CANCEL_001", "제안을 찾을 수 없어요.", 404);
  if (제안.canceled_at) return ok({ canceled: true });
  if (제안.declined_at) return err("PROP_CANCEL_002", "이미 거절된 제안이에요.", 400);

  await pool.query(`UPDATE proposals SET canceled_at = NOW() WHERE id = $1`, [params.id]);
  return ok({ canceled: true });
}
