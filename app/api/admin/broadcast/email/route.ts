export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import { ok, err, requireAuth } from '@/lib/api'
import { sendAnnouncementEmails } from '@/lib/email'

// 관리자: 선택 회원에게 단체 이메일(noreply 발신, 무회신)
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr
  const { to, subject, body } = await req.json()
  if (!Array.isArray(to) || to.length === 0) return err('BAD_REQUEST', '수신자가 없습니다.', 400)
  if (!subject || !subject.trim() || !body || !body.trim()) return err('BAD_REQUEST', '제목과 내용을 입력해주세요.', 400)
  try {
    const r = await sendAnnouncementEmails(to, subject, body)
    return ok({ sent: r.sent })
  } catch (e: any) {
    return err('EMAIL_SEND_FAILED', e?.message || '메일 발송에 실패했습니다.', 500)
  }
}
