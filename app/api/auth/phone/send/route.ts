export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'
import { sendSMS, generateCode, isSmsConfigured } from '@/lib/sms/send'

// ── 발송 제한 정책 ────────────────────────────────
const COOLDOWN_SEC = 60   // 동일 번호 재발송 대기 시간
const DAILY_LIMIT = 5     // 동일 번호 24시간 내 최대 발송 횟수
const CODE_TTL_SEC = 180  // 인증번호 유효시간 (3분)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { phone, purpose } = body as { phone?: string; purpose?: string }

    if (!phone) return err('AUTH_001', '휴대폰 번호를 입력해주세요.')

    const cleanPhone = String(phone).replace(/\D/g, '')
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return err('AUTH_001', '올바른 휴대폰 번호를 입력해주세요.')
    }

    const purposeVal = purpose === 'find_account' ? 'find_account' : 'signup'

    // ── 1) 쿨다운 + 일일 한도 동시 조회
    const { rows: limitRows } = await pool.query(
      `SELECT
         COUNT(*)::int AS daily_count,
         EXTRACT(EPOCH FROM (now() - MAX(created_at)))::int AS since_last
       FROM phone_verifications
       WHERE phone = $1
         AND created_at > now() - interval '24 hours'`,
      [cleanPhone]
    )

    const dailyCount: number = limitRows[0]?.daily_count ?? 0
    const sinceLast: number | null = limitRows[0]?.since_last ?? null

    if (sinceLast !== null && sinceLast < COOLDOWN_SEC) {
      const wait = COOLDOWN_SEC - sinceLast
      return err('SMS_COOLDOWN', `${wait}초 후에 다시 시도해주세요.`, 429)
    }

    if (dailyCount >= DAILY_LIMIT) {
      return err(
        'SMS_DAILY_LIMIT',
        `하루 인증 요청 한도(${DAILY_LIMIT}회)를 초과했습니다. 24시간 후 다시 시도해주세요.`,
        429
      )
    }

    // ── 2) 기존 미인증 코드 무효화 (삭제 아님 — 이력 보존)
    await pool.query(
      `UPDATE phone_verifications
          SET expires_at = now()
        WHERE phone = $1
          AND purpose = $2
          AND verified = false
          AND expires_at > now()`,
      [cleanPhone, purposeVal]
    )

    // ── 3) 새 코드 발급
    const code = generateCode()
    const expiresAt = new Date(Date.now() + CODE_TTL_SEC * 1000)

    const { rows: insRows } = await pool.query(
      `INSERT INTO phone_verifications (phone, code, purpose, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [cleanPhone, code, purposeVal, expiresAt]
    )
    const insertedId = insRows[0]?.id
    void insertedId

    // ── 4) 실제 발송
    const sent = await sendSMS(cleanPhone, `[뷰티워크] 인증번호는 ${code} 입니다.`)

    // ⚠⚠ 임시 테스트 폴백 (발신번호 등록·승인 전 한정) ⚠⚠
    // 발신번호 미등록으로 실제 발송이 실패해도 하드 에러 대신 콘솔·dev_code로 인증번호를 확인할 수 있게 함.
    // ▶ 발신번호 등록이 끝나면 이 블록을 지우고 아래 [원복용] 주석의 코드로 되돌릴 것.
    const testFallback = !sent // 미연동이든, 발송 실패든 코드가 안 나갔으면 폴백
    if (testFallback) {
      console.log(`[PHONE OTP] ${cleanPhone} → ${code} ${isSmsConfigured() ? "(발송 실패 → 테스트 폴백)" : "(SMS 미연동)"}`)
    }
    return ok({
      expires_in: CODE_TTL_SEC,
      remaining: DAILY_LIMIT - dailyCount - 1,
      ...(testFallback ? { dev_code: code } : {}),
    })

    // [원복용] 발신번호 등록 후 위 폴백 블록을 지우고 아래로 교체:
    // if (isSmsConfigured() && !sent) {
    //   if (insertedId) await pool.query(`DELETE FROM phone_verifications WHERE id = $1`, [insertedId])
    //   return err('SMS_FAIL', '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.', 500)
    // }
    // return ok({ expires_in: CODE_TTL_SEC, remaining: DAILY_LIMIT - dailyCount - 1, ...(isSmsConfigured() ? {} : { dev_code: code }) })
  } catch (e) {
    console.error('[phone/send] 오류:', e)
    return err('SERVER_ERROR', '인증번호 발송 중 오류가 발생했습니다.', 500)
  }
}