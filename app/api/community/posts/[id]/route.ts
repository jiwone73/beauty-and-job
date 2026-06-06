export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";

// 글 상세 + 댓글 목록
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const client = await pool.connect();
  try {
    const postRes = await client.query(
      `SELECT id, category, title, body, like_count, comment_count, created_at, published_at
         FROM community_posts
        WHERE id = $1 AND status = 'published'`,
      [id]
    );
    if (postRes.rowCount === 0) {
      return err("POST_404", "글을 찾을 수 없습니다.", 404);
    }

    const commentRes = await client.query(
      `SELECT id, anon_label, body, created_at
         FROM community_comments
        WHERE post_id = $1 AND status = 'visible'
        ORDER BY created_at ASC`,
      [id]
    );

    return ok({ post: postRes.rows[0], comments: commentRes.rows });
  } catch (e) {
    console.error("[community post detail]", e);
    return err("SERVER_001", "글을 불러오지 못했습니다.", 500);
  } finally {
    client.release();
  }
}
