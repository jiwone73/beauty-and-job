export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err } from '@/lib/api'

// 인증번호 입력 시도 허용 횟수 (초과 시 해당 코드 즉시 만료)
const MAX_ATTEMPTS = 5

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { phone, code, purpose } = body as {
      phone?: string
      code?: string
      purpose?: string
    }

    if (!phone || !code) {
      return err('AUTH_003', '휴대폰 번호와 인증번호를 입력해주세요.')
    }

    const cleanPhone = String(phone).replace(/\D/g, '')
    const cleanCode = String(code).replace(/\D/g, '')
    const purposeVal = purpose === 'find_account' ? 'find_account' : 'signup'

    // ── 1) 코드가 아닌 "번호"로 유효한 최신 발급 건을 먼저 찾는다.
    //     (code로 조회하면 오답 시 행이 안 잡혀 attempts를 올릴 수 없다)
    const { rows } = await pool.query(
      `SELECT id, code, attempts
         FROM phone_verifications
        WHERE phone = $1
          AND purpose = $2
          AND verified = false
          AND expires_at > now()
        ORDER BY created_at DESC
        LIMIT 1`,
      [cleanPhone, purposeVal]
    )

    if (rows.length === 0) {
      return err('AUTH_003', '인증번호가 올바르지 않거나 만료됐습니다.', 401)
    }

    const row = rows[0] as { id: string; code: string; attempts: number }

    // ── 2) 시도 횟수 초과 → 코드 즉시 만료
    if (row.attempts >= MAX_ATTEMPTS) {
      await pool.query(
        `UPDATE phone_verifications SET expires_at = now() WHERE id = $1`,
        [row.id]
      )
      return err(
        'AUTH_ATTEMPTS',
        '인증 시도 횟수를 초과했습니다. 인증번호를 다시 발송해주세요.',
        429
      )
    }

    // ── 3) 코드 불일치 → attempts 증가 후 실패 반환
    if (row.code !== cleanCode) {
      const { rows: upRows } = await pool.query(
        `UPDATE phone_verifications
            SET attempts = attempts + 1
          WHERE id = $1
          RETURNING attempts`,
        [row.id]
      )
      const used: number = upRows[0]?.attempts ?? row.attempts + 1
      const left = Math.max(MAX_ATTEMPTS - used, 0)

      if (left === 0) {
        await pool.query(
          `UPDATE phone_verifications SET expires_at = now() WHERE id = $1`,
          [row.id]
        )
        return err(
          'AUTH_ATTEMPTS',
          '인증 시도 횟수를 초과했습니다. 인증번호를 다시 발송해주세요.',
          429
        )
      }

      return err('AUTH_003', `인증번호가 올바르지 않습니다. (남은 시도 ${left}회)`, 401)
    }

    // ── 4) 일치 → 인증 완료 (경합 방지 조건부 UPDATE)
    const { rowCount } = await pool.query(
      `UPDATE phone_verifications
          SET verified = true
        WHERE id = $1
          AND verified = false
          AND expires_at > now()`,
      [row.id]
    )

    if (rowCount === 0) {
      return err('AUTH_003', '인증번호가 올바르지 않거나 만료됐습니다.', 401)
    }

    return ok({ verified: true })
  } catch (e) {
    console.error('[phone/verify] 오류:', e)
    return err('SERVER_ERROR', '인증 처리 중 오류가 발생했습니다.', 500)
  }
}