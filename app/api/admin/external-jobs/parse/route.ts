export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ok, err, requireAuth } from "@/lib/api";

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
function extractJsonLd(html: string): string {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1].trim());
  return blocks.join("\n").slice(0, 4000);
}
function metaContent(html: string, prop: string): string {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i");
  const m = html.match(re);
  return m ? m[1].trim() : "";
}

export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const b = await req.json().catch(() => ({}));
  let url = (b.url || "").trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  let hostname = "";
  try { hostname = new URL(url).hostname.replace(/^www\./, ""); }
  catch { return err("VALIDATION_001", "올바른 URL을 입력해주세요.", 400); }

  let html = "";
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 12000);
    const r = await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BeautyworkBot/1.0)", "Accept-Language": "ko,en;q=0.8" },
    });
    clearTimeout(t);
    if (!r.ok) return err("FETCH_001", `페이지를 불러오지 못했어요 (HTTP ${r.status}).`, 502);
    html = await r.text();
  } catch (e: any) {
    return err("FETCH_002", "페이지를 불러오지 못했어요. 접근이 막혀 있거나 시간이 초과됐어요.", 502);
  }

  const jsonld = extractJsonLd(html);
  const text = htmlToText(html).slice(0, 9000);
  const ogTitle = metaContent(html, "og:title") || (html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || "");
  const ogDesc = metaContent(html, "og:description");
  const emails = [...new Set((html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []))]
    .filter((e) => !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(e)).slice(0, 5);

  let out: any = {
    company_name: "", homepage_url: "", contact_email: emails[0] || "",
    title: ogTitle, job_type: "STORE", location: "", deadline: "",
    apply_method: emails[0] ? "EMAIL" : "MANAGED", external_apply_url: "",
    description: ogDesc,
  };

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const sys = `너는 뷰티 채용공고 페이지에서 핵심 정보를 뽑아 JSON으로 정리하는 도우미야.
반드시 아래 키를 가진 JSON "하나만" 출력해(설명·코드펜스 금지):
{"company_name","homepage_url","contact_email","title","job_type","location","deadline","apply_method","external_apply_url","description"}
규칙:
- job_type: 미용실·네일·피부·속눈썹 등 현장 미용직이면 "STORE", 화장품 브랜드·유통·본사 등 사무직이면 "OFFICE".
- deadline: "YYYY-MM-DD" 형식 또는 상시/미상이면 "".
- apply_method: 채용 이메일이 보이면 "EMAIL"(그 이메일을 contact_email에), 지원이 특정 지원페이지에서만 가능하면 "REDIRECT"(그 링크를 external_apply_url에), 애매하면 "MANAGED".
- description: 원문을 그대로 복제하지 말고 한국어로 3~5문장 핵심 요약(직무·자격·근무조건 중심). 저작권 보호를 위해 문장을 재작성할 것.
- 모르는 값은 빈 문자열 "".`;
      const user = `URL: ${url}\n호스트: ${hostname}\n\n[JSON-LD]\n${jsonld || "(없음)"}\n\n[페이지 텍스트]\n${text}`;
      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1200,
        system: sys,
        messages: [{ role: "user", content: user }],
      });
      const raw = msg.content.map((c: any) => (c.type === "text" ? c.text : "")).join("").trim();
      const jsonStr = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(jsonStr);
      out = { ...out, ...parsed };
    } catch (e) {
      console.error("[external parse LLM]", e);
    }
  }

  out.source_site = hostname;
  out.source_url = url;
  if (!out.homepage_url) { try { out.homepage_url = new URL(url).origin; } catch {} }
  if (out.apply_method === "REDIRECT" && !out.external_apply_url) out.external_apply_url = url;
  if (!["STORE", "OFFICE"].includes(out.job_type)) out.job_type = "STORE";
  if (!["REDIRECT", "EMAIL", "MANAGED"].includes(out.apply_method)) out.apply_method = "MANAGED";

  return ok(out);
}
