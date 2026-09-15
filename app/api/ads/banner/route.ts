export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok } from "@/lib/api";

/**
 * 배너 광고 자리 — 지금은 자리만 있고 파는 구조는 없다.
 *
 * 관리자가 app_settings 의 `ad_banners` 한 칸에 배너를 적어 두면 그것을 띄운다.
 * 표를 따로 만들지 않은 까닭은 아직 기간·집행·정산이 없어서다. 팔기 시작하면
 * 이 함수가 보는 곳만 표로 바뀌고 화면은 그대로다.
 *
 * 적는 꼴(JSON 배열):
 *   [{ "slot": "jobs", "group": "헤어·바버", "image": "...", "href": "...", "alt": "..." },
 *    { "slot": "jobs", "image": "...", "href": "..." }]
 *
 * 고르는 차례: 그 자리의 **직군이 맞는 것**이 먼저고, 없으면 직군을 안 적은 것
 * (전체 자리)이다. 둘 다 없으면 null 을 돌려주고 화면은 자리 자체를 안 만든다.
 */
type 배너 = { slot?: string; group?: string; image?: string; href?: string; alt?: string };

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const slot = (sp.get("slot") || "").trim();
  const group = (sp.get("group") || "").trim();
  if (!slot) return ok(null);
  try {
    const { rows } = await pool.query(`SELECT value FROM app_settings WHERE key = 'ad_banners'`);
    const 전부: 배너[] = JSON.parse(rows[0]?.value || "[]");
    const 이자리 = 전부.filter((b) => b?.slot === slot && b?.image);
    const 골라 = (group && 이자리.find((b) => b.group === group)) || 이자리.find((b) => !b.group);
    return ok(골라 ?? null);
  } catch {
    // 적어 둔 값이 깨졌어도 화면이 무너지면 안 된다 — 자리를 비운다.
    return ok(null);
  }
}
