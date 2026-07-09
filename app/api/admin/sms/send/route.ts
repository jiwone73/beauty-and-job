export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import { ok, err, requireAuth } from '@/lib/api'
import { sendBulkSMS, isSmsConfigured } from '@/lib/sms/send'

// [SMS 발송 기능 보류] 2026-07
// SMS는 휴대폰 인증 전용으로 제한. 어드민 안내 문자는 이메일(Resend)로 대체 예정.
// 라우트는 유지하되 실발송은 SMS_ENABLED 스위치에 종속된다.
// 되살리려면 app/admin/members/page.tsx, app/admin/members/companies/page.tsx 의
// 동일 표식([SMS 발송 기능 보류]) 4곳씩 주석 해제.

export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const body = await req.json().catch(() => ({}))
  const { receivers, message } = body as { receivers?: string[]; message?: string }

  if (!Array.isArray(receivers) || receivers.length === 0)
    return err('BAD_REQUEST', '수신자가 없습니다.', 400)
  if (!message || !message.trim())
    return err('BAD_REQUEST', '메시지 내용이 없습니다.', 400)

  // 스위치 OFF(로컬/Preview) → 실발송 없이 대기 응답
  if (!isSmsConfigured()) {
    return ok({
      pending: true,
      count: receivers.length,
      message: 'SMS 발송이 비활성화된 환경입니다. (SMS_ENABLED=false)',
    })
  }

  const result = await sendBulkSMS(receivers, message)

  if (!result.sent) {
    return err('SMS_FAIL', result.error || '문자 발송에 실패했습니다.', 400)
  }

  return ok({ sent: true, count: result.count, type: result.type })
}