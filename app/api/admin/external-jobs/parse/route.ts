export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ok, err, requireAuth } from "@/lib/api";
import { parseStructured } from "@/lib/external/parsers/structured";
import { getAllJobItems } from "@/lib/data/jobGroups";
import { rehostImages } from "@/lib/external/rehost";

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
  if (m) {
    const raw = m[1].trim();
    // 실제 공고 데이터는 props.pageProps에 있음. 프레임워크 잡음 빼고 그 부분만 추려서 넉넉히 전달.
    // (알바몬 등은 급여·근무요일이 __NEXT_DATA__ 뒤쪽 14KB 지점에 있어, 예전 7000자 컷에선 잘려나갔음)
    try {
      const j = JSON.parse(raw);
      const pp = j?.props?.pageProps;
      if (pp && typeof pp === "object") {
        const s = JSON.stringify(pp);
        if (s.length > 40) return s.slice(0, 24000);
      }
    } catch { /* 파싱 실패 시 원본 슬라이스로 폴백 */ }
    return raw.slice(0, 24000);
  }
  // Nuxt/기타 인라인 상태
  const m2 = html.match(/<script[^>]*>\s*window\.__(?:NUXT|INITIAL_STATE)__\s*=([\s\S]*?)<\/script>/i);
  return m2 ? m2[1].trim().slice(0, 24000) : "";
}
function metaContent(html: string, prop: string): string {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i");
  const m = html.match(re);
  return m ? m[1].trim() : "";
}

// ── 뷰티워크 폼과 100% 일치시켜야 하는 선택지 (드롭다운·칩) ──
const CAREER_OPTIONS = ["신입", "1년 이상", "2년 이상", "3년 이상", "5년 이상", "경력 무관"];
// 직군 목록은 단일 출처(jobGroups.ts)에서 가져온다 — 직군 재편 시 자동 반영(드리프트 방지)
const STORE_CATEGORIES = getAllJobItems("STORE");
const OFFICE_CATEGORIES = getAllJobItems("OFFICE");
const STORE_TAGS = ["기숙사 제공", "교육비 지원", "인센티브", "식대 지원", "주차 가능", "4대보험", "주말·공휴일 휴무", "정규직 전환"];
const OFFICE_TAGS = ["인센티브", "자기계발비", "식대 지원", "주차 가능", "4대보험", "정규직 전환", "재택근무", "유연근무"];

// LLM JSON 파싱(잘린 응답도 최대한 복구). 실패 시 null.
function safeJsonParse(raw: string): any | null {
  let s = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const a = s.indexOf("{");
  if (a > 0) s = s.slice(a);
  try { return JSON.parse(s); } catch { /* 잘렸을 수 있음 → 복구 시도 */ }
  // 완전한 값 뒤(콤마 앞) 또는 괄호 닫힘 위치를 안전 체크포인트로 기록 → 잘린 뒷부분은 버리고 닫는다.
  const stack: string[] = [];
  let inStr = false, esc = false;
  let safeLen = -1;
  let safeStack: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") stack.push(c === "{" ? "}" : "]");
    else if (c === "}" || c === "]") { stack.pop(); safeLen = i + 1; safeStack = [...stack]; }
    else if (c === ",") { safeLen = i; safeStack = [...stack]; } // 콤마 앞까지는 완결된 값들
  }
  if (safeLen < 0) return null;
  let t = s.slice(0, safeLen).replace(/,\s*$/, "");
  for (let k = safeStack.length - 1; k >= 0; k--) t += safeStack[k];
  try { return JSON.parse(t); } catch { return null; }
}

