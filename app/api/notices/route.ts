export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";

// GET: 공개된 공지 목록. ?type=notice|event, ?q=검색어
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const q = (searchParams.get("q") || "").trim();

  const where: string[] = [`status = 'published'`];
  const params: any[] = [];
  let idx = 1;
  if (type === "notice" || type === "event") { where.push(`type = $${idx++}`); params.push(type); }
  if (q) { where.push(`title ILIKE $${idx++}`); params.push(`%${q}%`); }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, type, title, is_pinned, published_at, created_at
         FROM notices
        WHERE ${where.join(" AND ")}
        ORDER BY is_pinned DESC, COALESCE(published_at, created_at) DESC`,
      params
    );
    return ok(result.rows);
  } catch (e) {
    console.error("[notices GET]", e);
    return err("SERVER_001", "공지사항을 불러오지 못했습니다.", 500);
  } finally {
    client.release();
  }
}