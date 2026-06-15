export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

const TARGETS = ["all", "user", "company"];

export async function GET(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, type, target, title, body, is_pinned, status, published_at, created_at, updated_at
         FROM notices
        ORDER BY is_pinned DESC, created_at DESC`
    );
    return ok(result.rows);
  } catch (e) {
    console.error("[admin notices GET]", e);
    return err("SERVER_001", "목록을 불러오지 못했습니다.", 500);
  } finally { client.release(); }
}

export async function POST(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  let type = "notice", title = "", body = "", status = "published", is_pinned = false, target = "all";
  try {
    const json = await req.json();
    if (json.type === "notice" || json.type === "event") type = json.type;
    title = (json.title || "").trim();
    body = (json.body || "").trim();
    if (json.status === "draft" || json.status === "published") status = json.status;
    is_pinned = !!json.is_pinned;
    if (TARGETS.includes(json.target)) target = json.target;
  } catch {
    return err("REQ_001", "잘못된 요청입니다.", 400);
  }
  if (!title) return err("REQ_002", "제목을 입력해주세요.", 400);
  if (!body) return err("REQ_003", "내용을 입력해주세요.", 400);
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO notices (type, title, body, status, is_pinned, target, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $4 = 'published' THEN now() ELSE NULL END)
       RETURNING id, type, target, title, body, status, is_pinned, published_at, created_at`,
      [type, title, body, status, is_pinned, target]
    );
    return ok(result.rows[0]);
  } catch (e) {
    console.error("[admin notices POST]", e);
    return err("SERVER_001", "작성에 실패했습니다.", 500);
  } finally { client.release(); }
}

export async function PATCH(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  let id = "";
  let type: string | undefined, title: string | undefined, body: string | undefined,
      status: string | undefined, is_pinned: boolean | undefined, target: string | undefined;
  try {
    const json = await req.json();
    id = json.id;
    if (json.type === "notice" || json.type === "event") type = json.type;
    if (typeof json.title === "string") title = json.title;
    if (typeof json.body === "string") body = json.body;
    if (json.status === "draft" || json.status === "published") status = json.status;
    if (typeof json.is_pinned === "boolean") is_pinned = json.is_pinned;
    if (TARGETS.includes(json.target)) target = json.target;
  } catch {
    return err("REQ_001", "잘못된 요청입니다.", 400);
  }
  if (!id) return err("REQ_002", "대상이 없습니다.", 400);
  const sets: string[] = [];
  const params: any[] = [];
  let idx = 1;
  if (type !== undefined) { sets.push(`type = $${idx++}`); params.push(type); }
  if (target !== undefined) { sets.push(`target = $${idx++}`); params.push(target); }
  if (title !== undefined) { sets.push(`title = $${idx++}`); params.push(title.trim()); }
  if (body !== undefined) { sets.push(`body = $${idx++}`); params.push(body.trim()); }
  if (is_pinned !== undefined) { sets.push(`is_pinned = $${idx++}`); params.push(is_pinned); }
  if (status !== undefined) {
    sets.push(`status = $${idx++}`); params.push(status);
    if (status === "published") sets.push(`published_at = COALESCE(published_at, now())`);
  }
  if (sets.length === 0) return err("REQ_003", "변경할 내용이 없습니다.", 400);
  sets.push(`updated_at = now()`);
  params.push(id);
  const client = await pool.connect();
  try {
    await client.query(`UPDATE notices SET ${sets.join(", ")} WHERE id = $${idx}`, params);
    return ok({ updated: true });
  } catch (e) {
    console.error("[admin notices PATCH]", e);
    return err("SERVER_001", "수정에 실패했습니다.", 500);
  } finally { client.release(); }
}

export async function DELETE(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const { searchParams } = new URL(req.url);
  const singleId = searchParams.get("id");
  let ids: string[] = [];
  if (singleId) ids = [singleId];
  else {
    try {
      const json = await req.json();
      if (Array.isArray(json.ids)) ids = json.ids.filter((x: any) => typeof x === "string");
    } catch {}
  }
  if (ids.length === 0) return err("REQ_001", "삭제할 대상이 없습니다.", 400);
  const client = await pool.connect();
  try {
    const result = await client.query(`DELETE FROM notices WHERE id = ANY($1::uuid[])`, [ids]);
    return ok({ deleted: result.rowCount });
  } catch (e) {
    console.error("[admin notices DELETE]", e);
    return err("SERVER_001", "삭제에 실패했습니다.", 500);
  } finally { client.release(); }
}