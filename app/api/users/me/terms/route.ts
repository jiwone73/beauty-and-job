export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 이미 있는 회원의 약관 동의를 받는다.
//
// 간편가입에 동의 절차를 붙이기 전에 만들어진 계정들이 있다 — 그 사람들은
// 우리 약관에 동의한 기록이 없다. 온보딩을 지날 때 한 번 받아서 메운다.
// 새로 가입하는 사람은 여기 오지 않는다(회원이 되기 전에 동의하므로).
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({} as any));
  const 동의 = new Set<string>((body?.agreed_term_ids || []).map((x: any) => String(x)));

  const 필수 = await pool.query(
    `SELECT id FROM terms WHERE is_required = true AND is_active = true`
  );
  if (필수.rows.some((t: any) => !동의.has(String(t.id)))) {
    return err("TERM_001", "필수 약관에 동의해 주세요.", 400);
  }

  for (const termId of 동의) {
    await pool.query(
      `INSERT INTO term_agreements (owner_type, owner_id, term_id, agreed_at)
       VALUES ('user', $1, $2, NOW())
       ON CONFLICT (owner_id, term_id)
       DO UPDATE SET agreed_at = NOW(), withdrawn_at = NULL`,
      [auth!.sub, termId]
    );
  }
  return ok({ agreed: 동의.size });
}
