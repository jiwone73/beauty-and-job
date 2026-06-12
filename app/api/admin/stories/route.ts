export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// GET: 글 목록(기본) 또는 신고된 댓글 목록(?type=comments)
export async function GET(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const client = await pool.connect();
  try {
    if (type === "comments") {
      const result = await client.query(
        `SELECT c.id, c.post_id, c.anon_label, c.body, c.status, c.report_count, c.created_at,
                p.title AS post_title
           FROM community_comments c
           JOIN community_posts p ON p.id = c.post_id
          WHERE c.report_count > 0 OR c.status = 'hidden'
          ORDER BY c.report_count DESC, c.created_at DESC`
      );
      return ok(result.rows);
    }

    const result = await client.query(
      `SELECT p.id, p.category, p.title, p.body, p.source, p.status,
              p.like_count, p.comment_count, p.created_at, p.published_at,
              COALESCE(r.cnt, 0)::int AS report_count
         FROM community_posts p
         LEFT JOIN (
           SELECT target_id, COUNT(*) AS cnt
             FROM community_reports
            WHERE target_type = 'post'
            GROUP BY target_id
         ) r ON r.target_id = p.id
        ORDER BY p.created_at DESC`
    );
    return ok(result.rows);
  } catch (e) {
    console.error("[admin stories GET]", e);
    return err("SERVER_001", "목록을 불러오지 못했습니다.", 500);
  } finally {
    client.release();
  }
}

// PATCH: 글/댓글 상태 변경 또는 글 내용 수정.
// body: { target_type, target_id, status? , title?, body?, category? }
export async function PATCH(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  let target_type = "";
  let target_id = "";
  let status: string | undefined;
  let title: string | undefined;
  let body: string | undefined;
  let category: string | undefined;
  try {
    const json = await req.json();
    target_type = json.target_type;
    target_id = json.target_id;
    if (typeof json.status === "string") status = json.status;
    if (typeof json.title === "string") title = json.title;
    if (typeof json.body === "string") body = json.body;
    if (typeof json.category === "string") category = json.category;
  } catch {
    return err("REQ_001", "잘못된 요청입니다.", 400);
  }

  const postStatuses = ["draft", "pending", "published", "hidden"];
  const commentStatuses = ["visible", "hidden"];
  if (target_type !== "post" && target_type !== "comment") {
    return err("REQ_002", "대상이 올바르지 않습니다.", 400);
  }
  if (!target_id) return err("REQ_003", "대상이 없습니다.", 400);

  if (status !== undefined) {
    const allowed = target_type === "post" ? postStatuses : commentStatuses;
    if (!allowed.includes(status)) {
      return err("REQ_004", "상태값이 올바르지 않습니다.", 400);
    }
  }

  const editingContent =
    target_type === "post" && (title !== undefined || body !== undefined || category !== undefined);

  if (status === undefined && !editingContent) {
    return err("REQ_005", "변경할 내용이 없습니다.", 400);
  }

  const client = await pool.connect();
  try {
    if (target_type === "comment") {
      await client.query(`UPDATE community_comments SET status = $1 WHERE id = $2`, [status, target_id]);
      return ok({ updated: true, status });
    }

    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (status !== undefined) { sets.push(`status = $${idx++}`); params.push(status); }
    if (category !== undefined) { sets.push(`category = $${idx++}`); params.push(category); }
    if (title !== undefined) { sets.push(`title = $${idx++}`); params.push(title.trim() || null); }
    if (body !== undefined) { sets.push(`body = $${idx++}`); params.push(body.trim()); }
    if (status === "published") {
      sets.push(`published_at = COALESCE(published_at, now())`);
    }
    params.push(target_id);

    await client.query(
      `UPDATE community_posts SET ${sets.join(", ")} WHERE id = $${idx}`,
      params
    );
    return ok({ updated: true });
  } catch (e) {
    console.error("[admin stories PATCH]", e);
    return err("SERVER_001", "수정에 실패했습니다.", 500);
  } finally {
    client.release();
  }
}


// POST: 운영자 발제 글 작성. body: { category, title, body, status? }
export async function POST(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  let category = "공감";
  let title = "";
  let body = "";
  let status = "published";
  try {
    const json = await req.json();
    if (json.category) category = json.category;
    title = (json.title || "").trim();
    body = (json.body || "").trim();
    if (json.status) status = json.status;
  } catch {
    return err("REQ_001", "잘못된 요청입니다.", 400);
  }
  if (!body) return err("REQ_002", "본문을 입력해주세요.", 400);

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO community_posts (category, title, body, source, status, published_at)
       VALUES ($1, $2, $3, 'admin', $4, CASE WHEN $4 = 'published' THEN now() ELSE NULL END)
       RETURNING id, category, title, body, status, created_at`,
      [category, title || null, body, status]
    );
    return ok(result.rows[0]);
  } catch (e) {
    console.error("[admin stories POST]", e);
    return err("SERVER_001", "글 작성에 실패했습니다.", 500);
  } finally {
    client.release();
  }
}

// DELETE: 글 완전 삭제. ?id=단일 또는 body { ids: string[] } 일괄
export async function DELETE(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const singleId = searchParams.get("id");

  let ids: string[] = [];
  if (singleId) {
    ids = [singleId];
  } else {
    try {
      const json = await req.json();
      if (Array.isArray(json.ids)) ids = json.ids.filter((x: any) => typeof x === "string");
    } catch {
      // body 없음
    }
  }

  if (ids.length === 0) return err("REQ_001", "삭제할 대상이 없습니다.", 400);

  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM community_comments WHERE post_id = ANY($1::uuid[])`, [ids]);
    await client.query(`DELETE FROM community_reports WHERE target_type = 'post' AND target_id = ANY($1::uuid[])`, [ids]);
    const result = await client.query(`DELETE FROM community_posts WHERE id = ANY($1::uuid[])`, [ids]);
    return ok({ deleted: result.rowCount });
  } catch (e) {
    console.error("[admin stories DELETE]", e);
    return err("SERVER_001", "삭제에 실패했습니다.", 500);
  } finally {
    client.release();
  }
}
