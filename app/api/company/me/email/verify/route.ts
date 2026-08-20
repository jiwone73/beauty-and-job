export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 이메일 변경 2단계: 인증코드 확인 후 이메일 업데이트
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const newEmail = (body?.new_email || "").trim().toLowerCase();
  const code = (body?.code || "").trim();

  if (!newEmail || !code) return err("VALIDATION_001", "인증코드를 입력해주세요.", 400);

  const tokenHash = `email_change:${auth!.sub}:${newEmail}:${code}`;
  const found = await pool.query(
    `SELECT id FROM refresh_tokens
     WHERE token_hash = $1 AND expires_at > NOW() AND revoked_at IS NULL`,
    [tokenHash]
  );
  if (found.rowCount === 0) return err("AUTH_003", "인증코드가 올바르지 않거나 만료되었습니다.", 400);

  // 최종 중복 재확인
  // 이메일은 로그인 아이디다. 개인·기업이 표는 달라도 주소는 하나여야 한다 —
  // 겹치면 한 주소가 두 계정의 아이디가 되어, 그 사람은 새 계정을 못 만들고
  // 두 계정의 안내 메일이 한 편지함에 섞인다.
  // status 로 거르지 않는다. 가입 때의 중복 검사도 거르지 않으므로, 여기서만
  // 열어 주면 탈퇴한 계정의 주소를 가져간 뒤 가입 화면에서 막히게 된다.
  const [c, u] = await Promise.all([
    pool.query(`SELECT 1 FROM companies WHERE lower(email) = $1 AND id != $2 LIMIT 1`, [newEmail, auth!.sub]),
    pool.query(`SELECT 1 FROM users WHERE lower(email) = $1 LIMIT 1`, [newEmail]),
  ]);
  if ((c.rowCount ?? 0) > 0 || (u.rowCount ?? 0) > 0) return err("COMPANY_002", "이미 사용 중인 이메일입니다.", 409);

  await pool.query(`UPDATE companies SET email = $1, updated_at = NOW() WHERE id = $2`, [newEmail, auth!.sub]);
  await pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [tokenHash]);

  return ok({ email: newEmail });
}
