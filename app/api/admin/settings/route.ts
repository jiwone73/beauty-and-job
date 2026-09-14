export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// plan_sales 는 판매 개시 스위치(통신판매업 신고 전에는 off),
// plan_bank 는 무통장입금 계좌 안내다. 계좌는 코드에 박지 않는다 — 바뀌는 값이고
// 지어내면 엉뚱한 곳으로 돈이 간다.
const ALLOWED_KEYS = ["story_autogen", "newsletter_autogen", "plan_sales", "plan_bank"];

export async function GET(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const client = await pool.connect();
  try {
    const result = await client.query(`SELECT key, value FROM app_settings`);
    const settings: Record<string, string> = {};
    for (const row of result.rows) settings[row.key] = row.value;
    return ok(settings);
  } catch (e) {
    console.error("[admin settings GET]", e);
    return err("SERVER_001", "설정을 불러오지 못했습니다.", 500);
  } finally {
    client.release();
  }
}

export async function PATCH(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  let key = "", value = "";
  try {
    const json = await req.json();
    key = json.key; value = json.value;
  } catch {
    return err("REQ_001", "잘못된 요청입니다.", 400);
  }
  if (!ALLOWED_KEYS.includes(key)) {
    return err("REQ_002", "허용되지 않은 설정입니다.", 400);
  }
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, value]
    );
    return ok({ key, value });
  } catch (e) {
    console.error("[admin settings PATCH]", e);
    return err("SERVER_001", "설정 변경에 실패했습니다.", 500);
  } finally {
    client.release();
  }
}