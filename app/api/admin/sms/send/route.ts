import { NextRequest } from 'next/server'
import { ok, err, requireAuth } from '@/lib/api'

// 알리고 SMS 발송 API
// 환경변수 필요: ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER (등록된 발신번호)
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const { receivers, message } = await req.json()
  // receivers: string[] (수신번호 배열), message: string

  if (!Array.isArray(receivers) || receivers.length === 0)
    return err('BAD_REQUEST', '수신자가 없습니다.', 400)
  if (!message || !message.trim())
    return err('BAD_REQUEST', '메시지 내용이 없습니다.', 400)

  const API_KEY = process.env.ALIGO_API_KEY
  const USER_ID = process.env.ALIGO_USER_ID
  const SENDER = process.env.ALIGO_SENDER

  // 알리고 미연동 상태 → 준비 응답 (UI 테스트용)
  if (!API_KEY || !USER_ID || !SENDER) {
    return ok({
      pending: true,
      count: receivers.length,
      message: '알리고 연동 전입니다. API 키 설정 후 실제 발송됩니다.',
    })
  }

  // 번호 정규화 (하이픈 제거)
  const cleanNumbers = receivers
    .map((r: string) => (r || '').replace(/[^0-9]/g, ''))
    .filter((r: string) => r.length >= 10)

  if (cleanNumbers.length === 0)
    return err('BAD_REQUEST', '유효한 수신번호가 없습니다.', 400)

  // 한글 기준 45자 초과면 LMS, 이하면 SMS
  const byteLen = [...message].reduce((n, ch) => n + (ch.charCodeAt(0) > 127 ? 2 : 1), 0)
  const msgType = byteLen > 90 ? 'LMS' : 'SMS'

  try {
    // 알리고는 여러 명에게 같은 내용을 보낼 때 receiver를 콤마로 연결
    const form = new URLSearchParams()
    form.set('key', API_KEY)
    form.set('user_id', USER_ID)
    form.set('sender', SENDER)
    form.set('receiver', cleanNumbers.join(','))
    form.set('msg', message)
    form.set('msg_type', msgType)

    const resp = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    const data = await resp.json()

    // 알리고 응답: result_code === '1' 이면 성공
    if (String(data.result_code) === '1') {
      return ok({ sent: true, count: cleanNumbers.length, type: msgType, raw: data })
    }
    return err('SMS_FAIL', data.message || '문자 발송에 실패했습니다.', 400)
  } catch (e) {
    console.error('[sms send]', e)
    return err('SMS_ERROR', '문자 발송 중 오류가 발생했습니다.', 500)
  }
}