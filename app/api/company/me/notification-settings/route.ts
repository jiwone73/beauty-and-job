export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, requireAuth } from "@/lib/api";
import { 알림칸, 동의칸, 펴기 } from "@/lib/companyNotifySettings";
import { 동의읽기, 동의쓰기 } from "@/lib/termConsent";

const 동의종류 = 동의칸.map((c) => c.key);

async function 지금값(companyId: string) {
  const { rows } = await pool.query(
    `SELECT notification_settings FROM companies WHERE id = $1`,
    [companyId]
  );
  return {
    notification_settings: 펴기(rows[0]?.notification_settings),
    consents: await 동의읽기("company", companyId, 동의종류),
  };
}

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;
  return ok(await 지금값(auth!.sub));
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

  // 2) 광고성 정보 수신 동의 — 가입 때 받은 그 기록과 같은 자리에 쓴다.
  //    끄면 지우지 않고 철회 시각을 남긴다(lib/termConsent).
  const 받은동의 = body?.consents ?? {};
  for (const c of 동의칸) {
    if (typeof 받은동의[c.key] === "boolean") {
      await 동의쓰기("company", auth!.sub, c.key, 받은동의[c.key]);
    }
  }

  return ok(await 지금값(auth!.sub));
}
