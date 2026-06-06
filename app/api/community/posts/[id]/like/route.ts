export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { verifyAccessToken } from "@/lib/jwt";

// 공감 토글 (개인 회원만): 누르면 추가, 다시 누르면 취소
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return err("AUTH_001", "인증이 필요합니다.", 401);
  let payload: any;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return err("AUTH_001", "유효하지 않은 토큰입니다.", 401);
  }
  if (payload.owner_type !== "user") {
    return err("AUTH_002", "개인 회원만 공감할 수 있습니다.", 403);
  }

  const userId = payload.sub;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const postRes = await client.query(
      `SELECT id FROM community_posts WHERE id = $1 AND status = 'published'`,
      [id]
    );
    if (postRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return err("POST_404", "글을 찾을 수 없습니다.", 404);
    }

    const existing = await client.query(
      `SELECT id FROM community_likes WHERE post_id = $1 AND user_id = $2`,
      [id, userId]
    );

    let liked: boolean;
    if (existing.rowCount && existing.rowCount > 0) {
      await client.query(`DELETE FROM community_likes WHERE post_id = $1 AND user_id = $2`, [id, userId]);
      await client.query(`UPDATE community_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1`, [id]);
      liked = false;
    } else {
      await client.query(`INSERT INTO community_likes (post_id, user_id) VALUES ($1, $2)`, [id, userId]);
      await client.query(`UPDATE community_posts SET like_count = like_count + 1 WHERE id = $1`, [id]);
      liked = true;
    }

    const cntRes = await client.query(`SELECT like_count FROM community_posts WHERE id = $1`, [id]);
    await client.query("COMMIT");
    return ok({ liked, like_count: cntRes.rows[0].like_count });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("[community like]", e);
    return err("SERVER_001", "처리에 실패했습니다.", 500);
  } finally {
    client.release();
  }
}
