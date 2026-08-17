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
        const replies = Array.isArray(parsed.replies) ? parsed.replies : [];
        return { url: String(row.key).slice("jobissue:".length), title: parsed.title || "", items: its, replies, updated_at: row.updated_at };
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

// 이슈 밑에 남기는 수정내용·코멘트. 이슈 본문(items)은 그대로 두고 뒤에 덧붙인다.
// PUT 은 값을 통째로 갈아끼우므로, 두 사람이 같이 보고 있을 때 서로 지워질 수 있다.
// 그래서 붙이는 일은 DB 안에서 끝낸다.
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const key = String(body.key || "").trim();
  const text = String(body.text || "").trim();
  if (!keyAllowed(key)) return err("BAD_REQUEST", "허용되지 않은 key", 400);
  if (!text) return err("VALIDATION_001", "남길 내용을 입력해주세요.");
  if (text.length > 2000) return err("BAD_REQUEST", "코멘트가 너무 깁니다(최대 2000자).", 400);

  const reply = JSON.stringify({ at: new Date().toISOString(), by: auth!.sub, text });

  // 코멘트를 붙였다고 이슈가 새로 보고된 건 아니므로 updated_at 은 건드리지 않는다.
  await pool.query(
    `INSERT INTO app_notes (key, value, updated_at)
     VALUES ($1, jsonb_build_object('items', '[]'::jsonb, 'replies', jsonb_build_array($2::jsonb))::text, now())
     ON CONFLICT (key) DO UPDATE SET value = (
       COALESCE(NULLIF(app_notes.value, '')::jsonb, '{}'::jsonb)
       || jsonb_build_object('replies',
            COALESCE(NULLIF(app_notes.value, '')::jsonb -> 'replies', '[]'::jsonb) || jsonb_build_array($2::jsonb))
     )::text`,
    [key, reply]
  );
  return ok({ key, added: true }, 201);
}

export async function DELETE(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const sp = new URL(req.url).searchParams;
  const key = (sp.get("key") || "").trim();
  if (!keyAllowed(key)) return err("BAD_REQUEST", "허용되지 않은 key", 400);

  // 코멘트 한 줄만 지우는 경우
  const replyIdx = sp.get("reply");
  if (replyIdx !== null) {
    const i = parseInt(replyIdx, 10);
    if (!Number.isInteger(i) || i < 0) return err("BAD_REQUEST", "잘못된 코멘트 번호", 400);
    await pool.query(
      `UPDATE app_notes SET value = (
         COALESCE(NULLIF(value, '')::jsonb, '{}'::jsonb)
         || jsonb_build_object('replies',
              COALESCE(NULLIF(value, '')::jsonb -> 'replies', '[]'::jsonb) - $2::int)
       )::text
       WHERE key = $1`,
      [key, i]
    );
    return ok({ key, removedReply: i });
  }

  await pool.query("DELETE FROM app_notes WHERE key = $1", [key]);
  return ok({ key, deleted: true });
}
