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
// 수락 전에만 누를 수 있다. 대화가 시작된 뒤에 소리 없이 사라지면 구직자는
// 무슨 일이 있었는지 알 수 없고, 면접까지 잡아 놓고 거두는 것은 취소가 아니라
// 대화로 풀 일이다.
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
  if (제안.interested_at) {
    return err("PROP_CANCEL_003", "이미 받아들인 제안이라 거둘 수 없어요. 채팅으로 알려 주세요.", 400);
  }

  await pool.query(`UPDATE proposals SET canceled_at = NOW() WHERE id = $1`, [params.id]);
  return ok({ canceled: true });
}
