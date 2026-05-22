import jwt from 'jsonwebtoken'
const SECRET = process.env.JWT_SECRET!
export type TokenPayload = {
  sub: string
  owner_type: 'user' | 'company' | 'admin'
  role: string
}
export function signAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload
}