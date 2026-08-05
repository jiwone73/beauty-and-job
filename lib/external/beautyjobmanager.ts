// lib/external/beautyjobmanager.ts
// 회사명 → 뷰티잡매니저(beautyjobmanager.com, 구 뷰티잡119) 채용공고 조회 (네일·미용에 강함)
//
// 역설계(브라우저 검증):
//   검색: GET https://beautyjobmanager.com/m/content/work_employ_list.html?top_smode=all&top_skey=<회사명(EUC-KR)>
//   상세: https://beautyjobmanager.com/m/content/work_employ_detail.html?no=<번호>
//   ⚠ 사이트가 EUC-KR → 검색어도 EUC-KR 퍼센트 인코딩 필요(UTF-8로 보내면 0건).
//     응답도 EUC-KR. 프리미엄(고정) 공고가 상단에 섞이지만 제목 회사명 필터로 걸러짐.
//
//   EUC-KR 인코딩은 의존성 없이: TextDecoder('euc-kr')로 바이트→문자 역매핑을 1회 생성(캐시).

import type { FoundJob } from "./hairinjob";

const BASE = "https://beautyjobmanager.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// ── EUC-KR 퍼센트 인코더(런타임 역매핑, 캐시) ──
let EUCKR_MAP: Map<string, [number, number]> | null = null;
function buildEucKrMap(): Map<string, [number, number]> {
  const map = new Map<string, [number, number]>();
  const dec = new TextDecoder("euc-kr", { fatal: false });
  for (let hi = 0xa1; hi <= 0xfe; hi++) {
    for (let lo = 0x41; lo <= 0xfe; lo++) {
      const ch = dec.decode(new Uint8Array([hi, lo]));
      if (ch.length === 1 && ch !== "�" && !map.has(ch)) map.set(ch, [hi, lo]);
    }
  }
  return map;
}
function eucKrPercent(str: string): string {
  if (!EUCKR_MAP) EUCKR_MAP = buildEucKrMap();
  let out = "";
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    if (code < 0x80) {
      out += encodeURIComponent(ch);
    } else {
      const b = EUCKR_MAP.get(ch);
      out += b
        ? `%${b[0].toString(16).toUpperCase().padStart(2, "0")}%${b[1].toString(16).toUpperCase().padStart(2, "0")}`
        : "%3F";
    }
  }
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      try { return String.fromCodePoint(parseInt(h, 16)); } catch { return ""; }
    })
    .replace(/&#(\d+);/g, (_, d) => {
      try { return String.fromCodePoint(Number(d)); } catch { return ""; }
    })
    .replace(/&[a-z]+;/gi, " ");
}

export async function findJobsByCompany(
  company: string,
  opts: { strict?: boolean } = {}
): Promise<{ total: number; matched: number; jobs: FoundJob[] }> {
  const key = company.replace(/\s+/g, "");
  const url = `${BASE}/m/content/work_employ_list.html?top_smode=all&top_skey=${eucKrPercent(company)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "ko,en;q=0.8" },
  });
  if (!res.ok) throw new Error(`beautyjobmanager 응답 ${res.status}`);
  const html = new TextDecoder("euc-kr").decode(new Uint8Array(await res.arrayBuffer()));

  // <a ... work_employ_detail.html?no=ID ...>제목(상호명)</a>
  const re = /<a[^>]*work_employ_detail\.html\?no=(\d+)[^>]*>([\s\S]*?)<\/a>/g;
  const seen = new Set<number>();
  const list: FoundJob[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const id = Number(m[1]);
    if (!id || seen.has(id)) continue;
    const title = decodeEntities(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (!title) continue;
    seen.add(id);
    list.push({
      idx: id,
      title: title.slice(0, 80),
      url: `${BASE}/m/content/work_employ_detail.html?no=${id}`,
      source: "뷰티잡매니저",
    });
  }

  const matched = list.filter((j) => j.title.replace(/\s+/g, "").includes(key));
  const jobs = (opts.strict ?? true) ? matched : list;
  return { total: list.length, matched: matched.length, jobs };
}
