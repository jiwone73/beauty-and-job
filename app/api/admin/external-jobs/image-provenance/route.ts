export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextRequest } from "next/server";
import { ok, err, requireAuth } from "@/lib/api";
import JimpPkg from "jimp";
// jimp 0.22: default export가 Jimp 클래스(환경에 따라 .Jimp로도 노출)
const Jimp: any = (JimpPkg as any).Jimp || JimpPkg;

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// ── 지각적 해시(dHash 9x8 → 64bit) : 리사이즈·재인코딩에도 동일 이미지면 근접 ──
async function dhash(buf: Buffer): Promise<bigint | null> {
  try {
    const img = await Jimp.read(buf);
    img.resize(9, 8).greyscale();
    let bits = "";
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const l = Jimp.intToRGBA(img.getPixelColor(x, y)).r;
      const r = Jimp.intToRGBA(img.getPixelColor(x + 1, y)).r;
      bits += l > r ? "1" : "0";
    }
    return BigInt("0b" + bits);
  } catch { return null; }
}
function hamming(a: bigint, b: bigint): number { let x = a ^ b, c = 0; while (x) { c += Number(x & 1n); x >>= 1n; } return c; }

async function fetchBuf(u: string, referer?: string, timeout = 12000): Promise<Buffer | null> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(u, { signal: ctl.signal, headers: { "User-Agent": UA, Accept: "image/*", ...(referer ? { Referer: referer } : {}) } });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "";
    if (!/^image\//i.test(ct)) return null;
    const b = Buffer.from(await r.arrayBuffer());
    return b.byteLength >= 500 && b.byteLength <= 12 * 1024 * 1024 ? b : null;
  } catch { return null; } finally { clearTimeout(t); }
}
async function fetchHtml(u: string, referer?: string, timeout = 12000): Promise<string> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(u, { signal: ctl.signal, headers: { "User-Agent": UA, "Accept-Language": "ko,en;q=0.8", ...(referer ? { Referer: referer } : {}) } });
    if (!r.ok) return "";
    const buf = Buffer.from(await r.arrayBuffer());
    let h = new TextDecoder("utf-8").decode(buf);
    if ((h.match(/�/g)?.length || 0) > 5) { try { h = new TextDecoder("euc-kr").decode(buf); } catch { /* keep */ } }
    return h;
  } catch { return ""; } finally { clearTimeout(t); }
}

const isContentImg = (u: string) =>
  /^https?:\/\//i.test(u) && /\.(?:jpe?g|png|gif|webp)(?:$|\?|#)/i.test(u) &&
  !/(?:icon|logo|sprite|favicon|badge|spacer|blank|btn|button|arrow|bullet|_bg|banner|sns|kakao|naver|facebook|instagram|pixel|1x1|\/skin\/|\/common\/|\/images\/(?:main|newhair|btn|template)\/|\/template\/|\/static\/hiring\/images\/template\/)/i.test(u);

// 공고 URL → 상세 콘텐츠 이미지 원본 URL들(본문 + 알려진 iframe). 해시 대조용이라 재호스팅 없이 원본만.
async function extractImages(url: string): Promise<string[]> {
  let host = ""; try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { return []; }
  const out = new Set<string>();
  const abs = (u: string) => { try { return new URL(u.replace(/&amp;/g, "&"), url).href; } catch { return ""; } };
  const collect = (h: string) => { for (const m of h.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) { const a = abs(m[1]); if (isContentImg(a)) out.add(a); } };
  const html = await fetchHtml(url);
  collect(html);
  try {
    if (/beautyjob\.kr/i.test(host)) {
      const seg = new URL(url).pathname.split("/").filter(Boolean);
      if (seg[0] && /^\d+$/.test(seg[1] || "")) collect(await fetchHtml(`https://www.beautyjob.kr/jobkorea_iframe.php?bo_table=${encodeURIComponent(seg[0])}&wr_id=${seg[1]}`, url));
    } else if (/jobkorea\.co\.kr/i.test(host)) {
      const gno = (url.match(/GI_Read\/(\d+)/) || url.match(/Gno=(\d+)/) || [])[1];
      if (gno) {
        const ih = await fetchHtml(`https://www.jobkorea.co.kr/Recruit/GI_Read_Comt_Ifrm?Gno=${gno}`, url);
        collect(ih);
        for (const m of ih.matchAll(/file2\.jobkorea\.co\.kr[\\/]+Net[\\/]+Mng[\\/]+DownImage[\\/]+CorpEditor\?file_No=\d+/gi)) out.add("https://" + m[0].replace(/\\/g, ""));
      }
    } else if (/saramin\.co\.kr/i.test(host)) {
      const rec = (new URL(url).searchParams.get("rec_idx") || (url.match(/rec_idx=(\d+)/) || [])[1] || "");
      if (rec) collect(await fetchHtml(`https://www.saramin.co.kr/zf_user/jobs/relay/view-detail?rec_idx=${rec}`, url));
    }
  } catch { /* iframe 실패 무시 */ }
  return [...out].slice(0, 10);
}

export async function POST(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const b = await req.json().catch(() => ({}));
  const current: string[] = (Array.isArray(b.current) ? b.current : []).map((s: any) => String(s || "")).filter(Boolean).slice(0, 10);
  const siblings: { url: string; source: string }[] = (Array.isArray(b.siblings) ? b.siblings : [])
    .map((s: any) => ({ url: String(s?.url || ""), source: String(s?.source || "") }))
    .filter((s: { url: string }) => /^https?:\/\//i.test(s.url)).slice(0, 6);
  if (!current.length) return err("VALIDATION_001", "대조할 현재 이미지가 없어요.", 400);
  if (!siblings.length) return ok({ results: current.map((url) => ({ url, crossSite: false, sources: [] })), sibling_count: 0 });

  // 현재 이미지 해시(재호스팅된 Supabase URL도 내용은 동일)
  const curHashes = await Promise.all(current.map(async (u) => ({ url: u, hash: await dhash((await fetchBuf(u)) || Buffer.alloc(0)) })));
  // 타 사이트 이미지 해시(사이트별)
  const sibHashes: { source: string; hash: bigint }[] = [];
  await Promise.all(siblings.map(async (s) => {
    const imgs = await extractImages(s.url);
    const ref = (() => { try { return "https://" + new URL(s.url).hostname + "/"; } catch { return ""; } })();
    for (const iu of imgs.slice(0, 8)) {
      const buf = await fetchBuf(iu, ref);
      const h = buf ? await dhash(buf) : null;
      if (h != null) sibHashes.push({ source: s.source || new URL(s.url).hostname, hash: h });
    }
  }));

  const THRESH = 6; // dHash Hamming ≤6 = 사실상 동일 이미지
  const results = curHashes.map(({ url, hash }) => {
    if (hash == null) return { url, crossSite: false, sources: [] as string[] };
    const matched = [...new Set(sibHashes.filter((s) => hamming(hash, s.hash) <= THRESH).map((s) => s.source))];
    return { url, crossSite: matched.length > 0, sources: matched };
  });
  return ok({ results, sibling_count: siblings.length, sibling_images: sibHashes.length });
}
