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
function extractNextData(html: string): string {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (m) return m[1].trim().slice(0, 7000);
  // Nuxt/기타 인라인 상태
  const m2 = html.match(/<script[^>]*>\s*window\.__(?:NUXT|INITIAL_STATE)__\s*=([\s\S]*?)<\/script>/i);
  return m2 ? m2[1].trim().slice(0, 7000) : "";
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
  const pastedText = (b.text || "").trim();

  let url = (b.url || "").trim();
  let hostname = "";
  let html = "";
  let jsonld = "";
  let nextData = "";
  let pageText = "";
  let ogTitle = "";
  let ogDesc = "";

  if (!pastedText && !url) return err("VALIDATION_001", "URL 또는 공고 텍스트를 입력해주세요.", 400);

  // URL이 있으면 서버에서 fetch. 실패하더라도 붙여넣은 본문이 있으면 계속 진행.
  if (url) {
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try { hostname = new URL(url).hostname.replace(/^www\./, ""); }
    catch {
      if (!pastedText) return err("VALIDATION_001", "올바른 URL을 입력해주세요.", 400);
      url = "";
    }
    if (url) {
      try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 12000);
        const r = await fetch(url, {
          signal: ctl.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; BeautyworkBot/1.0)", "Accept-Language": "ko,en;q=0.8" },
        });
        clearTimeout(t);
        if (r.ok) html = await r.text();
        else if (!pastedText) return err("FETCH_001", `페이지를 불러오지 못했어요 (HTTP ${r.status}).`, 502);
      } catch (e: any) {
        if (!pastedText) return err("FETCH_002", "페이지를 불러오지 못했어요. 접근이 막혀 있거나 시간이 초과됐어요. 대신 공고 본문을 복사해 ‘텍스트 붙여넣기’로 등록해보세요.", 502);
      }
      if (html) {
        jsonld = extractJsonLd(html);
        nextData = extractNextData(html);
        pageText = htmlToText(html).slice(0, 16000);
        ogTitle = metaContent(html, "og:title") || (html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || "");
        ogDesc = metaContent(html, "og:description");
      }
    }
  }

  // 붙여넣은 공고 본문(가장 정확한 원본). URL 본문과 합쳐 AI에 전달.
  const bodyText = pastedText.slice(0, 16000);

  const emails = [...new Set(((html || "") + " " + pastedText).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])]
    .filter((e) => !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(e)).slice(0, 5);

  let out: any = {
    company_name: "", homepage_url: "", contact_email: emails[0] || "",
    title: ogTitle, job_type: "STORE", location: "", deadline: "",
    apply_method: emails[0] ? "EMAIL" : "MANAGED", external_apply_url: "",
    description: ogDesc,
    company_description: "", address: "", industry: "",
    requirements: "", preferred: "", benefits: "", hiring_process: [] as string[],
    employment_type: "", career: "", salary: "", extra_notes: "", main_duties: "",
  };

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const sys = `너는 뷰티 채용공고 페이지에서 핵심 정보를 뽑아 JSON으로 정리하는 도우미야.
반드시 아래 키를 가진 JSON "하나만" 출력해(설명·코드펜스 금지):
{"company_name","homepage_url","contact_email","title","job_type","location","deadline","apply_method","external_apply_url","description","company_description","address","industry","requirements","preferred","benefits","hiring_process","employment_type","career","salary","extra_notes","main_duties"}
규칙:
- job_type: 미용실·네일·피부·속눈썹 등 현장 미용직이면 "STORE", 화장품 브랜드·유통·본사 등 사무직이면 "OFFICE".
- deadline: "YYYY-MM-DD" 형식 또는 상시/미상이면 "".
- apply_method: 채용 이메일이 보이면 "EMAIL"(그 이메일을 contact_email에), 지원이 특정 지원페이지에서만 가능하면 "REDIRECT"(그 링크를 external_apply_url에), 애매하면 "MANAGED".
- description: 채용공고 본문 요약(직무·자격·근무조건). 원문 복제 금지, 한국어 3~5문장으로 재작성.
- company_description: 그 회사·브랜드 자체에 대한 소개 2~3문장(있으면). 채용 내용이 아니라 회사 소개. 없으면 "".
- address: 회사/근무지의 주소나 지역(있으면), 없으면 "".
- industry: job_type이 STORE면 [헤어샵, 네일샵, 피부·에스테틱, 속눈썹·왁싱·반영구, 메이크업, 애견미용, 토탈뷰티샵] 중 하나, OFFICE면 [화장품·미용기기 제조·브랜드, 뷰티 유통·이커머스, 프랜차이즈 본사, 미용 교육·아카데미, 피부과·성형외과, 뷰티 마케팅·미디어, 뷰티 서비스·플랫폼] 중 하나를 정확히 그대로. 애매하면 "".
- requirements: 자격요건/지원자격을 한국어 텍스트로. 항목이 여러 개면 줄바꿈(\n)으로 구분. 없으면 "".
- preferred: 우대사항을 텍스트로(줄바꿈 구분). 없으면 "".
- benefits: 복리후생/혜택 및 복지/복지/베네핏 등 이름이 무엇이든 그 혜택 내용을 텍스트로(줄바꿈 구분). 없으면 "".
- hiring_process: 채용 절차 단계를 문자열 배열로(예: ["서류전형","면접","최종합격"]). 없으면 [].
- employment_type: "정규직" | "파트타임" | "계약직" 중 하나 또는 "".
- career: 경력 조건을 짧은 텍스트로(예: "신입", "경력 2년 이상", "경력무관"). 없으면 "".
- main_duties: 주요업무/담당업무를 텍스트로(여러 개면 줄바꿈 구분). 없으면 "".
- salary: 급여/처우 조건을 텍스트로(예: "월 250만원", "비율 5:5", "면접 후 협의"). 없으면 "".
- homepage_url: 그 회사 자체의 홈페이지만. 지금 보고 있는 채용사이트(출처) 주소는 넣지 말 것. 회사 홈페이지가 없으면 "".
- extra_notes: 위 항목에 안 담기는 나머지 정보(근무시간·휴무/근무요일·근태제도·담당자 연락처·기타 안내 등)를 한국어로 항목별 정리(줄바꿈 구분). 복리후생/혜택은 benefits에 넣고 여기 중복하지 말 것. 없으면 "".
- 원문 복제는 피하되 내용은 빠짐없이 옮길 것. 우리 드롭다운에 억지로 맞추지 말고 있는 그대로.
- 입력 중 [붙여넣은 공고 본문]이 있으면 그 내용을 최우선으로 신뢰하고, [페이지 텍스트]·[JSON-LD]·[__NEXT_DATA__]는 빠진 값을 채우는 보완용으로만 사용할 것.
- 모르는 값은 빈 문자열 "".`;
      const user = `URL: ${url || "(없음)"}\n호스트: ${hostname || "(없음)"}\n\n[붙여넣은 공고 본문 · 최우선 신뢰]\n${bodyText || "(없음)"}\n\n[JSON-LD]\n${jsonld || "(없음)"}\n\n[__NEXT_DATA__ / 초기상태(JSON에 공고 내용이 있을 수 있음)]\n${nextData || "(없음)"}\n\n[페이지 텍스트]\n${pageText || "(없음)"}`;
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
  if (out.apply_method === "REDIRECT" && !out.external_apply_url && url) out.external_apply_url = url;
  if (!["STORE", "OFFICE"].includes(out.job_type)) out.job_type = "STORE";
  if (!["REDIRECT", "EMAIL", "MANAGED"].includes(out.apply_method)) out.apply_method = "MANAGED";

  return ok(out);
}
