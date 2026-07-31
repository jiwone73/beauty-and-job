export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 비회원 기업에 가입 안내(이메일/SMS)를 발송한 뒤 '안내발송(INVITED)' 상태로 기록.
// 발송 자체는 broadcast/email·sms/send 가 처리하고, 여기선 온보딩 상태만 갱신.
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const b = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(b.ids) ? b.ids.filter((x: any) => typeof x === "string" && x) : [];
  const ch = b.channel === "sms" ? "SMS" : b.channel === "email" ? "EMAIL" : "";
  if (ids.length === 0) return err("VALIDATION_001", "대상이 없습니다.", 400);
  if (!ch) return err("VALIDATION_001", "채널이 올바르지 않습니다.", 400);

  // 이미 가입/연결된 곳은 상태를 되돌리지 않음. 채널은 기존과 다르면 BOTH.
  await pool.query(
    `UPDATE companies
     SET invited_at = COALESCE(invited_at, now()),
         invite_count = COALESCE(invite_count, 0) + 1,
         invite_channel = CASE
           WHEN invite_channel IS NULL THEN $2
           WHEN invite_channel = $2 THEN invite_channel
           ELSE 'BOTH' END,
         onboarding_status = CASE
           WHEN onboarding_status IN ('RECEIVED', 'INVITE_FAILED') THEN 'INVITED'
           ELSE onboarding_status END,
         updated_at = now()
     WHERE id = ANY($1::uuid[]) AND is_member = false`,
    [ids, ch]
  );

  return ok({ invited: ids.length, channel: ch });
}
