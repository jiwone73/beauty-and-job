// lib/external/imageHash.ts
// 외부공고 이미지의 지각해시(dHash)·추출·호스트 기반 출처 분류 공용 유틸.
import JimpPkg from "jimp";
const Jimp: any = (JimpPkg as any).Jimp || JimpPkg;

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// dHash 9x8 → 64bit(16진 문자열). 리사이즈·재인코딩에도 동일 이미지면 동일/근접.
export async function dhashHex(buf: Buffer): Promise<string | null> {
  try {
    const img = await Jimp.read(buf);
    img.resize(9, 8).greyscale();
    let bits = "";
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const l = Jimp.intToRGBA(img.getPixelColor(x, y)).r;
      const r = Jimp.intToRGBA(img.getPixelColor(x + 1, y)).r;
      bits += l > r ? "1" : "0";
    }
    return BigInt("0b" + bits).toString(16);
  } catch { return null; }
}

export async function fetchImageBuf(u: string, referer?: string, timeout = 12000): Promise<Buffer | null> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(u, { signal: ctl.signal, headers: { "User-Agent": UA, Accept: "image/*", ...(referer ? { Referer: referer } : {}) } });
    if (!r.ok) return null;
    if (!/^image\//i.test(r.headers.get("content-type") || "")) return null;
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

export const isContentImg = (u: string) =>
  /^https?:\/\//i.test(u) && /\.(?:jpe?g|png|gif|webp)(?:$|\?|#)/i.test(u) &&
  !/(?:icon|logo|sprite|favicon|badge|spacer|blank|btn|button|arrow|bullet|_bg|banner|sns|kakao|naver|facebook|instagram|pixel|1x1|\/skin\/|\/common\/|\/images\/(?:main|newhair|btn|template)\/|\/template\/|\/static\/hiring\/images\/template\/)/i.test(u);

// 호스트/경로 기반 1차 출처 분류
export function classifyOrigin(url: string): "company" | "site_upload" | "site_template" {
  const u = (url || "").toLowerCase();
  if (/\/template\/|\/static\/hiring\/images\/template\/|contents\.albamon\.[a-z]+\/[^"']*\/(?:template|assets|header)\/|\/images\/(?:newhair|main)\//.test(u)) return "site_template";
  if (/file2?\.jobkorea\.co\.kr|saraminimage\.co\.kr|file\.albamon\.com|beautyjob\.kr\/data\/|beautyinjob\.kr\/data\/|hairinjob\.com\/upload\/|\/wysiwyg\/peg\/|beautyjobmanager\.com|miyonginjob\.com/.test(u)) return "site_upload";
  return "company";
}

// 페이지에 "무단 이용/전재/복제 금지·저작권" 등 사이트가 이미지 재사용을 금지하는 문구가 있는지
export function hasCopyrightNotice(html: string): boolean {
  const t = html.replace(/<[^>]+>/g, " ");
  return /무단\s*(?:으로\s*)?(?:이용|전재|복제|게재|사용|배포)|저작권법에\s*(?:의해|의거)|타\s*사이트에\s*게재|템플릿으로\s*제작/.test(t);
}

// 공고 URL → { images: 상세 콘텐츠 이미지 원본 URL들(본문+iframe), protected: 저작권 문구 유무 }
export async function extractPostingImages(url: string): Promise<{ images: string[]; protected: boolean }> {
  let host = ""; try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { return { images: [], protected: false }; }
  const out = new Set<string>();
  const abs = (u: string) => { try { return new URL(u.replace(/&amp;/g, "&"), url).href; } catch { return ""; } };
  const collect = (h: string) => { for (const m of h.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) { const a = abs(m[1]); if (isContentImg(a)) out.add(a); } };
  const mainHtml = await fetchHtml(url);
  collect(mainHtml);
  const isProtected = hasCopyrightNotice(mainHtml);
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
  return { images: [...out].slice(0, 10), protected: isProtected };
}
