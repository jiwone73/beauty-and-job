export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const { current_password, new_password } = await req.json().catch(() => ({}));

  if (!current_password || !new_password) {
    return err("AUTH_001", "현재 비밀번호와 새 비밀번호를 입력해주세요.", 400);
  }
  if (new_password.length < 8) {
    return err("VALIDATION_001", "새 비밀번호는 8자 이상이어야 합니다.", 400);
  }

  try {
    // 현재 비밀번호 확인
    const result = await pool.query(
      `SELECT password_hash FROM companies WHERE id = $1`,
      [auth!.sub]
    );
    if (result.rowCount === 0) {
      return err("CO_001", "계정을 찾을 수 없습니다.", 404);
    }

    const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!valid) {
      return err("AUTH_002", "현재 비밀번호가 올바르지 않습니다.", 400);
    }

    // 새 비밀번호가 현재와 같으면 막기
    const same = await bcrypt.compare(new_password, result.rows[0].password_hash);
    if (same) {
      return err("VALIDATION_001", "새 비밀번호가 현재 비밀번호와 같습니다.", 400);
    }

    // 해시 후 저장
    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query(
      `UPDATE companies SET password_hash = $1 WHERE id = $2`,
      [newHash, auth!.sub]
    );

    return ok({ success: true });
  } catch (e: any) {
    console.error("[PATCH password]", e);
    return err("CO_999", e?.message || "비밀번호 변경에 실패했습니다.", 400);
  }
}