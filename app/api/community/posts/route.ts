export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { 스토리공개 } from "@/lib/storiesGate";

// 이야기 글 목록 (게시된 글만, 최신순, 카테고리 필터 옵션)
// 이번 오픈에서는 비공개(lib/storiesGate.js) — 화면뿐 아니라 API 도
// 막아야 주소를 아는 사람이 fetch 로 직접 읽어가지 못한다.
export async function GET(req: NextRequest) {
  if (!스토리공개) return ok([]);
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

  const client = await pool.connect();
  try {
    const params: any[] = ["published"];
    let where = "status = $1";
    if (category) {
      params.push(category);
      where += ` AND category = $${params.length}`;
    }
    params.push(limit, offset);
    const res = await client.query(
      `SELECT id, category, title, body, like_count, comment_count, view_count, created_at, published_at
         FROM community_posts
        WHERE ${where}
        ORDER BY published_at DESC NULLS LAST
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return ok(res.rows);
  } catch (e) {
    console.error("[community posts]", e);
    return err("SERVER_001", "글 목록을 불러오지 못했습니다.", 500);
  } finally {
    client.release();
  }
}
