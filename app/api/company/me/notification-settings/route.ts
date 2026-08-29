export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, requireAuth } from "@/lib/api";
import { 알림칸, 동의칸, 펴기 } from "@/lib/companyNotifySettings";

/** 지금 살아 있는 동의(철회하지 않은 것)를 type 별로 읽는다. */
async function 동의읽기(companyId: string) {
  const { rows } = await pool.query(
    `SELECT t.type
       FROM term_agreements ta
       JOIN terms t ON t.id = ta.term_id
      WHERE ta.owner_type = 'company' AND ta.owner_id = $1
        AND ta.withdrawn_at IS NULL`,
    [companyId]
  );
  const 산것 = new Set(rows.map((r) => r.type));
  return Object.fromEntries(동의칸.map((c) => [c.key, 산것.has(c.key)]));
}

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const { rows } = await pool.query(
    `SELECT notification_settings FROM companies WHERE id = $1`,
    [auth!.sub]
  );
  return ok({
    notification_settings: 펴기(rows[0]?.notification_settings),
    consents: await 동의읽기(auth!.sub),
  });
}

export async function PUT(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));

  // 1) 우리 일에 대한 알림 — 아는 열쇠만, boolean 만 담는다.
  const 받은 = body?.notification_settings ?? {};
  const 낼값: Record<string, boolean> = {};
  for (const c of 알림칸) if (typeof 받은[c.key] === "boolean") 낼값[c.key] = 받은[c.key];
  if (Object.keys(낼값).length) {
    await pool.query(
      `UPDATE companies
          SET notification_settings = COALESCE(notification_settings, '{}'::jsonb) || $2::jsonb,
              updated_at = NOW()
        WHERE id = $1`,
      [auth!.sub, JSON.stringify(낼값)]
    );
  }

  // 2) 광고성 정보 수신 동의 — 켜면 동의 기록을 새로 남기고, 끄면 철회 시각을 적는다.
  //    지우지 않는 이유는 언제 동의했고 언제 껐는지가 그대로 증빙이 되어야 하기 때문이다.
  const 받은동의 = body?.consents ?? {};
  for (const c of 동의칸) {
    const 원함 = 받은동의[c.key];
    if (typeof 원함 !== "boolean") continue;
    const { rows: t } = await pool.query(
      `SELECT id FROM terms WHERE type = $1 AND is_active = true ORDER BY version DESC LIMIT 1`,
      [c.key]
    );
    const termId = t[0]?.id;
    if (!termId) continue;

    if (원함) {
      // owner_id + term_id 에 UNIQUE 가 걸려 있어 한 약관에 행은 하나뿐이다.
      // 그래서 새 행을 쌓지 않고 그 행을 다시 살린다 — 동의 시각을 지금으로 새로 적고
      // 철회 시각을 지운다(다시 동의한 시점이 곧 유효한 동의 시각이다).
      await pool.query(
        `INSERT INTO term_agreements (owner_id, owner_type, term_id, agreed_at)
         VALUES ($1, 'company', $2, NOW())
         ON CONFLICT (owner_id, term_id)
         DO UPDATE SET agreed_at = NOW(), withdrawn_at = NULL`,
        [auth!.sub, termId]
      );
    } else {
      await pool.query(
        `UPDATE term_agreements SET withdrawn_at = NOW()
          WHERE owner_id = $1 AND owner_type = 'company' AND term_id = $2
            AND withdrawn_at IS NULL`,
        [auth!.sub, termId]
      );
    }
  }

  const { rows } = await pool.query(
    `SELECT notification_settings FROM companies WHERE id = $1`,
    [auth!.sub]
  );
  return ok({
    notification_settings: 펴기(rows[0]?.notification_settings),
    consents: await 동의읽기(auth!.sub),
  });
}
