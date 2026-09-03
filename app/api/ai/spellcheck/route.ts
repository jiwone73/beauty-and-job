export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { 맞춤법보기 } from "@/lib/ai/coverLetter";
import { 하루쓴횟수, 하루한도 } from "@/lib/ai/quota";

// 맞춤법 — 고친 전문이 아니라 틀린 곳만 돌려준다. 통째로 갈아치우면 자기가
// 쓴 문장이 어디가 바뀌었는지 모른다(요금도 5분의 1로 줄어든다).
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;
  const userId = auth!.sub;

  const 쓴횟수 = await 하루쓴횟수(userId, "spellcheck");
  if (쓴횟수 >= 하루한도.spellcheck) {
    return err("AI_LIMIT", `맞춤법 검사는 하루 ${하루한도.spellcheck}번까지예요.`, 429);
  }

  const { text } = await req.json().catch(() => ({} as any));
  const 글 = String(text || "").trim();
  if (글.length < 10) return err("AI_SHORT", "검사할 글이 너무 짧아요.", 400);

  try {
    const 고칠것 = await 맞춤법보기(글);
    await pool.query(
      `INSERT INTO ai_usage (user_id, day, kind, count) VALUES ($1, CURRENT_DATE, 'spellcheck', 1)
       ON CONFLICT (user_id, day, kind) DO UPDATE SET count = ai_usage.count + 1`, [userId]
    );
    return ok({ items: 고칠것 });
  } catch (e: any) {
    console.error("[ai spellcheck]", e?.message || e);
    return err("AI_FAIL", "검사하지 못했어요. 잠시 후 다시 눌러 주세요.", 502);
  }
}
