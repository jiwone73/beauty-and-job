export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, requireAuth } from "@/lib/api";
import { 알림칸, 펴기 } from "@/lib/companyNotifySettings";

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const { rows } = await pool.query(
    `SELECT notification_settings FROM companies WHERE id = $1`,
    [auth!.sub]
  );
  return ok({ notification_settings: 펴기(rows[0]?.notification_settings) });
}

export async function PUT(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const 받은 = body?.notification_settings ?? {};
  // 아는 열쇠만, boolean 만 담는다 — 화면에 없는 값이 몰래 들어가 남는 걸 막는다.
  const 낼값: Record<string, boolean> = {};
  for (const c of 알림칸) if (typeof 받은[c.key] === "boolean") 낼값[c.key] = 받은[c.key];

  const { rows } = await pool.query(
    `UPDATE companies
        SET notification_settings = COALESCE(notification_settings, '{}'::jsonb) || $2::jsonb,
            updated_at = NOW()
      WHERE id = $1
      RETURNING notification_settings`,
    [auth!.sub, JSON.stringify(낼값)]
  );
  return ok({ notification_settings: 펴기(rows[0]?.notification_settings) });
}
