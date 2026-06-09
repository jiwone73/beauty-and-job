export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { verifyAccessToken } from "@/lib/jwt";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return err("AUTH_001", "인증이 필요합니다.", 401);
  let userId: string;
  try {
    const payload = verifyAccessToken(token);
    if (payload.owner_type !== "user") return err("AUTH_002", "사용자 권한이 필요합니다.", 403);
    userId = payload.sub as string;
  } catch {
    return err("AUTH_001", "유효하지 않은 토큰입니다.", 401);
  }

  await pool.query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
    [params.id, userId]
  );
  return ok({ updated: true });
}
