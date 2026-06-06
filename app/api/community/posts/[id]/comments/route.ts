export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { verifyAccessToken } from "@/lib/jwt";

// 댓글 작성 (개인 회원만, 익명 표시)
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
    return err("AUTH_002", "개인 회원만 댓글을 쓸 수 있습니다.", 403);
  }

  const userId = payload.sub;
  let body = "";
  try {
    const json = await req.json();
    body = (json.body || "").trim();
  } catch {
    return err("REQ_001", "잘못된 요청입니다.", 400);
  }
  if (!body) return err("REQ_002", "댓글 내용을 입력해주세요.", 400);
  if (body.length > 1000) return err("REQ_003", "댓글은 1000자 이내로 입력해주세요.", 400);

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

    // 익명 라벨: 같은 글에서 이미 쓴 게 있으면 재사용, 없으면 익명N 부여
    const labelRes = await client.query(
      `SELECT anon_label FROM community_comments WHERE post_id = $1 AND user_id = $2 LIMIT 1`,
      [id, userId]
    );
    let anonLabel: string;
    if (labelRes.rowCount && labelRes.rows[0].anon_label) {
      anonLabel = labelRes.rows[0].anon_label;
    } else {
      const cntRes = await client.query(
        `SELECT COUNT(DISTINCT user_id) AS n FROM community_comments WHERE post_id = $1`,
        [id]
      );
      anonLabel = `익명${Number(cntRes.rows[0].n) + 1}`;
    }

    const insRes = await client.query(
      `INSERT INTO community_comments (post_id, user_id, anon_label, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id, anon_label, body, created_at`,
      [id, userId, anonLabel, body]
    );

    await client.query(
      `UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = $1`,
      [id]
    );

    await client.query("COMMIT");
    return ok(insRes.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("[community comment create]", e);
    return err("SERVER_001", "댓글 등록에 실패했습니다.", 500);
  } finally {
    client.release();
  }
}
