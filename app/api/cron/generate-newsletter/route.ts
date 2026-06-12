export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";

// Vercel Cron 이 매주 월요일 호출 (GET). 뉴스레터 draft 1개 자동 생성 (발송은 수동).
export async function GET(req: NextRequest) {
  // 자동 생성 on/off — 관리자페이지 토글 (app_settings.newsletter_autogen)
  try {
    const s = await pool.query(`SELECT value FROM app_settings WHERE key = 'newsletter_autogen'`);
    if (s.rows[0]?.value !== "on") {
      return ok({ disabled: true, message: "뉴스레터 자동 생성이 꺼져 있습니다." });
    }
  } catch (e) {
    console.error("[newsletter cron autogen check]", e);
    return err("SERVER_001", "설정 확인 실패", 500);
  }

  const authHeader = req.headers.get("authorization") || "";
  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get("secret") || "";
  const secret = process.env.CRON_SECRET || "";

  const okAuth =
    secret &&
    (authHeader === `Bearer ${secret}` || querySecret === secret);

  if (!okAuth) {
    return err("AUTH_001", "인증되지 않은 요청입니다.", 401);
  }

  // 이미 검증된 생성 API 를 그대로 호출 (생성 로직 단일화)
  const base =
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://beautynjob.co.kr");

  try {
    const res = await fetch(`${base}/api/admin/newsletters/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cron-secret": secret },
    });
    const json = await res.json();
    if (!json.success) {
      // 뷰티 기사가 없으면 NEWS_003 등이 날 수 있음 — 에러 아니라 정상 흐름으로 로깅만
      console.warn("[newsletter cron] generate skipped:", json.error?.code, json.error?.message);
      return ok({ generated: false, reason: json.error?.message || "생성할 기사가 없습니다." });
    }
    return ok({ generated: true, newsletter: json.data });
  } catch (e: any) {
    console.error("[newsletter cron]", e?.message || e);
    return err("SERVER_001", "뉴스레터 생성에 실패했습니다.", 500);
  }
}