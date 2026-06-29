export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import Anthropic from "@anthropic-ai/sdk";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://beauty-work.vercel.app";
const LOGO_URL = `${SITE_URL}/images/logo.png`;
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

const NEWS_QUERY = "화장품";   // 검색 키워드 (예: "K뷰티", "뷰티 트렌드")
const DISPLAY = 20;            // 네이버에서 넉넉히 수집
const MAX_SELECT = 6;          // AI가 뷰티 관련으로 선별할 최대 개수

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
  // 인증: 어드민 또는 cron
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
      .slice(0, DISPLAY);
  } catch (e) {
    console.error("[newsletter naver]", e);
    return err("NEWS_001", "뉴스 수집 중 오류가 발생했습니다.", 502);
  }
  if (articles.length === 0) return err("NEWS_002", "수집된 뉴스가 없습니다.", 502);

  // 2) AI 큐레이션 + 뷰티 관련 선별
  let curation: { newsletter_title?: string; intro?: string; items?: { index: number; comment: string }[] };
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const titleList = articles.map((a, i) => `${i + 1}. ${a.title}`).join("\n");
    const sys = `당신은 한국 뷰티 산업 채용 플랫폼 "뷰티워크"의 주간 뉴스레터 에디터입니다.
아래 뉴스 제목 목록 중 뷰티 업계(화장품·미용·메이크업·헤어·네일·피부미용·뷰티 브랜드/유통/트렌드)와 직접 관련된 기사만 골라 큐레이션합니다.

규칙:
- 뷰티와 무관하거나 관련성이 낮은 기사(일반 정치·경제, 단순 주가, 타 산업, 광고·홍보성)는 반드시 제외하세요.
- 관련 있고 읽을 가치가 있는 기사만 최대 ${MAX_SELECT}개 선별하세요. 적으면 적은 대로 괜찮습니다.
- 제목을 그대로 베끼지 말고 당신의 말로 코멘트(1문장, 왜 읽어볼 만한지)를 쓰세요.
- 제목에 없는 사실(숫자·인용 등)을 절대 지어내지 마세요.
- 따뜻하고 간결한 구어체. 과한 이모지 금지.

반드시 아래 JSON만 출력하세요. items의 index는 입력 목록의 번호입니다. 그 외 텍스트/마크다운 금지.
{"newsletter_title":"제목(30자 이내)","intro":"인트로(2~3문장, 이번 주 흐름 요약)","items":[{"index":번호,"comment":"코멘트"}]}`;
    const user = `이번 주 뉴스 제목 목록:\n${titleList}`;
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
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

  // AI가 선별한 기사만 추림 (유효한 index만)
  const rawItems = Array.isArray(curation.items) ? curation.items : [];
  const selected = rawItems
    .map((it) => {
      const a = articles[Number(it.index) - 1];
      if (!a) return null;
      return { ...a, comment: cleanText(it.comment || "") };
    })
    .filter((x): x is { title: string; link: string; comment: string } => x !== null)
    .slice(0, MAX_SELECT);

  if (selected.length === 0) {
    return err("NEWS_003", "이번 주 뷰티 업계 관련 뉴스를 찾지 못했습니다.", 502);
  }

  // 3) HTML 조합 (제목 + AI 코멘트 + 원문 링크)
  const cardsHtml = selected.map((a) => {
    return `
      <tr><td style="padding:0 0 12px;">
        <a href="${a.link}" target="_blank" style="text-decoration:none;color:inherit;display:block;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #eeeeee;border-radius:10px;">
            <tr><td style="padding:16px 18px;">
              <p style="font-size:15px;font-weight:700;color:#1a1a1a;margin:0 0 6px;line-height:1.45;">${a.title}</p>
              ${a.comment ? `<p style="font-size:13px;color:#5f5e5a;margin:0 0 8px;line-height:1.6;">${a.comment}</p>` : ""}
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
                <img src="${LOGO_URL}" alt="뷰티워크" height="30" style="display:block;border:0;height:30px;" />
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px 8px;">
                <p style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0 0 10px;line-height:1.4;">${newsletterTitle}</p>
                ${intro ? `<p style="font-size:14px;color:#5f5e5a;margin:0 0 22px;line-height:1.7;">${intro}</p>` : ""}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${cardsHtml}
                </table>
                <p style="font-size:13px;color:#666666;text-align:center;margin:18px 0 14px;line-height:1.6;">오늘 소식이 흥미로웠다면, 뷰티워크에서 더 많은 이야기와 채용 정보를 만나보세요.</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 28px;">
                  <tr><td align="center" bgcolor="#5f0080" style="border-radius:8px;">
                    <a href="${SITE_URL}" style="display:inline-block;padding:13px 34px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">뷰티워크 둘러보기</a>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#f6f3fb" style="padding:20px 28px;">
                <p style="font-size:12px;color:#888780;margin:0 0 6px;line-height:1.6;">이 메일은 뉴스레터 수신에 동의하신 분께 발송되었습니다.</p>
                <p style="font-size:12px;color:#888780;margin:0;">
                  뷰티워크 · <a href="${SITE_URL}" style="color:#888780;text-decoration:none;">${SITE_HOST}</a><br/>
                  <a href="{{UNSUBSCRIBE_URL}}" style="color:#8b5cf6;text-decoration:none;">뉴스레터 수신거부</a> &nbsp;·&nbsp; © 2026 뷰티워크
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
    return ok({ ...result.rows[0], article_count: selected.length });
  } catch (e: any) {
    console.error("[newsletter save]", e?.message || e);
    return err("SERVER_001", "뉴스레터 저장에 실패했습니다.", 500);
  }
}