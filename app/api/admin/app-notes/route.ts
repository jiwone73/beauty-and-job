export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 관리자 자유 메모(키-값). 아웃리치 "등록 이슈 노트" 등 화면별 메모 저장.
// 테이블: app_notes (migrations/2026-08-10_app_notes.sql)

// 허용 key: 공고별 이슈메모(jobissue:<원문 URL>) — 불러온 공고에 이슈 메모를 매칭
function keyAllowed(key: string): boolean {
  return /^jobissue:https?:\/\/[^\s]{1,1000}$/.test(key);
}

export async function GET(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const sp = new URL(req.url).searchParams;

  // 전체 공고 이슈 모아보기: jobissue:* 를 모두 반환(이슈 항목이 있는 것만).
  if (sp.get("list") === "jobissue") {
    const r = await pool.query("SELECT key, value, updated_at FROM app_notes WHERE key LIKE 'jobissue:%' ORDER BY updated_at DESC");
    const items = r.rows
      .map((row) => {
        let parsed: any = {};
        try { parsed = JSON.parse(row.value || "{}"); } catch { parsed = {}; }
        const its = Array.isArray(parsed.items)
          ? parsed.items.filter((x: any) => x && (x.field || String(x.note || "").trim()))
          : [];
        return { url: String(row.key).slice("jobissue:".length), title: parsed.title || "", items: its, updated_at: row.updated_at };
      })
      .filter((x) => x.items.length > 0);
    return ok({ items });
  }

  const key = (sp.get("key") || "").trim();
  if (!keyAllowed(key)) return err("BAD_REQUEST", "허용되지 않은 key", 400);
  const r = await pool.query("SELECT value, updated_at FROM app_notes WHERE key = $1", [key]);
  return ok({ key, value: r.rows[0]?.value ?? "", updated_at: r.rows[0]?.updated_at ?? null });
}

export async function PUT(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const body = await req.json().catch(() => ({}));
  const key = String(body.key || "").trim();
  const value = typeof body.value === "string" ? body.value : "";
  if (!keyAllowed(key)) return err("BAD_REQUEST", "허용되지 않은 key", 400);
  if (value.length > 20000) return err("BAD_REQUEST", "메모가 너무 깁니다(최대 20000자).", 400);
  const r = await pool.query(
    `INSERT INTO app_notes (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
     RETURNING updated_at`,
    [key, value]
  );
  return ok({ key, updated_at: r.rows[0].updated_at });
}

export async function DELETE(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const key = (new URL(req.url).searchParams.get("key") || "").trim();
  if (!keyAllowed(key)) return err("BAD_REQUEST", "허용되지 않은 key", 400);
  await pool.query("DELETE FROM app_notes WHERE key = $1", [key]);
  return ok({ key, deleted: true });
}
