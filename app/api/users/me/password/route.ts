export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;
  const { current_password, new_password } = await req.json().catch(() => ({}));
  if (!current_password || !new_password) {
    return err("AUTH_001", "현재 비밀번호와 새 비밀번호를 입력해주세요.", 400);
  }
  if (new_password.length < 8) {
    return err("VALIDATION_001", "새 비밀번호는 8자 이상이어야 합니다.", 400);
  }
  try {
    const result = await pool.query(
      `SELECT password_hash, kakao_id FROM users WHERE id = $1`,
      [auth!.sub]
    );
    if (result.rowCount === 0) {
      return err("USER_004", "계정을 찾을 수 없습니다.", 404);
    }
    if (!result.rows[0].password_hash) {
      return err("AUTH_003", "비밀번호가 설정되지 않은 계정입니다. 소셜 로그인(카카오)으로 가입하셨다면 해당 서비스에서 변경해주세요.", 400);
    }
    const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!valid) {
      return err("AUTH_002", "현재 비밀번호가 올바르지 않습니다.", 400);
    }
    const same = await bcrypt.compare(new_password, result.rows[0].password_hash);
    if (same) {
      return err("VALIDATION_001", "새 비밀번호가 현재 비밀번호와 같습니다.", 400);
    }
    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [newHash, auth!.sub]
    );
    return ok({ success: true });
  } catch (e: any) {
    console.error("[PATCH user password]", e);
    return err("USER_999", e?.message || "비밀번호 변경에 실패했습니다.", 400);
  }
}
