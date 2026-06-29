export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";

// Vercel Cron 이 매주 월요일 호출 (GET). 토글 ON 이면 생성 + 발송까지 자동.
export async function GET(req: NextRequest) {
  // 자동 발송 on/off — 관리자페이지 토글 (app_settings.newsletter_autogen)
  try {
    const s = await pool.query(`SELECT value FROM app_settings WHERE key = 'newsletter_autogen'`);
    if (s.rows[0]?.value !== "on") {
      return ok({ disabled: true, message: "뉴스레터 자동 발송이 꺼져 있습니다." });
    }
  } catch (e) {
    console.error("[newsletter cron autogen check]", e);
    return err("SERVER_001", "설정 확인 실패", 500);
  }

  const authHeader = req.headers.get("authorization") || "";
  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get("secret") || "";
  const secret = process.env.CRON_SECRET || "";
  const okAuth = secret && (authHeader === `Bearer ${secret}` || querySecret === secret);
  if (!okAuth) return err("AUTH_001", "인증되지 않은 요청입니다.", 401);

  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://beauty-work.vercel.app");

  // 1) 생성
  let newsletterId: string;
  try {
    const res = await fetch(`${base}/api/admin/newsletters/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cron-secret": secret },
    });
    const json = await res.json();
    if (!json.success || !json.data?.id) {
      // 뷰티 기사가 없으면 NEWS_003 등 — 에러 아니라 '건너뜀'으로 처리
      console.warn("[newsletter cron] generate skipped:", json.error?.code, json.error?.message);
      return ok({ generated: false, reason: json.error?.message || "생성할 기사가 없습니다." });
    }
    newsletterId = json.data.id;
  } catch (e: any) {
    console.error("[newsletter cron generate]", e?.message || e);
    return err("SERVER_001", "뉴스레터 생성에 실패했습니다.", 500);
  }

  // 2) 발송
  try {
    const res = await fetch(`${base}/api/admin/newsletters/${newsletterId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cron-secret": secret },
    });
    const json = await res.json();
    if (!json.success) {
      console.warn("[newsletter cron] send fail:", json.error?.code, json.error?.message);
      return ok({ generated: true, sent: false, id: newsletterId, reason: json.error?.message });
    }
    return ok({ generated: true, sent: true, id: newsletterId, count: json.data?.sent ?? 0 });
  } catch (e: any) {
    console.error("[newsletter cron send]", e?.message || e);
    return ok({ generated: true, sent: false, id: newsletterId, reason: "발송 호출 실패" });
  }
}