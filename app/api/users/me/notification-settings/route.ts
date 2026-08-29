export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, requireAuth } from "@/lib/api";
import { 동의읽기, 동의쓰기 } from "@/lib/termConsent";

/** 개인회원 알림 설정 중 users.notification_settings 에 사는 것들.
 *
 *  뉴스레터(newsletter)와 추천 포지션(recommend)은 여기 없다 — 각자
 *  /api/users/me/newsletter, /api/users/me/recommendation-consent 가 맡는다.
 *  같은 값을 두 곳에 적어 두면 언젠가 서로 어긋난다.
 */
const 알림칸 = ["resume_viewed", "agent"] as const;

/** '이벤트·혜택 소식 받기'는 광고성 정보 수신 동의 그 자체다. jsonb 에 따로 적어
 *  두면 가입 때 받은 동의 기록(term_agreements)과 두 벌이 되어 어긋난다. */
const EVENT_TERM = "MARKETING";

export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  const { rows } = await pool.query(
    `SELECT notification_settings FROM users WHERE id = $1`,
    [auth!.sub]
  );
  const 동의 = await 동의읽기("user", auth!.sub, [EVENT_TERM]);
  return ok({
    notification_settings: { ...(rows[0]?.notification_settings || {}), event: 동의[EVENT_TERM] },
  });
}

export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const 받은 = body?.settings ?? body?.notification_settings ?? {};

  // 아는 열쇠만, boolean 만 담는다.
  const 낼값: Record<string, boolean> = {};
  for (const k of 알림칸) if (typeof 받은[k] === "boolean") 낼값[k] = 받은[k];

  let 저장된: any = {};
  if (Object.keys(낼값).length) {
    const { rows } = await pool.query(
      `UPDATE users
          SET notification_settings = COALESCE(notification_settings, '{}'::jsonb) || $2::jsonb,
              updated_at = NOW()
        WHERE id = $1
        RETURNING notification_settings`,
      [auth!.sub, JSON.stringify(낼값)]
    );
    저장된 = rows[0]?.notification_settings || {};
  } else {
    const { rows } = await pool.query(`SELECT notification_settings FROM users WHERE id = $1`, [auth!.sub]);
    저장된 = rows[0]?.notification_settings || {};
  }

  if (typeof 받은.event === "boolean") {
    await 동의쓰기("user", auth!.sub, EVENT_TERM, 받은.event);
  }
  const 동의 = await 동의읽기("user", auth!.sub, [EVENT_TERM]);

  return ok({ notification_settings: { ...저장된, event: 동의[EVENT_TERM] } });
}
