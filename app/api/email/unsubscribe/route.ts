export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";

const RECOMMENDATION_TERM_ID = "fb392275-4dc3-45cd-ad26-c59b3e571cee";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://beautywork.vercel.app";

function expected(userId: string) {
  return crypto.createHmac("sha256", process.env.CRON_SECRET || "").update(userId).digest("hex");
}
function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
function page(title: string, message: string) {
  return new NextResponse(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
     <meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head>
     <body style="margin:0;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;background:#f7f6f9;">
       <div style="max-width:420px;margin:80px auto;background:#fff;border-radius:12px;padding:36px 28px;text-align:center;">
         <p style="font-size:20px;font-weight:700;color:#5f0080;margin:0 0 12px;">${title}</p>
         <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 24px;">${message}</p>
         <a href="${SITE_URL}" style="display:inline-block;padding:12px 26px;background:#5f0080;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">뷰티워크로</a>
       </div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  const t = req.nextUrl.searchParams.get("t");

  if (!u || !t || !safeEqual(t, expected(u))) {
    return page("링크가 올바르지 않아요", "수신거부 링크가 유효하지 않습니다.");
  }

  await pool.query(
    `DELETE FROM term_agreements WHERE owner_type='user' AND owner_id=$1 AND term_id=$2`,
    [u, RECOMMENDATION_TERM_ID]
  );

  return page("수신거부 완료", "추천 채용공고 알림 메일 수신이 해제되었어요. 설정에서 언제든 다시 켤 수 있어요.");
}
