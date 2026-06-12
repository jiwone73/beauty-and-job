export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const r = await pool.query(
    `SELECT content_html FROM newsletters WHERE id = $1`,
    [params.id]
  );
  if (r.rowCount === 0) return new Response("Not found", { status: 404 });

  // 수신거부 자리표시자는 미리보기에선 #으로
  const html = (r.rows[0].content_html || "").replace(/\{\{UNSUBSCRIBE_URL\}\}/g, "#");
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}