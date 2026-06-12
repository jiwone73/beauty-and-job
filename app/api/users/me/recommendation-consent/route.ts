export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, requireAuth } from "@/lib/api";

const RECOMMENDATION_TERM_ID = "fb392275-4dc3-45cd-ad26-c59b3e571cee";

// 현재 추천 알림 동의 상태 조회
export async function GET(req: NextRequest) {
  const { auth, res } = requireAuth(req, "user");
  if (res) return res;
  const r = await pool.query(
    `SELECT 1 FROM term_agreements
      WHERE owner_type='user' AND owner_id=$1 AND term_id=$2 LIMIT 1`,
    [auth!.sub, RECOMMENDATION_TERM_ID]
  );
  return ok({ agreed: (r.rowCount ?? 0) > 0 });
}

// 추천 알림 동의 on/off
export async function PUT(req: NextRequest) {
  const { auth, res } = requireAuth(req, "user");
  if (res) return res;
  const { agreed } = await req.json();

  if (agreed) {
    await pool.query(
      `INSERT INTO term_agreements (owner_type, owner_id, term_id, agreed_at)
       SELECT 'user', $1, $2, NOW()
       WHERE NOT EXISTS (
         SELECT 1 FROM term_agreements
          WHERE owner_type='user' AND owner_id=$1 AND term_id=$2
       )`,
      [auth!.sub, RECOMMENDATION_TERM_ID]
    );
  } else {
    await pool.query(
      `DELETE FROM term_agreements
        WHERE owner_type='user' AND owner_id=$1 AND term_id=$2`,
      [auth!.sub, RECOMMENDATION_TERM_ID]
    );
  }
  return ok({ agreed: !!agreed });
}
