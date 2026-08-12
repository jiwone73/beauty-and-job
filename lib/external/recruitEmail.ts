// lib/external/recruitEmail.ts
// 회사 홈페이지에서 "본사 채용담당 이메일"을 찾아온다.
//   홈페이지 → (채용/인재/careers/recruit 등 링크가 있으면) 그 페이지까지 → 이메일 수집 →
//   채용사이트 도메인·시스템 주소는 제외하고, 채용/인사 담당 이메일을 우선 반환.
// 조회만 하므로 과금 없음.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// 잡사이트(중계·문의용) 도메인 — 회사 이메일이 아니므로 제외
const SITE_EMAIL_DOMAIN =
  /(?:albamon|jobkorea|saramin|beautyjob|hairinjob|selectme|incruit|work24|jobplanet|wanted|catch|linkareer|worknet|alba)\.(?:com|co\.kr|kr|net)$/i;
// 호스팅·인프라 업체 도메인(푸터의 "호스팅 by ○○" 등) — 회사 이메일 아님
const HOSTING_DOMAIN =
  /(?:gabia|cafe24|whois|hostway|dnzone|megazone|iwinv|smileserv|hostinger|godaddy|namecheap|cloudflare|wix|imweb|sixshop|makeshop|nhncloud|ncloud|amazonaws|sentry|wordpress|squarespace)\.[a-z.]+$/i;
// 시스템/발신전용 로컬파트
const SYS_LOCAL = /no-?reply|noreply|do-?not|donotreply|mailer|postmaster|webmaster|hostmaster|abuse|hosting|host@|sample|example|your-?email|email@/i;

// 등록가능 도메인(co.kr 등 2단계 TLD 처리): junohair.com, jennyhouse.co.kr
function regDom(host: string): string {
  const parts = (host || "").toLowerCase().replace(/^www\./, "").split(".").filter(Boolean);
  if (parts.length >= 3 && /^(co|or|ne|go|re|pe|hs|ms|es|kg|sc|ac)$/.test(parts[parts.length - 2]) && parts[parts.length - 1] === "kr") {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

// 채용/인사 담당 우선 점수
function localScore(local: string): number {
  if (/recruit|hr(?![a-z])|human|career|jobs?|hire|hiring|apply|employ|saram|ingsa|chaeyong|인사|채용/i.test(local)) return 3;
  if (/ceo|owner|president|대표/i.test(local)) return 1;
  return 2;
}

function extractEmails(html: string): string[] {
  const plain = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const mailto = [...html.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi)].map((m) => m[1]);
  return [...new Set([...mailto, ...plain])]
    .map((e) => e.trim().toLowerCase())
    .filter((e) => !/\.(png|jpe?g|gif|webp|svg)$/i.test(e) && !/^[0-9a-f]{20,}@/i.test(e));
}

// 홈페이지 안에서 '채용' 성격 링크 후보(최대 n개) 추출
function recruitLinks(html: string, base: URL, n = 3): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,80}?)<\/a>/gi;
  let m: RegExpExecArray | null;
  const kw = /recruit|career|join|with-?us|채용|인재|인재영입|recruitment|jobs?|apply|입사|영입/i;
  while ((m = re.exec(html)) && out.length < n) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, " ");
    if (!kw.test(href) && !kw.test(text)) continue;
    try {
      const u = new URL(href, base);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      if (u.hostname !== base.hostname && !u.hostname.endsWith(base.hostname.replace(/^www\./, ""))) continue; // 같은 사이트만
      const key = u.href.split("#")[0];
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    } catch { /* skip */ }
  }
  return out;
}

async function fetchText(url: string, ms = 8000): Promise<string> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { "User-Agent": UA, "Accept-Language": "ko,en;q=0.8" }, redirect: "follow" });
    if (!r.ok) return "";
    const buf = Buffer.from(await r.arrayBuffer());
    let h = new TextDecoder("utf-8").decode(buf);
    if ((h.match(/�/g)?.length || 0) > 5) { try { h = new TextDecoder("euc-kr").decode(buf); } catch { /* keep */ } }
    return h;
  } catch {
    return "";
  } finally {
    clearTimeout(t);
  }
}

function pickBest(emails: string[], baseHost: string): string {
  const baseDom = regDom(baseHost);
  const ranked = emails
    .filter((e) => {
      const dom = e.split("@")[1] || "";
      return !SITE_EMAIL_DOMAIN.test(dom) && !HOSTING_DOMAIN.test(dom) && !SYS_LOCAL.test(e);
    })
    // 홈페이지와 같은 도메인 이메일을 강하게 우선(+10) → 호스팅/제3자 이메일보다 회사 자체 이메일 선택. + 채용 로컬파트 점수.
    .map((e, i) => {
      const sameDom = baseDom && regDom(e.split("@")[1] || "") === baseDom;
      return { e, s: (sameDom ? 10 : 0) + localScore(e.split("@")[0] || ""), i };
    })
    .sort((a, b) => b.s - a.s || a.i - b.i);
  return ranked[0]?.e || "";
}

export async function findRecruitEmailFromHomepage(
  homepage: string
): Promise<{ email: string; source: string } | null> {
  let raw = (homepage || "").trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  let base: URL;
  try { base = new URL(raw); } catch { return null; }
  // 인스타/페북 등 SNS는 이메일이 없어 스킵
  if (/instagram\.com|facebook\.com|blog\.naver\.com|youtube\.com|smartstore\.naver\.com/i.test(base.hostname)) return null;

  const isRecruit = (e: string) => localScore(e.split("@")[0] || "") === 3;

  const home = await fetchText(base.href);
  if (!home) return null;

  // 1) 홈페이지 이메일. '채용' 로컬파트면 바로 확정, 아니면(일반 연락 이메일) 폴백으로 두고 채용 페이지를 더 본다.
  let fallback: { email: string; source: string } | null = null;
  const homeBest = pickBest(extractEmails(home), base.hostname);
  if (homeBest) {
    if (isRecruit(homeBest)) return { email: homeBest, source: base.href };
    fallback = { email: homeBest, source: base.href };
  }

  // 2) 채용/인재 링크 + 흔한 채용 경로에서 '채용' 이메일 우선 탐색
  const links = recruitLinks(home, base, 3);
  const guessed = ["/recruit", "/careers", "/career", "/recruit.html", "/company/recruit", "/ko/careers"].map((p) => new URL(p, base).href);
  for (const link of [...links, ...guessed]) {
    const page = await fetchText(link);
    if (!page) continue;
    const best = pickBest(extractEmails(page), base.hostname);
    if (!best) continue;
    if (isRecruit(best)) return { email: best, source: link }; // 채용 담당 이메일 최우선
    if (!fallback) fallback = { email: best, source: link };
  }

  // 3) 채용 이메일이 없으면 회사 대표/연락 이메일이라도 반환
  return fallback;
}
