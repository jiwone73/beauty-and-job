export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/api'
import { signAccessToken } from '@/lib/jwt'
import bcrypt from 'bcryptjs'

// 환경변수에서 어드민 계정 로드
// 형식: ADMIN_ACCOUNTS="admin:admin1234:슈퍼관리자,beauty:beauty1234:운영팀"
function getAdminAccounts() {
  const raw = process.env.ADMIN_ACCOUNTS || ''
  const accounts: Record<string, { password: string; name: string }> = {}
  raw.split(',').forEach((entry) => {
    const [id, password, name] = entry.split(':')
    if (id && password) {
      accounts[id.trim()] = { password: password.trim(), name: (name || id).trim() }
    }
  })
  return accounts
}

export async function POST(req: NextRequest) {
  try {
    const { login_id, password } = await req.json()
    if (!login_id || !password) {
      return err('BAD_REQUEST', '아이디와 비밀번호를 입력해주세요.', 400)
    }

    const accounts = getAdminAccounts()
    const account = accounts[login_id]
    // account.password = base64 인코딩된 bcrypt 해시 → 디코딩 후 비교
    let passwordOk = false
    if (account) {
      try {
        const hash = Buffer.from(account.password, 'base64').toString('utf-8')
        passwordOk = bcrypt.compareSync(password, hash)
      } catch {
        passwordOk = false
      }
    }
    if (!account || !passwordOk) {
      return err('AUTH_003', '아이디 또는 비밀번호가 올바르지 않습니다.', 401)
    }

    const access_token = signAccessToken({
      sub: login_id,
      owner_type: 'admin',
      role: 'admin',
    })

    return ok({
      access_token,
      admin: { login_id, name: account.name },
    })
  } catch (e) {
    console.error('admin login error:', e)
    return err('SERVER_ERROR', '로그인 처리 중 오류가 발생했습니다.', 500)
  }
}