export async function POST(req: NextRequest) {
  // 관리자(외부공고) + 기업회원(타 사이트 공고 불러오기) 모두 허용
  const { auth, res: authErr } = requireAuth(req);
  if (authErr) return authErr;
  if (!auth || !["admin", "company"].includes(auth.owner_type)) return err("AUTH_002", "권한이 없습니다.", 403);

  const b = await req.json().catch(() => ({}));
  const pastedText = (b.text || "").trim();
  const imageUrl = (b.image_url || "").trim(); // OCR: 공고 화면 캡처 이미지 URL(업로드 후 전달)
  // OCR 다중 이미지: 긴 공고를 여러 장 캡처해 함께 인식(위→아래 순서 유지)
  const imageUrls: string[] = [imageUrl, ...(Array.isArray(b.image_urls) ? b.image_urls : [])]
    .map((s: any) => String(s || "").trim()).filter(Boolean).slice(0, 6);

  let url = (b.url || "").trim();
  let hostname = "";
  let html = "";
  let jsonld = "";
  let nextData = "";
  let pageText = "";
  let ogTitle = "";
  let ogDesc = "";
  let ogImage = "";
  let images: string[] = [];

  if (!pastedText && !url && imageUrls.length === 0) return err("VALIDATION_001", "URL·공고 텍스트·이미지 중 하나를 입력해주세요.", 400);

  // URL이 있으면 서버에서 fetch. 실패하더라도 붙여넣은 본문이 있으면 계속 진행.
  if (url) {
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try { hostname = new URL(url).hostname.replace(/^www\./, ""); }
    catch {
      if (!pastedText) return err("VALIDATION_001", "올바른 URL을 입력해주세요.", 400);
      url = "";
    }
    // 알바몬: 검색결과에서 복사하면 ?searchRow=&searchKeyword=&logpath=&sc= 같은 추적 파라미터가 붙는데,
    // 이게 붙으면 봇/스크래퍼로 오인해 차단 확률이 올라감 → 깨끗한 상세 URL로 정규화한다.
    if (url && /(?:^|\.)albamon\.com$/i.test(hostname)) {
      const m = url.match(/\/jobs\/detail\/(\d+)/i);
      if (m) url = `https://www.albamon.com/jobs/detail/${m[1]}`;
    }
    if (url) {
      // 알바몬 등은 봇 차단 시 정상 HTTP 200으로 "보안정책"·"접속 차단" 안내 페이지를 돌려줌 → 본문으로 차단 판별.
      const looksBlocked = (h: string) => {
        const title = (h.match(/<title>([^<]*)<\/title>/i)?.[1] || "").trim();
        // 차단 페이지는 제목이 '보안정책/접근 차단' 등으로 시작하고 본문이 짧다.
        if (/^(보안\s*정책|접근\s*차단|접속\s*차단|접근\s*제한|비정상적인\s*접근|robot\s*check|captcha)/i.test(title)) return true;
        const text = h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        return /(?:접속이?\s*차단|페이지\s*접근\s*불가|접근이?\s*제한|비정상적인\s*접근|보안\s*정책\s*위반)/.test(h) && text.length < 3000;
      };
      const fetchOnce = async (): Promise<{ status: number; html: string }> => {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 12000);
        try {
          const r = await fetch(url, {
            signal: ctl.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "ko,en;q=0.8",
            },
          });
          if (!r.ok) return { status: r.status, html: "" };
          // 인코딩 자동 감지: 구형 한국 사이트(EUC-KR) 대응. 일부는 meta에 UTF-8이라 거짓 선언하므로 깨짐(�)으로 판별.
          const buf = Buffer.from(await r.arrayBuffer());
          const ctCharset = (r.headers.get("content-type") || "").match(/charset=([\w-]+)/i)?.[1]?.toLowerCase() || "";
          let h: string;
          if (/^(ks_c_5601|ksc5601|cp949|windows-949|euc-?kr)$/i.test(ctCharset)) {
            h = new TextDecoder("euc-kr").decode(buf);
          } else {
            h = new TextDecoder("utf-8").decode(buf);
            if ((h.match(/�/g)?.length || 0) > 5) {
              try { h = new TextDecoder("euc-kr").decode(buf); } catch { /* euc-kr 미지원 시 utf-8 유지 */ }
            }
          }
          return { status: r.status, html: h };
        } finally { clearTimeout(t); }
      };
      try {
        let lastStatus = 0;
        // 간헐적 차단 대응: 차단 페이지가 잡히면 잠깐 쉬었다 1회 재시도(대개 다음 요청은 통과).
        for (let attempt = 0; attempt < 2; attempt++) {
          const { status, html: h } = await fetchOnce();
          lastStatus = status;
          if (h && !looksBlocked(h)) { html = h; break; }
          if (h && looksBlocked(h) && attempt === 0) { await new Promise((res) => setTimeout(res, 1500)); continue; }
          break; // 차단 재시도 소진 또는 빈 응답
        }
        if (!html && !pastedText) {
          return err("FETCH_001", `페이지를 불러오지 못했어요 (${lastStatus ? "HTTP " + lastStatus : "접근 차단"}). 잠시 후 다시 시도하거나, 공고 본문을 복사해 ‘텍스트 붙여넣기’로 등록해보세요.`, 502);
        }
      } catch (e: any) {
        if (!pastedText) return err("FETCH_002", "페이지를 불러오지 못했어요. 접근이 막혀 있거나 시간이 초과됐어요. 대신 공고 본문을 복사해 ‘텍스트 붙여넣기’로 등록해보세요.", 502);
      }
      if (html) {
        jsonld = extractJsonLd(html);
        nextData = extractNextData(html);
        pageText = htmlToText(html).slice(0, 16000);
        ogTitle = metaContent(html, "og:title") || (html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || "");
        ogDesc = metaContent(html, "og:description");
        // 대표 이미지(배너 후보): og:image → twitter:image, 상대경로면 절대경로로 보정
        let img = metaContent(html, "og:image") || metaContent(html, "og:image:url") || metaContent(html, "twitter:image") || "";
        if (img && !/^https?:\/\//i.test(img)) {
          try { img = new URL(img, url).href; } catch { img = ""; }
        }
        ogImage = img;
        // 공고 갤러리 이미지: 페이지가 실제 노출하는 이미지를 "순서 그대로 전부" 가져온다.
        //  - URL/회사가 바뀌어도 패턴은 동일: 회사 폴더 ID를 페이지에서 동적으로 뽑아 스코프.
        const isImg = (u: string) => /^https?:\/\//i.test(u) && /\.(?:jpe?g|png|webp)(?:$|\?|#)/i.test(u);
        const isJunk = (u: string) => /(icon|logo|sprite|favicon|badge|spacer|blank|avatar|profile|default|brand_new|\/wdes\/|\/proposal\/|apple-touch|social|sns)/i.test(u);
        const decodeSrc = (href: string) => {
          const h = (href || "").replace(/&amp;/g, "&");
          const s = h.match(/[?&]src=([^&]+)/i);
          if (s) { try { return decodeURIComponent(s[1]); } catch { return h; } }
          return h;
        };
        // ① preload as=image = 상단 우선노출(앞순서 정확). 원티드는 optimize?src=<원본>으로 감싼다.
        const preloadImgs = [...html.matchAll(/<link\b[^>]*>/gi)]
          .map((m) => m[0])
          .filter((t) => /rel=["']preload["']/i.test(t) && /as=["']image["']/i.test(t))
          .map((t) => decodeSrc(t.match(/href=["']([^"']+)["']/i)?.[1] || ""))
          .filter((u) => isImg(u) && !isJunk(u));
        // ② 회사 이미지 폴더 ID를 페이지에서 동적 추출 → 이 공고 갤러리 이미지만 순서대로 전부(원티드)
        const folderId = (preloadImgs[0] || ogImage || "").match(/\/company\/(\d+)\//)?.[1] || "";
        let galleryImgs: string[] = [];
        if (folderId) {
          const re = new RegExp(`https?:\\\\?/\\\\?/[^\\s"'<>()\\\\]*?/company/${folderId}/[^\\s"'<>()\\\\?]+?\\.(?:jpe?g|png|webp)`, "gi");
          galleryImgs = [...html.matchAll(re)].map((m) => m[0].replace(/\\u002[fF]/g, "/").replace(/\\\//g, "/"));
        }
        // ③ optimize?src= 래핑 이미지(일반 대응)
        const wrapped = [...html.matchAll(/optimize\?src=([^"'&\\ ]+)/gi)]
          .map((m) => { try { return decodeURIComponent(m[1].replace(/&amp;/g, "&")); } catch { return ""; } });
        // preload(정확한 앞순서) 우선 + 갤러리/래핑 순서대로 이어붙임, 중복 제거·잡동사니 제외
        const ordered: string[] = [];
        for (const u of [...preloadImgs, ...galleryImgs, ...wrapped]) {
          const c = (u || "").replace(/&amp;/g, "&");
          if (isImg(c) && !isJunk(c) && !ordered.includes(c)) ordered.push(c);
        }
        images = ordered;
        // ④ (범용 폴백) 구조화 소스가 0일 때만: <img> 태그 콘텐츠 이미지. 상대경로→절대경로 보정, 사이트 크롬(로고·아이콘 등) 제외.
        if (images.length === 0) {
          const chrome = /\/(images|img|imgs|assets|static|common|skin|css|js|template|layout|banner|ad|ads|event|promo|premium)\//i;
          const toAbs = (u: string) => { try { return new URL(u, url).href; } catch { return ""; } };
          const tags = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
          for (const tag of tags) {
            const raw = (tag.match(/\b(?:data-src|data-original|data-lazy)=["']([^"']+)["']/i)?.[1]
              || tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] || "").trim();
            if (!raw || /^data:/i.test(raw)) continue;
            const abs = /^https?:\/\//i.test(raw) ? raw : toAbs(raw);
            if (!abs || !/\.(?:jpe?g|png|webp)(?:$|\?|#)/i.test(abs)) continue;
            if (chrome.test(abs) || isJunk(abs)) continue;
            if (!images.includes(abs)) images.push(abs);
          }
        }
        // ⑤ (범용) 위에서 못 찾으면 JSON-LD 구조화 데이터의 image 필드 — 사이트 종류 안 가림
        if (images.length === 0 && jsonld) {
          const ldImgs = [...jsonld.matchAll(/https?:\/\/[^\s"'\\<>()]+?\.(?:jpe?g|png|webp)(?:\?[^\s"'\\<>()]*)?/gi)]
            .map((m) => m[0].replace(/\\u002[Ff]/g, "/").replace(/\\\//g, "/"));
          for (const u of ldImgs) if (isImg(u) && !isJunk(u) && !images.includes(u)) images.push(u);
        }
        // ⑤ (범용) 그래도 없으면 og:image와 같은 폴더 이미지
        if (images.length === 0 && ogImage) {
          const dir = ogImage.replace(/[?#].*$/, "").replace(/[^/]*$/, "");
          const all = [...html.matchAll(/https?:\/\/[^\s"'<>()\\]+?\.(?:jpe?g|png|webp)(?:\?[^\s"'<>()\\]*)?/gi)]
            .map((m) => m[0].replace(/\\u002[Ff]/g, "/").replace(/\\\//g, "/"));
          images = [...new Set(all)].filter((u) => dir && u.startsWith(dir) && !isJunk(u));
        }
        // ⑥ (범용) 최후 폴백: og:image 단 한 장이라도
        if (images.length === 0 && ogImage && isImg(ogImage) && !isJunk(ogImage)) images = [ogImage];
        // ⑦ (SPA 보강) __NEXT_DATA__/JSON 스크립트의 이미지로 갤러리 보강(beautyin 등 React SPA).
        //    이미 몇 장 잡혔어도 부족하면 합치되, "같은 도메인" 이미지만 추가해 외부 광고·추천 이미지는 배제.
        if (images.length < 8) {
          const blobs = [...html.matchAll(/<script[^>]*(?:__NEXT_DATA__|application\/json|__NUXT__|INITIAL_STATE)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
          const nd = blobs.join(" ");
          const found = [...new Set([...nd.matchAll(/https?:(?:\\u002[Ff]|\\?\/){2}[^\s"'<>()\\]+?\.(?:jpe?g|png|webp)(?:\?[^\s"'<>()\\]*)?/gi)]
            .map((m) => m[0].replace(/\\u002[Ff]/g, "/").replace(/\\\//g, "/").replace(/&amp;/g, "&")))];
          for (const u of found) {
            if (!isImg(u) || isJunk(u) || /\/(banner|ad|ads|event|promo|premium)\//i.test(u)) continue;
            if (!images.includes(u)) images.push(u);
          }
        }
        images = images.slice(0, 12);
      }
    }
  }

  // 붙여넣은 공고 본문(가장 정확한 원본). URL 본문과 합쳐 AI에 전달.
  const bodyText = pastedText.slice(0, 16000);
  // 비용 절감: 본문을 충분히 붙여넣었으면 페이지 텍스트는 보조용으로 짧게만 전달(입력 토큰 대폭 감소)
  if (bodyText.length > 1000 && pageText) pageText = pageText.slice(0, 4000);

  const emails = [...new Set(((html || "") + " " + pastedText).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])]
    // 이미지 파일명·잡코리아 등의 난독화(해시) 이메일 제외 → 실제 이메일만
    .filter((e) => !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(e) && !/^[0-9a-f]{20,}@/i.test(e)).slice(0, 5);
  // 전화번호(지원 연락처 후보): 표시 텍스트·붙여넣은 본문에서만 뽑아 오탐 최소화. 휴대폰/유선/대표번호 형식.
  const phones = [...new Set(((pageText || "") + " " + pastedText)
    .match(/(?:1[0-9]{3}[-.\s]?[0-9]{4})|(?:0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4})/g) || [])]
    .map((s) => s.replace(/[.\s]/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, ""))
    .filter((s) => { const d = s.replace(/\D/g, ""); return d.length >= 9 && d.length <= 11; })
    .slice(0, 5);

  let out: any = {
    ai_parsed: false,
    company_name: "", homepage_url: "", contact_email: emails[0] || "", contact_phone: phones[0] || "", contact_name: "",
    title: ogTitle, job_type: "STORE", location: "", region: "", deadline: "", always_open: false,
    apply_method: "MANAGED", external_apply_url: "",
    description: ogDesc,
    company_description: "", address: "", industry: "",
    job_categories: [] as string[],
    requirements: "", preferred: "", benefits: "", benefit_tags: [] as string[], hiring_process: [] as string[],
    employment_type: "", career: "", salary: "", salary_type: "", salary_amount: 0, salary_amount_max: 0, salary_negotiable: false, work_days: "", work_time: "", extra_notes: "", main_duties: "",
  };

  // ── 무료 파싱: 알려진 잡보드(헤어인잡 등)는 정규식으로 필드 추출 → AI 건너뜀(비용 0) ──
  let freeParsed = false;
  if (!bodyText) { // 붙여넣은 본문이 없을 때(=URL 불러오기)만 구조화 파서 시도
    try {
      const st = parseStructured(hostname || "", html || "");
      if (st && st._confident) {
        delete st._confident;
        out = { ...out, ...st };
        out.ai_parsed = true;
        out.parsed_by = "structured";
        freeParsed = true;
      }
    } catch (e) {
      console.error("[structured parse]", e);
    }
  }

  // ── 뷰티잡: 상세요강(포스터 이미지·본문 텍스트)은 목록/상세 본문 HTML엔 없고, jobkorea_iframe.php(iframe·서버렌더) 안에 있다.
  //    공고 URL 경로(/<bo_table>/<wr_id>)로 iframe 주소를 만들어 2차 fetch → 3가지 형태로 배선한다:
  //      · 포스터형   : 뷰티잡 자체 등록 → /data/editor|file/ 풀사이즈 이미지 → 상세 본문 이미지
  //      · 신디케이션 : iframe이 통째로 잡코리아 페이지 → CorpEditor 디자인 이미지 또는 구조화 텍스트(담당업무/자격요건/우대사항)
  //      · 텍스트형   : <p> 자유서술만 있는 공고 → 상세요강 본문 텍스트를 포지션 소개(description)로
  if (freeParsed && /^beautyjob\.kr$/i.test(hostname) && url) {
    try {
      const seg = new URL(url).pathname.split("/").filter(Boolean);
      const boTable = seg[0] || "";
      const wrId = seg[1] || "";
      if (boTable && /^\d+$/.test(wrId)) {
        const iframeUrl = `https://www.beautyjob.kr/jobkorea_iframe.php?bo_table=${encodeURIComponent(boTable)}&wr_id=${wrId}`;
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 12000);
        try {
          const ir = await fetch(iframeUrl, {
            signal: ctl.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "ko,en;q=0.8",
              "Referer": url,
            },
          });
          if (ir.ok) {
            const ih = new TextDecoder("utf-8").decode(Buffer.from(await ir.arrayBuffer()));
            const norm = (s: string) => (s.startsWith("//") ? "https:" + s : s);
            // 상세요강 이미지 후보 ─ 잡코리아 CorpEditor(신디케이션) + 뷰티잡 자체 /data/editor|file/ 풀사이즈(썸네일 제외)
            const jkImgs = [...new Set(
              [...ih.matchAll(/file2\.jobkorea\.co\.kr[\\/]+Net[\\/]+Mng[\\/]+DownImage[\\/]+CorpEditor\?file_No=\d+/gi)]
                .map((m) => m[0].replace(/\\/g, ""))
            )].map((u) => "https://" + u);
            const bjImgs = [...new Set(
              [...ih.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((m) => m[1])
            )]
              .map(norm)
              .filter((s) => /^https?:\/\//i.test(s) && /\/data\/(?:editor|file)\//i.test(s))
              .filter((s) => !/\/thumb-|_\d+x\d+\.(?:jpe?g|png|gif|webp)/i.test(s)); // 목록 썸네일 제외 → 풀사이즈만
            const posters = [...new Set([...jkImgs, ...bjImgs])].slice(0, 12);
            if (posters.length) {
              out.images = posters;
              out._rehost = true;
              // CorpEditor는 잡코리아 CDN(핫링크 차단) → 잡코리아 referer, 그 외 뷰티잡 자체 이미지.
              out._rehostReferer = jkImgs.length ? "https://www.jobkorea.co.kr/" : "https://www.beautyjob.kr/";
              out._detailImages = true; // 배너가 아니라 상세 본문 이미지로 배치(포스터형 공고)
            } else {
              // ── 상세요강 텍스트형(이미지 없는 공고) ──
              // <p>/<br>/<div> 경계를 줄바꿈으로, 나머지 태그·엔티티 정리. 잡코리아 기본 플레이스홀더는 버린다.
              const detailText = ih
                .replace(/<script[\s\S]*?<\/script>/gi, " ")
                .replace(/<style[\s\S]*?<\/style>/gi, " ")
                .replace(/<\/(?:p|div|li|h\d)>/gi, "\n")
                .replace(/<br\s*\/?>/gi, "\n")
                .replace(/<[^>]+>/g, " ")
                .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
                .replace(/&[a-z#0-9]+;/gi, " ")
                // 잡코리아 목록기호(ㆍ)는 한 줄에 여러 항목을 붙여 놓으므로 줄바꿈으로 분리 → 항목별 플레이스홀더 제거가 가능해진다.
                .replace(/ㆍ/g, "\n")
                // 줄 앞 목록기호(·•-)를 떼어 "· 상세내용을 입력하세요" 같은 플레이스홀더도 걸러지게 한다.
                .split("\n").map((l) => l.replace(/[ \t]+/g, " ").replace(/^[·•\-]\s*/, "").trim())
                .filter((l) => l && !/^상세\s*내용을\s*입력하세요\.?$/.test(l))
                .join("\n").replace(/\n{2,}/g, "\n").trim();
              // 잡코리아 신디케이션 구조화 텍스트(회사 소개 + 담당업무/자격요건/우대사항)면 필드로, 아니면 자유서술 → 포지션 소개.
              const isJk = /jobkorea\.co\.kr|data-sentry|포지션\s*및\s*자격요건|전형절차/i.test(ih);
              if (isJk) {
                // ── 회사 소개(기업정보) ── 잡코리아는 제목과 "포지션 및 자격요건" 사이에 회사 블러브를 둔다.
                //    (예: "㈜○○는 2009년에 설립된 회사로 … 서울 강남구 …에 위치하고 있으며, …사업을 하고 있습니다.")
                const introBlock = detailText.split(/포지션\s*및\s*자격요건/)[0] || "";
                const compNorm = (s: string) => (s || "").replace(/\(주\)|㈜|주식회사|\(유\)|\s+/g, "").trim();
                const cTitle = compNorm(typeof out.title === "string" ? out.title : "");
                const cName = compNorm(typeof out.company_name === "string" ? out.company_name : "");
                const descLines = introBlock.split("\n").map((l) => l.trim()).filter(Boolean)
                  .filter((l) => { const n = compNorm(l); return n && n !== cTitle && n !== cName && l !== out.title; });
                const compDesc = descLines.join("\n").trim();
                if (compDesc.length > 10) {
                  out.company_description = compDesc.slice(0, 800); // 기업 소개
                  const fy = compDesc.match(/(19|20)\d{2}(?=\s*년\s*에?\s*설립)/);
                  if (fy) out.founded_year = Number(fy[0]);             // 설립연도
                  const emp = Number((compDesc.match(/사원수\s*([\d,]+)\s*명/) || [])[1]?.replace(/,/g, "") || 0);
                  if (emp > 0) out.company_size = emp <= 10 ? "1~10명" : emp <= 50 ? "10~50명" : emp <= 100 ? "50~100명" : emp <= 300 ? "100~300명" : emp <= 1000 ? "300~1000명" : "1000명 이상"; // 사원수 버킷
                  const addr = (compDesc.match(/((?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^,\n]*?)\s*에\s*위치/) || [])[1]?.trim() || "";
                  if (addr && !out.address) out.address = addr;         // 주소(=근무지역 입력칸 공용)
                  if (addr && !out.region) {
                    const rm = addr.match(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\s*([가-힣]+[시군구])/);
                    const SIDO: Record<string, string> = { 서울: "서울특별시", 부산: "부산광역시", 대구: "대구광역시", 인천: "인천광역시", 광주: "광주광역시", 대전: "대전광역시", 울산: "울산광역시", 세종: "세종특별자치시", 경기: "경기도", 강원: "강원특별자치도", 충북: "충청북도", 충남: "충청남도", 전북: "전북특별자치도", 전남: "전라남도", 경북: "경상북도", 경남: "경상남도", 제주: "제주특별자치도" };
                    if (rm) out.region = `${SIDO[rm[1]] || rm[1]} ${rm[2]}`; // 근무지역 필터
                  }
                }
                // ── 담당업무/자격요건/우대사항 ──
                if (/담당업무|자격요건/.test(detailText)) {
                  // "포지션 및 자격요건" 헤더의 '자격요건'과 실제 섹션이 충돌 → 담당업무 이후부터 구간을 잡는다.
                  const dutyI = detailText.indexOf("담당업무");
                  const flat = (dutyI >= 0 ? detailText.slice(dutyI) : detailText).replace(/\n/g, " ");
                  const betw = (a: string, stops: string[]) => {
                    const i = flat.indexOf(a); if (i < 0) return "";
                    const s = flat.slice(i + a.length);
                    const j = stops.map((x) => { const p = s.indexOf(x); return p < 0 ? Infinity : p; }).reduce((m, x) => Math.min(m, x), Infinity);
                    return (j === Infinity ? s : s.slice(0, j)).replace(/^[\s·ㆍ:]+/, "").trim();
                  };
                  const duty = betw("담당업무", ["스킬", "핵심역량", "자격요건", "우대사항", "전형절차", "근무", "접수"]).slice(0, 1500);
                  const req = betw("자격요건", ["우대사항", "전형절차", "근무", "접수", "복리후생"]).slice(0, 1500);
                  const pref = betw("우대사항", ["전형절차", "근무", "접수", "복리후생", "담당자"]).slice(0, 1500);
                  if (duty && duty.length > 3) { out.main_duties = duty; out.description = duty; }
                  if (req && req.length > 3) out.requirements = req;
                  if (pref && pref.length > 3) out.preferred = pref;
                }
              } else if (detailText.length > 10) {
                // og:description은 뷰티잡 공용 사이트 문구라 무의미 → 실제 상세요강 본문으로 덮어쓴다.
                out.description = detailText.slice(0, 2000);
              }
            }
          }
        } finally { clearTimeout(t); }
      }
    } catch (e) {
      console.error("[beautyjob iframe]", e);
    }
  }

  // ── 사람인: 상세(모집부문·근무조건·복리후생·디자인 이미지)는 본문이 아니라 relay/view-detail(iframe)에 있다.
  //    rec_idx만으로 서버 2차 fetch 가능 → 디자인 이미지=상세요강, 복리후생/고용형태도 보강.
  if (freeParsed && /saramin\.co\.kr/i.test(hostname) && url) {
    try {
      const recIdx = (new URL(url).searchParams.get("rec_idx") || (url.match(/rec_idx=(\d+)/) || [])[1] || "").trim();
      if (/^\d+$/.test(recIdx)) {
        const detailUrl = `https://www.saramin.co.kr/zf_user/jobs/relay/view-detail?rec_idx=${recIdx}`;
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 12000);
        try {
          const ir = await fetch(detailUrl, {
            signal: ctl.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "ko,en;q=0.8",
              "Referer": url,
            },
          });
          if (ir.ok) {
            const ih = new TextDecoder("utf-8").decode(Buffer.from(await ir.arrayBuffer()));
            const clean = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
            const full = clean(ih);
            const between = (a: string, stops: string[]) => {
              const i = full.indexOf(a); if (i < 0) return "";
              const s = full.slice(i + a.length);
              const j = stops.map((x) => { const p = s.indexOf(x); return p < 0 ? Infinity : p; }).reduce((m, x) => Math.min(m, x), Infinity);
              return (j === Infinity ? s : s.slice(0, j)).trim();
            };
            // 사람인 이미지는 별도 CDN(saraminimage.co.kr)에 있음. 두 종류를 구분한다:
            //  · /recruit/… : 회사 디자인 포스터(제니하우스형) → 상세요강 이미지
            //  · /static/hiring/images/template/… : 사람인 기본 템플릿 상단 배너(닥터스칼프형) → 상단 배너
            const norm = (u: string) => (u.startsWith("//") ? "https:" + u : u);
            const posters = [...new Set([...ih.matchAll(/(?:https?:)?\/\/[a-z0-9.]*saraminimage\.co\.kr\/recruit\/[^\s"')]+\.(?:png|jpe?g|gif|webp)/gi)].map((m) => m[0]))]
              .map(norm).filter((u) => !/watermark/i.test(u)).slice(0, 12);
            const banners = [...new Set([...ih.matchAll(/(?:https?:)?\/\/[a-z0-9.]*saraminimage\.co\.kr\/static\/hiring\/images\/template\/[^\s"')]+\.(?:png|jpe?g|gif|webp)/gi)].map((m) => m[0]))]
              .map(norm).filter((u) => !/watermark/i.test(u)).slice(0, 3);
            if (posters.length) {
              out.images = posters;
              out._rehost = true;
              out._rehostReferer = "https://www.saramin.co.kr/";
              out._detailImages = true; // 디자인 포스터 → 상세 본문 이미지
            } else if (banners.length) {
              out.images = banners;
              out._rehost = true;
              out._rehostReferer = "https://www.saramin.co.kr/";
              // 템플릿 배너 → 상단 배너(_detailImages 미설정)
            }
            // 텍스트형 공고: 주요업무/담당업무·자격요건·우대사항이 깔끔한 텍스트로 있음 → 필드로 반영
            // 섹션 머리 이모지(📋🏠🎁🚀)가 다음 섹션에서 꼬리에 새어 들어오므로 끝에서 제거.
            const tail = (s: string) => s.replace(/[\s📋🏠🎁🚀✅💡•·]+$/gu, "").trim();
            const duty = tail((between("주요업무", ["자격요건", "우대사항", "근무조건", "복지", "혜택"]) || between("담당업무", ["자격요건", "우대사항", "근무조건"])).slice(0, 1500));
            const req = tail(between("자격요건", ["우대사항", "근무조건", "복지", "혜택", "전형", "접수"]).slice(0, 1500));
            const pref = tail(between("우대사항", ["근무조건", "복지", "혜택", "채용절차", "전형", "접수"]).slice(0, 1500));
            if (duty && duty.length > 3) { out.description = duty; out.main_duties = duty; } // 매장=포지션소개 / 오피스=담당업무
            if (req && req.length > 3) out.requirements = req;
            if (pref && pref.length > 3) out.preferred = pref;
            // 근무조건 → 고용형태 + 근무지(주소)
            const workcond = between("근무조건", ["복리후생", "복지", "혜택", "채용절차", "접수", "지원방법"]);
            if (/정규직/.test(workcond)) out.employment_type = "정규직";
            else if (/계약직/.test(workcond)) out.employment_type = "계약직";
            else if (/파트|아르바이트|알바/.test(workcond)) out.employment_type = "파트타임";
            // 근무지역(텍스트형 공고엔 '근무지 : 서울 …' 형태로 주소가 있음. 없으면 관리자 입력)
            const addr = (workcond.match(/근무지\s*[:：]?\s*([가-힣][^•·|\n]{4,80})/) || [])[1]?.trim() || "";
            if (addr && !out.region) { out.address = addr; out.region = addr; }
            // 복리후생 / 복지 및 혜택 → 태그 + 비고 보존
            const welfare = (between("복리후생", ["채용절차", "접수", "지원방법", "담당자", "홈페이지", "전형", "마감"]) || between("복지", ["채용절차", "접수", "지원방법", "담당자", "홈페이지", "전형", "마감"])).slice(0, 500);
            if (welfare) {
              const tags: string[] = [];
              if (/4대|국민연금|고용보험|산재|건강보험/.test(welfare)) tags.push("4대보험");
              if (/인센/.test(welfare)) tags.push("인센티브");
              if (/식대|식비|중식|조식|식사/.test(welfare)) tags.push("식대 지원");
              if (/주차/.test(welfare)) tags.push("주차 가능");
              if (/기숙사|숙소/.test(welfare)) tags.push("기숙사 제공");
              if (/교육비|교육\s*지원|학원비|수강료/.test(welfare)) tags.push("교육비 지원");
              if (tags.length) out.benefit_tags = tags;
              out.extra_notes = [out.extra_notes, `복리후생: ${welfare}`].filter(Boolean).join("\n\n");
            }
          }
        } finally { clearTimeout(t); }
      }
    } catch (e) {
      console.error("[saramin view-detail]", e);
    }
  }

  // ── 잡코리아: 상세(담당업무·자격요건·근무조건·디자인 이미지)는 GI_Read_Comt_Ifrm(iframe)에 있다.
  //    Gno=공고번호(=GI_Read/<번호>)만으로 서버 2차 fetch 가능(비로그인).
  if (freeParsed && /jobkorea\.co\.kr/i.test(hostname) && url) {
    try {
      const gno = (url.match(/GI_Read\/(\d+)/) || url.match(/Gno=(\d+)/) || [])[1] || "";
      if (/^\d+$/.test(gno)) {
        const ifrUrl = `https://www.jobkorea.co.kr/Recruit/GI_Read_Comt_Ifrm?Gno=${gno}&isHiringCenter=&hideMapView=`;
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 12000);
        try {
          const ir = await fetch(ifrUrl, {
            signal: ctl.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "ko,en;q=0.8",
              "Referer": url,
            },
          });
          if (ir.ok) {
            const ih = new TextDecoder("utf-8").decode(Buffer.from(await ir.arrayBuffer()));
            const clean = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
            // 디자인 이미지: file2.jobkorea …/DownImage/CorpEditor?file_No=N (JS 문자열 내 이스케이프 슬래시 대응)
            const imgs = [...new Set([...ih.matchAll(/file2\.jobkorea\.co\.kr[\\/]+Net[\\/]+Mng[\\/]+DownImage[\\/]+CorpEditor\?file_No=\d+/gi)].map((m) => m[0].replace(/\\/g, "")))]
              .map((u) => "https://" + u)
              .slice(0, 12);
            if (imgs.length) {
              out.images = imgs;
              out._rehost = true;
              out._rehostReferer = "https://www.jobkorea.co.kr/";
              out._detailImages = true;
            }
            // 텍스트: 담당업무/자격요건/근무조건 (헤더 '주요업무 및 자격요건' 이후의 실제 섹션부터 파싱)
            const full = clean(ih);
            const startI = full.indexOf("담당업무");
            const body = startI >= 0 ? full.slice(startI) : full;
            const betw = (a: string, stops: string[]) => {
              const i = body.indexOf(a); if (i < 0) return "";
              const s = body.slice(i + a.length);
              const j = stops.map((x) => { const p = s.indexOf(x); return p < 0 ? Infinity : p; }).reduce((m, x) => Math.min(m, x), Infinity);
              return (j === Infinity ? s : s.slice(0, j)).trim();
            };
            const duty = betw("담당업무", ["자격요건", "우대사항"]).slice(0, 1500);
            const req = betw("자격요건", ["근무조건", "우대사항", "전형", "접수", "복리후생"]).slice(0, 1500);
            const workcond = betw("근무조건", ["복리후생", "전형", "접수", "담당자", "마감", "우대", "기타"]);
            if (duty && duty.length > 3) { out.description = duty; out.main_duties = duty; } // 매장=포지션소개 / 오피스=담당업무 양쪽 커버
            if (req && req.length > 3) out.requirements = req;
            if (/정규직/.test(workcond)) out.employment_type = "정규직";
            else if (/계약직/.test(workcond)) out.employment_type = "계약직";
            else if (/파트|아르바이트|알바/.test(workcond)) out.employment_type = "파트타임";
          }
        } finally { clearTimeout(t); }
      }
    } catch (e) {
      console.error("[jobkorea iframe]", e);
    }
  }

  if (!freeParsed && process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const sys = `너는 뷰티 채용공고 페이지에서 핵심 정보를 뽑아 JSON으로 정리하는 도우미야.
반드시 아래 키를 가진 JSON "하나만" 출력해(설명·코드펜스 금지):
{"company_name","homepage_url","contact_email","contact_phone","contact_name","title","job_type","job_categories","region","location","deadline","always_open","apply_method","external_apply_url","description","company_description","address","industry","requirements","preferred","benefits","benefit_tags","hiring_process","employment_type","career","salary","salary_type","salary_amount","salary_amount_max","salary_negotiable","work_days","work_time","extra_notes","main_duties"}
규칙:
- job_type: "회사 업종"이 아니라 "실제 근무 직무"를 기준으로 판단한다. 물리적 매장·샵에 상주하며 일하는 현장직 — 미용실·네일·피부·속눈썹 등 시술직 + 매장 카운터·판매·접객·매장관리·안내데스크·리셉션 등 오프라인 매장 상주 직무 — 이면 "STORE". 본사·사무실 근무 사무직(브랜드 기획·마케팅·MD·영업관리·연구개발·인사·경영 등)이면 "OFFICE". ★ 회사가 "판매점·유통·이커머스·재료 전문점" 업종이어도, 채용 직무가 오프라인 매장의 카운터·판매·매장관리·접객이면 반드시 "STORE"로 분류(예: "네일재료 판매점 카운터 및 매장관리 직원" → STORE).
- job_categories: 위 job_type에 맞는 아래 "직군 목록"에서 이 공고에 해당하는 항목을 1~3개 골라 그 문자열을 "정확히 그대로" 배열로. 목록에 딱 맞는 게 없으면 가장 가까운 것 1개. 전혀 없으면 [].
    · STORE 직군: ${STORE_CATEGORIES.join(" / ")}
    · OFFICE 직군: ${OFFICE_CATEGORIES.join(" / ")}
- career: 아래 중 "정확히 하나"만 고르기 → ${CAREER_OPTIONS.join(" / ")}. "경력무관/무관/경력 사항 없음"은 "경력 무관", "신입"만이면 "신입", "N년 이상/N년차"는 가장 가까운 값. 불명확하면 "".
- region: 근무지의 시·도와 시·군·구를 "시도전체명 시군구" 형식으로(예: "경기도 수원시 영통구", "서울특별시 강남구"). 시도명은 축약하지 말고 전체명(경기도/서울특별시/부산광역시 등). 상세 도로명·번지는 빼고 시군구까지만. 없으면 "".
- deadline: 특정 마감일이 "YYYY-MM-DD"로 명시된 경우만 그 날짜. 상시/수시/미상이면 "".
- always_open: 상시채용·수시채용·채용시 마감·충원시 마감 등 마감일이 없는 상시 공고면 true, 아니면 false.
- benefit_tags: 아래 job_type별 "복리후생·근무조건 태그 목록"에서 이 공고 내용과 맞는 것만 골라 문자열을 "정확히 그대로" 배열로(없으면 []). 이건 필터용 태그이고, 서술형 혜택 내용은 benefits에 따로 담아.
    · STORE 태그: ${STORE_TAGS.join(" / ")}
    · OFFICE 태그: ${OFFICE_TAGS.join(" / ")}
- apply_method: 지원이 회사 홈페이지·특정 지원페이지에서만 가능하면 "REDIRECT"(그 링크를 external_apply_url에), 그 외에는 모두 "MANAGED". (채용 이메일이 보이면 contact_email에는 담되 apply_method는 MANAGED로.)
- contact_phone: 지원·문의용 전화번호(담당자/채용 연락처)가 본문에 있으면 "010-1234-5678"처럼 하이픈 포함으로. 여러 개면 지원 담당 번호 우선(대표번호보다 채용 담당 우선). 없으면 "".
- contact_name: 채용 담당자 "사람 이름"이 명시돼 있으면 그 이름만(예: "이은주"). 부서명·회사명·"담당자"라는 일반어는 제외. 없으면 "".
- description: 채용공고 본문 요약(직무·자격·근무조건). 원문 복제 금지, 한국어 3~5문장으로 재작성.
- company_description: 그 회사·브랜드 자체에 대한 소개 2~3문장(있으면). 채용 내용이 아니라 회사 소개. 없으면 "".
- address: 회사/근무지의 전체 주소(도로명·번지 포함, 있으면). 없으면 "".
- industry: job_type이 STORE면 [헤어샵, 네일샵, 피부·에스테틱, 속눈썹·왁싱·반영구, 메이크업, 애견미용, 토탈뷰티샵] 중 하나, OFFICE면 [화장품·미용기기 제조·브랜드, 뷰티 유통·이커머스, 프랜차이즈 본사, 미용 교육·아카데미, 피부과·성형외과, 뷰티 마케팅·미디어, 뷰티 서비스·플랫폼] 중 하나를 정확히 그대로. 애매하면 "".
- requirements: 자격요건/지원자격을 한국어 텍스트로. 항목이 여러 개면 줄바꿈(\n)으로 구분. 없으면 "".
- preferred: 우대사항을 텍스트로(줄바꿈 구분). 없으면 "".
- benefits: 복리후생/혜택 및 복지/복지/베네핏 등 이름이 무엇이든 그 혜택 내용을 서술형 텍스트로(줄바꿈 구분). 없으면 "".
- hiring_process: 채용 절차 단계를 문자열 배열로(예: ["서류전형","면접","최종합격"]). 없으면 [].
- employment_type: "정규직" | "파트타임" | "계약직" 중 하나 또는 "".
- main_duties: 주요업무/담당업무를 텍스트로(여러 개면 줄바꿈 구분). 없으면 "".
- salary: 급여/처우 조건을 텍스트로(예: "월 250만원", "비율 5:5", "면접 후 협의"). 없으면 "".
- salary_type · salary_amount: 이 둘은 "반드시 같은 급여 하나"를 가리켜야 한다. 형태와 금액을 절대 섞지 말 것 → "연봉 3000만원"이면 type "ANNUAL" + amount 3000, "월 250만원"이면 type "MONTHLY" + amount 250. (예: 월인데 amount 3000 ✗ 절대 금지). 한 공고에 월급·연봉이 함께 적혀 있으면 "연봉(ANNUAL)"을 우선 선택(예: "월 250만원 / 연봉 3000~3300만원" → ANNUAL + 3000). 범위면 하한값.
   · salary_type: "ANNUAL"(연봉) | "MONTHLY"(월급) | "WEEKLY"(주급) | "HOURLY"(시급) 중 하나. 협의/비율제 등 고정 금액이 없으면 "".
   · salary_amount: 숫자만(범위면 하한값). 연봉·월급·주급은 "만원" 단위, 시급은 "원" 단위.
     ★ 원 단위 숫자(예: 2300000, 30000000)로 주어지면 연봉·월급·주급은 반드시 만원으로 환산(÷10,000): 월급 2,300,000원→230, 연봉 30,000,000원→3000. (÷1,000 하지 말 것 → 2300은 오답). "230만원"처럼 이미 만원으로 적혀 있으면 그대로 230. 시급만 원 그대로(예: 시급 10320원→10320). 없거나 협의면 0.
   · salary_amount_max: 급여가 "범위"로 적혀 있으면(예: "연봉 3000~3300만원") 상한값 숫자만(같은 단위, 예: 3300). 단일 금액이면 0.
- salary_negotiable: 급여가 "협의/면접 후 결정/비공개/비율제(예: 5:5)" 등 고정 금액이 아니면 true, 고정 금액이 명시되면 false.
- work_days: 실제 "근무"하는 요일만 "월,화,수,목,금,토,일" 중에서 콤마로(휴무 요일은 제외). 예: "(월,화 휴무) 수,목,금,토,일" → "수,목,금,토,일". "주5일"만 있고 요일 불명확이면 "월,화,수,목,금". 요일이 협의/유동이면 "협의". 없으면 "".
- work_time: 근무시간을 "HH:MM~HH:MM" 24시간 형식으로(예: "오전9시~오후7시30분" → "09:00~19:30", "9~18시" → "09:00~18:00"). 시간이 협의/탄력근무면 "협의". 없으면 "".
- homepage_url: 그 회사 자체의 홈페이지만. 지금 보고 있는 채용사이트(출처) 주소는 넣지 말 것. 회사 홈페이지가 없으면 "".
- extra_notes: 위 항목에 안 담기는 나머지 정보(근태제도·담당자 연락처·기타 안내 등)를 한국어로 항목별 정리(줄바꿈 구분). 급여·근무요일·근무시간·복리후생은 각 전용 필드(salary/work_days/work_time/benefits)에 넣고 여기 중복하지 말 것. 없으면 "".
- 원문 복제는 피하되 내용은 빠짐없이 옮길 것.
- 입력 중 [붙여넣은 공고 본문]이 있으면 그 내용을 최우선으로 신뢰하고, [페이지 텍스트]·[JSON-LD]·[__NEXT_DATA__]는 빠진 값을 채우는 보완용으로만 사용할 것.
- 모르는 값은 빈 문자열 "" 또는 빈 배열 [].`;
      const user = `URL: ${url || "(없음)"}\n호스트: ${hostname || "(없음)"}\n\n[붙여넣은 공고 본문 · 최우선 신뢰]\n${bodyText || "(없음)"}\n\n[JSON-LD]\n${jsonld || "(없음)"}\n\n[__NEXT_DATA__ / 초기상태(JSON에 공고 내용이 있을 수 있음)]\n${nextData || "(없음)"}\n\n[페이지 텍스트]\n${pageText || "(없음)"}`;

      // OCR 모드: 캡처 이미지(여러 장 가능)를 비전으로 읽는다. 위→아래 순서대로 이어붙여 한 공고로 인식.
      let userContent: any = user;
      if (imageUrls.length) {
        const imgBlocks: any[] = [];
        for (const iu of imageUrls) {
          try {
            const ir = await fetch(iu, {
              headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" },
            });
            if (!ir.ok) continue;
            const ibuf = Buffer.from(await ir.arrayBuffer());
            let mt = (ir.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
            if (!/^image\/(jpeg|png|gif|webp)$/.test(mt)) mt = "image/jpeg";
            if (ibuf.byteLength > 0 && ibuf.byteLength <= 5 * 1024 * 1024) {
              imgBlocks.push({ type: "image", source: { type: "base64", media_type: mt, data: ibuf.toString("base64") } });
            }
          } catch (e) {
            console.error("[ocr image fetch]", e);
          }
        }
        if (imgBlocks.length) {
          userContent = [
            ...imgBlocks,
            { type: "text", text: `위 이미지들은 하나의 채용공고 화면을 위에서 아래로 순서대로 캡처한 거야(총 ${imgBlocks.length}장). 모든 이미지의 글자를 정확히 읽어(OCR) 하나의 공고로 합쳐 위 규칙대로 JSON "하나만" 출력해. URL·호스트 정보는 없어.\n\n${user}` },
          ];
        }
      }

      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 3000,
        system: sys,
        messages: [{ role: "user", content: userContent }],
      });
      const raw = msg.content.map((c: any) => (c.type === "text" ? c.text : "")).join("").trim();
      const parsed = safeJsonParse(raw);
      if (parsed && typeof parsed === "object") {
        out = { ...out, ...parsed };
        out.ai_parsed = true;
      } else {
        console.error("[external parse LLM] JSON 파싱 실패. 원문 앞부분:", raw.slice(0, 300));
      }
    } catch (e) {
      console.error("[external parse LLM]", e);
    }
  }

  out.source_site = hostname;
  out.source_url = url;
  // 이미지: 무료 파서로 뽑았으면 그걸 사용(핫링크 차단 사이트는 재호스팅, 이미지 없는 소스는 빈 배열).
  // 무료 파싱이 아니면 기존 범용 추출 사용.
  if (freeParsed) {
    const referer = out._rehostReferer || "";
    if (out._rehost && Array.isArray(out.images) && out.images.length) {
      try {
        out.images = await rehostImages(out.images, referer);
      } catch (e) {
        console.error("[rehost images]", e);
        out.images = [];
      }
    } else if (!Array.isArray(out.images)) {
      out.images = []; // 잡코리아·알바몬 등 이미지 없는 소스 → 범용 추출 잡음 방지
    }
    // 파서가 배너/상세를 구분해 상세 이미지를 따로 지정한 경우(헤어인잡: 매장사진=배너, 상세요강 포스터=상세) → 재호스팅해 detail_images로.
    if (out._rehost && Array.isArray(out._detailImagesRaw) && out._detailImagesRaw.length) {
      try {
        out.detail_images = await rehostImages(out._detailImagesRaw, referer);
      } catch (e) {
        console.error("[rehost detail images]", e);
      }
    }
    // 포스터형(뷰티잡): images 자체가 상세 본문 포스터 → detail_images로 이동(배너 비움).
    if (out._detailImages) {
      out.detail_images = Array.isArray(out.images) ? out.images : [];
      out.images = [];
    }
    out.cover_image = (Array.isArray(out.images) && out.images[0]) || "";
  } else {
    out.cover_image = /^https?:\/\//i.test(ogImage) ? ogImage : "";
    out.images = images;
  }
  delete out._rehost;
  delete out._rehostReferer;
  delete out._detailImages;
  delete out._detailImagesRaw;
  // 연락처: AI가 못 뽑았으면 정규식 후보로 폴백 + 형식 정리.
  if (typeof out.contact_phone !== "string" || out.contact_phone.replace(/\D/g, "").length < 9) out.contact_phone = phones[0] || "";
  if (typeof out.contact_email !== "string" || !/@/.test(out.contact_email)) out.contact_email = emails[0] || "";
  if (typeof out.contact_name !== "string") out.contact_name = "";
  if (out.apply_method === "REDIRECT" && !out.external_apply_url && url) out.external_apply_url = url;
  if (!["STORE", "OFFICE"].includes(out.job_type)) out.job_type = "STORE";
  if (!["REDIRECT", "EMAIL", "MANAGED"].includes(out.apply_method)) out.apply_method = "MANAGED";

  // ── 지원방식 자동판정 ──
  // 이메일 중계(EMAIL)는 관리자 대행과 동일 동작 → 통합.
  // 본문에 '홈페이지/자사 사이트에서 지원·접수' 신호가 있고 회사 홈페이지가 있으면 외부링크형, 그 외에는 관리자 대행.
  if (out.apply_method === "EMAIL") out.apply_method = "MANAGED";
  if (out.apply_method !== "REDIRECT") {
    const applyText = `${bodyText} ${pageText} ${typeof out.description === "string" ? out.description : ""}`.replace(/\s+/g, " ");
    // '기업/회사/자사 홈페이지에서 지원' 류 문구가 있으면 외부링크형, 아니면 관리자 대행.
    const hpApply =
      /(기업|회사|자사|당사|공식)\s*(홈페이지|사이트|페이지)[^.]{0,18}(지원|접수|입사|이력서|제출)/.test(applyText) ||
      /(지원|접수|입사|이력서)[^.]{0,18}(기업|회사|자사|당사|공식)\s*(홈페이지|사이트)/.test(applyText) ||
      /홈페이지\s*(?:에서|로|를\s*통해)?\s*(?:지원|접수|입사)/.test(applyText);
    if (hpApply) {
      out.apply_method = "REDIRECT";
      const hp = typeof out.homepage_url === "string" ? out.homepage_url.trim() : "";
      if (/^https?:\/\//i.test(hp)) out.external_apply_url = hp; // 홈페이지 URL이 잡히면 미리 채움(없으면 관리자가 입력)
    } else {
      out.apply_method = "MANAGED";
    }
  }

  // ── 폼 선택지와 정확히 일치하는 값만 남기도록 검증(오타·off-list 방지) ──
  if (typeof out.career !== "string" || !CAREER_OPTIONS.includes(out.career)) out.career = "";
  const catPool = out.job_type === "STORE" ? STORE_CATEGORIES : OFFICE_CATEGORIES;
  out.job_categories = Array.isArray(out.job_categories)
    ? out.job_categories.filter((c: any) => catPool.includes(c)).slice(0, 5) : [];
  const tagPool = out.job_type === "STORE" ? STORE_TAGS : OFFICE_TAGS;
  out.benefit_tags = Array.isArray(out.benefit_tags)
    ? [...new Set(out.benefit_tags.filter((t: any) => tagPool.includes(t)))] : [];
  out.always_open = out.always_open === true || (!out.deadline && out.always_open !== false && /상시|수시|충원|채용\s*시/.test(bodyText + " " + pageText));
  if (out.always_open) out.deadline = "";
  if (typeof out.region !== "string") out.region = "";
  // 서술형 텍스트 필드가 배열로 오면 줄바꿈 문자열로 정규화
  for (const k of ["requirements", "preferred", "benefits", "main_duties", "description", "company_description", "extra_notes", "salary", "address"]) {
    if (Array.isArray(out[k])) out[k] = out[k].filter(Boolean).join("\n");
    else if (out[k] == null) out[k] = "";
  }

  return ok(out);
}
