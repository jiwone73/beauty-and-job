export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";

// GET: 공지 상세 (게시된 것만)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!id) return err("REQ_001", "잘못된 요청입니다.", 400);

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, type, title, body, is_pinned, published_at, created_at
         FROM notices
        WHERE id = $1 AND status = 'published'`,
      [id]
    );
    if (result.rowCount === 0) return err("NOT_FOUND", "공지사항을 찾을 수 없습니다.", 404);
    return ok(result.rows[0]);
  } catch (e) {
    console.error("[notice detail GET]", e);
    return err("SERVER_001", "불러오지 못했습니다.", 500);
  } finally {
    client.release();
  }
}