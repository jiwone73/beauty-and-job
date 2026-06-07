export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import Anthropic from "@anthropic-ai/sdk";

const CATEGORIES = ["공감", "꿀팁", "질문", "정보"];

// 운영자/크론이 호출: AI가 발제 글 1개 생성 -> pending 으로 저장
export async function POST(req: NextRequest) {
  // 인증: 어드민 토큰 또는 cron 시크릿
  const cronSecret = req.headers.get("x-cron-secret");
  const isCron = cronSecret && cronSecret === process.env.CRON_SECRET;
  if (!isCron) {
    const { res: authErr } = requireAuth(req, "admin");
    if (authErr) return authErr;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return err("CONFIG_001", "AI 키가 설정되지 않았습니다.", 500);
  }

  let category = "";
  try {
    const json = await req.json();
    if (json && json.category) category = json.category;
  } catch {
    // body 없으면 무시 (cron 호출 등)
  }
  if (!CATEGORIES.includes(category)) {
    category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  }

  const client = await pool.connect();
  try {
    const recent = await client.query(
      `SELECT title FROM community_posts ORDER BY created_at DESC LIMIT 20`
    );
    const recentTitles = recent.rows.map((r: any) => r.title).filter(Boolean).join("\n");

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const sys = `당신은 한국의 뷰티 산업(미용실, 네일샵, 피부관리, 메이크업, 왁싱 등) 종사자 커뮤니티 "현장이야기"의 콘텐츠 에디터입니다.
현장 종사자들이 공감하고 댓글을 달고 싶어할 '발제 글'을 작성합니다.

규칙:
- 절대 가짜 1인칭 경험담("제가 어제 겪었는데...")을 쓰지 마세요. 운영자가 올리는 발제/질문/정보 형식이어야 합니다.
- 댓글로 경험을 나누도록 유도하는 질문형 마무리를 넣으세요.
- 외부 글을 베끼지 말고 오리지널로 작성하세요.
- 따뜻하고 친근한 구어체. 과한 이모지 금지(0~1개).
- 카테고리별 성격: 공감=현장의 고충/감정 화두, 꿀팁=실무 노하우, 질문=고민 상담 화두, 정보=알아두면 좋은 사실.

반드시 아래 JSON 형식으로만 응답하세요. 그 외 텍스트(설명, 마크다운 코드블록)는 절대 출력하지 마세요.
{"title": "제목 (공백 포함 30자 이내)", "body": "본문 (2~4문장, 200자 이내, 질문형 마무리)"}`;

    const user = `카테고리: ${category}
다음은 최근에 이미 올라온 제목들입니다. 이와 겹치지 않는 새로운 주제로 작성하세요:
${recentTitles || "(없음)"}`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: sys,
      messages: [{ role: "user", content: user }],
    });

    const text = msg.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .trim();

    let parsed: { title?: string; body?: string };
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error("[stories generate] JSON parse fail:", text);
      return err("AI_001", "AI 응답을 해석하지 못했습니다.", 502);
    }

    const title = (parsed.title || "").trim();
    const body = (parsed.body || "").trim();
    if (!body) return err("AI_002", "AI가 본문을 생성하지 못했습니다.", 502);

    const result = await client.query(
      `INSERT INTO community_posts (category, title, body, source, status, published_at)
       VALUES ($1, $2, $3, 'ai', 'pending', NULL)
       RETURNING id, category, title, body, status, created_at`,
      [category, title || null, body]
    );

    return ok(result.rows[0]);
  } catch (e: any) {
    console.error("[stories generate]", e?.message || e);
    return err("SERVER_001", "글 생성에 실패했습니다.", 500);
  } finally {
    client.release();
  }
}
