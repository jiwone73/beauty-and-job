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

// ── 뷰티워크 폼과 100% 일치시켜야 하는 선택지 (드롭다운·칩) ──
const CAREER_OPTIONS = ["신입", "1년 이상", "2년 이상", "3년 이상", "5년 이상", "경력 무관"];
const STORE_CATEGORIES = ["헤어 디자이너", "헤어 스태프·인턴", "바버(이용)", "두피·탈모 관리", "가발·증모", "메이크업 아티스트", "웨딩·방송 메이크업", "메이크업 강사", "네일 아티스트", "젤·패디큐어 전문", "네일 스태프·인턴", "피부관리사(에스테티션)", "바디·체형 관리", "스파·테라피", "두피·스칼프 케어", "속눈썹 연장", "왁싱", "반영구 화장(눈썹·아이라인·입술)", "타투", "애견 미용사(그루머)", "애견 미용 스태프·인턴", "펫 스파·목욕", "뷰티 어드바이저(BA)·화장품 판매", "샵 매니저·실장", "안내데스크·리셉션", "상담·코디네이터", "원장·교육강사"];
const OFFICE_CATEGORIES = ["브랜드 마케팅", "퍼포먼스·디지털 마케팅", "콘텐츠·SNS·인플루언서", "홍보·PR", "상품기획", "MD(머천다이징)", "트렌드·시장조사", "국내영업(H&B·백화점·면세)", "온라인·이커머스 영업", "글로벌·수출 영업", "영업관리·VMD", "화장품 연구개발(처방·제형)", "생산관리·SCM", "품질관리(QC·QA)·인허가(RA)", "패키지·제품 디자인", "그래픽·웹 디자인", "영상·콘텐츠 제작", "인사·총무", "재무·회계·법무", "경영기획·전략", "IT·개발", "고객상담·CS·교육"];
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
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko,en;q=0.8",
          },
        });
        clearTimeout(t);
        if (r.ok) {
          // 인코딩 자동 감지: 구형 한국 사이트(EUC-KR) 대응. 일부는 meta에 UTF-8이라 거짓 선언하므로 깨짐(�)으로 판별.
          const buf = Buffer.from(await r.arrayBuffer());
          const ctCharset = (r.headers.get("content-type") || "").match(/charset=([\w-]+)/i)?.[1]?.toLowerCase() || "";
          if (/^(ks_c_5601|ksc5601|cp949|windows-949|euc-?kr)$/i.test(ctCharset)) {
            html = new TextDecoder("euc-kr").decode(buf);
          } else {
            html = new TextDecoder("utf-8").decode(buf);
            if ((html.match(/�/g)?.length || 0) > 5) {
              try { html = new TextDecoder("euc-kr").decode(buf); } catch { /* euc-kr 미지원 시 utf-8 유지 */ }
            }
          }
        }
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
        // ⑦ (SPA 폴백) 이미지가 1장 이하면, __NEXT_DATA__/인라인 JSON 스크립트에서 이미지 URL을 추가로 긁는다(beautyin 등 React SPA 대응).
        if (images.length <= 1) {
          const blobs = [...html.matchAll(/<script[^>]*(?:__NEXT_DATA__|application\/json|__NUXT__|INITIAL_STATE)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
          const nd = blobs.join(" ");
          const found = [...nd.matchAll(/https?:\\?\/\\?\/[^\s"'<>()\\]+?\.(?:jpe?g|png|webp)(?:\?[^\s"'<>()\\]*)?/gi)]
            .map((m) => m[0].replace(/\\u002[Ff]/g, "/").replace(/\\\//g, "/").replace(/&amp;/g, "&"))
            .filter((u) => isImg(u) && !isJunk(u) && !/\/(banner|ad|ads|event|promo|premium)\//i.test(u));
          for (const u of found) if (!images.includes(u)) images.push(u);
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
    .filter((e) => !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(e)).slice(0, 5);

  let out: any = {
    ai_parsed: false,
    company_name: "", homepage_url: "", contact_email: emails[0] || "",
    title: ogTitle, job_type: "STORE", location: "", region: "", deadline: "", always_open: false,
    apply_method: emails[0] ? "EMAIL" : "MANAGED", external_apply_url: "",
    description: ogDesc,
    company_description: "", address: "", industry: "",
    job_categories: [] as string[],
    requirements: "", preferred: "", benefits: "", benefit_tags: [] as string[], hiring_process: [] as string[],
    employment_type: "", career: "", salary: "", salary_type: "", salary_amount: 0, salary_amount_max: 0, salary_negotiable: false, work_days: "", work_time: "", extra_notes: "", main_duties: "",
  };

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const sys = `너는 뷰티 채용공고 페이지에서 핵심 정보를 뽑아 JSON으로 정리하는 도우미야.
반드시 아래 키를 가진 JSON "하나만" 출력해(설명·코드펜스 금지):
{"company_name","homepage_url","contact_email","title","job_type","job_categories","region","location","deadline","always_open","apply_method","external_apply_url","description","company_description","address","industry","requirements","preferred","benefits","benefit_tags","hiring_process","employment_type","career","salary","salary_type","salary_amount","salary_amount_max","salary_negotiable","work_days","work_time","extra_notes","main_duties"}
규칙:
- job_type: 미용실·네일·피부·속눈썹 등 현장 미용직이면 "STORE", 화장품 브랜드·유통·본사 등 사무직이면 "OFFICE".
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
- apply_method: 채용 이메일이 보이면 "EMAIL"(그 이메일을 contact_email에), 지원이 특정 지원페이지에서만 가능하면 "REDIRECT"(그 링크를 external_apply_url에), 애매하면 "MANAGED".
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
   · salary_amount: 숫자만(범위면 하한값). 연봉·월급·주급은 "만원" 단위, 시급은 "원" 단위(예: 시급 12000원→12000). 없거나 협의면 0.
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
      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 3000,
        system: sys,
        messages: [{ role: "user", content: user }],
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
  out.cover_image = /^https?:\/\//i.test(ogImage) ? ogImage : "";
  out.images = images;
  if (out.apply_method === "REDIRECT" && !out.external_apply_url && url) out.external_apply_url = url;
  if (!["STORE", "OFFICE"].includes(out.job_type)) out.job_type = "STORE";
  if (!["REDIRECT", "EMAIL", "MANAGED"].includes(out.apply_method)) out.apply_method = "MANAGED";

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
