export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (email) {
    try {
      await pool.query(
        `UPDATE newsletter_subscribers SET is_active = false WHERE email = $1`,
        [email.toLowerCase().trim()]
      );
    } catch (e) {
      console.error("[unsubscribe]", e);
    }
  }
  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>수신거부 완료</title></head>
  <body style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafafa;">
    <div style="text-align:center;padding:32px;">
      <h1 style="color:#5f0080;font-size:22px;margin:0 0 12px;">수신거부 완료</h1>
      <p style="color:#666;font-size:15px;line-height:1.6;">뷰티앤잡 뉴스레터 수신이 해제되었습니다.<br/>그동안 함께해 주셔서 감사합니다.</p>
    </div>
  </body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}