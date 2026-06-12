export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import Anthropic from "@anthropic-ai/sdk";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://beauty-and-job.vercel.app";
const LOGO_URL = `${SITE_URL}/images/logo.png`;
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

const NEWS_QUERY = "화장품";   // 원하는 키워드로 조정 가능 (예: "K뷰티", "뷰티 트렌드")
const DISPLAY = 8;             // 네이버에서 가져올 기사 수
const USE_COUNT = 6;           // 뉴스레터에 실제로 넣을 기사 수

function cleanText(s: string): string {
  return (s || "")
    .replace(/<\/?b>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

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
  const naverId = process.env.NAVER_CLIENT_ID;
  const naverSecret = process.env.NAVER_CLIENT_SECRET;
  if (!naverId || !naverSecret) {
    return err("CONFIG_002", "네이버 API 키가 설정되지 않았습니다.", 500);
  }

  // 1) 네이버 뉴스 수집 (최신순)
  let articles: { title: string; link: string }[] = [];
  try {
    const q = encodeURIComponent(NEWS_QUERY);
    const nres = await fetch(
      `https://openapi.naver.com/v1/search/news.json?query=${q}&display=${DISPLAY}&sort=date`,
      { headers: { "X-Naver-Client-Id": naverId, "X-Naver-Client-Secret": naverSecret } }
    );
    if (!nres.ok) return err("NEWS_001", "뉴스 수집에 실패했습니다.", 502);
    const ndata = await nres.json();
    articles = (ndata.items || [])
      .map((it: any) => ({ title: cleanText(it.title), link: it.originallink || it.link }))
      .filter((a: any) => a.title && a.link)
      .slice(0, USE_COUNT);
  } catch (e) {
    console.error("[newsletter naver]", e);
    return err("NEWS_001", "뉴스 수집 중 오류가 발생했습니다.", 502);
  }
  if (articles.length === 0) return err("NEWS_002", "수집된 뉴스가 없습니다.", 502);

  // 2) AI 큐레이션 (인트로 + 기사별 코멘트)
  let curation: { newsletter_title?: string; intro?: string; comments?: string[] };
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const titleList = articles.map((a, i) => `${i + 1}. ${a.title}`).join("\n");
    const sys = `당신은 한국 뷰티 산업 채용 플랫폼 "뷰티앤잡"의 주간 뉴스레터 에디터입니다.
아래 뷰티 업계 뉴스 기사 제목 목록을 보고 큐레이션을 작성합니다.

규칙:
- 기사 제목을 그대로 베끼지 말고 당신의 말로 코멘트를 쓰세요.
- 제목에 없는 사실(숫자, 인용 등)을 절대 지어내지 마세요.
- 따뜻하고 간결한 구어체. 과한 이모지 금지.
- comments 배열은 입력 기사 순서와 정확히 일치해야 하며, 각 항목은 1문장(왜 읽어볼 만한지)입니다.

반드시 아래 JSON만 출력하세요. 그 외 텍스트/마크다운 코드블록 금지.
{"newsletter_title": "이번 주 뉴스레터 제목 (30자 이내)", "intro": "인트로 (2~3문장, 이번 주 흐름 요약)", "comments": ["기사1 코멘트", "기사2 코멘트", ...]}`;
    const user = `이번 주 뷰티 업계 뉴스 제목:\n${titleList}`;
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: sys,
      messages: [{ role: "user", content: user }],
    });
    const text = msg.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .trim();
    curation = JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (e) {
    console.error("[newsletter ai]", e);
    return err("AI_001", "AI 큐레이션에 실패했습니다.", 502);
  }

  const newsletterTitle = (curation.newsletter_title || "이번 주 뷰티 업계 소식").trim();
  const intro = (curation.intro || "").trim();
  const comments = Array.isArray(curation.comments) ? curation.comments : [];

  // 3) HTML 조합 (제목 + AI 코멘트 + 원문 링크)
  const cardsHtml = articles.map((a, i) => {
    const comment = cleanText(comments[i] || "");
    return `
      <tr><td style="padding:0 0 12px;">
        <a href="${a.link}" target="_blank" style="text-decoration:none;color:inherit;display:block;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #eeeeee;border-radius:10px;">
            <tr><td style="padding:16px 18px;">
              <p style="font-size:15px;font-weight:700;color:#1a1a1a;margin:0 0 6px;line-height:1.45;">${a.title}</p>
              ${comment ? `<p style="font-size:13px;color:#5f5e5a;margin:0 0 8px;line-height:1.6;">${comment}</p>` : ""}
              <span style="font-size:13px;color:#7c3aed;">원문 보기 ›</span>
            </td></tr>
          </table>
        </a>
      </td></tr>`;
  }).join("");

  const contentHtml = `
    <div style="background:#f7f6f9;padding:24px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td align="center" bgcolor="#f4eefc" style="padding:24px 32px;border-bottom:1px solid #e9ddf7;">
                <img src="${LOGO_URL}" alt="뷰티앤잡" height="30" style="display:block;border:0;height:30px;" />
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px 8px;">
                <p style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0 0 10px;line-height:1.4;">${newsletterTitle}</p>
                ${intro ? `<p style="font-size:14px;color:#5f5e5a;margin:0 0 22px;line-height:1.7;">${intro}</p>` : ""}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${cardsHtml}
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:16px auto 28px;">
                  <tr><td align="center" bgcolor="#5f0080" style="border-radius:8px;">
                    <a href="${SITE_URL}/jobs" style="display:inline-block;padding:13px 34px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">뷰티앤잡에서 공고 보기</a>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#f6f3fb" style="padding:20px 28px;">
                <p style="font-size:12px;color:#888780;margin:0 0 6px;line-height:1.6;">이 메일은 뉴스레터 수신에 동의하신 분께 발송되었습니다.</p>
                <p style="font-size:12px;color:#888780;margin:0;">
                  뷰티앤잡 · <a href="${SITE_URL}" style="color:#888780;text-decoration:none;">${SITE_HOST}</a><br/>
                  <a href="{{UNSUBSCRIBE_URL}}" style="color:#8b5cf6;text-decoration:none;">뉴스레터 수신거부</a> &nbsp;·&nbsp; © 2026 뷰티앤잡
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </div>`;

  // 4) draft 저장
  try {
    const result = await pool.query(
      `INSERT INTO newsletters (title, intro, content_html, source, status)
       VALUES ($1, $2, $3, 'ai', 'draft')
       RETURNING id, title, status, created_at`,
      [newsletterTitle, intro || null, contentHtml]
    );
    return ok({ ...result.rows[0], article_count: articles.length });
  } catch (e: any) {
    console.error("[newsletter save]", e?.message || e);
    return err("SERVER_001", "뉴스레터 저장에 실패했습니다.", 500);
  }
}