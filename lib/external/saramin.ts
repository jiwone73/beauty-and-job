// lib/external/saramin.ts
// 회사명 → 사람인(saramin.co.kr) 채용공고 조회 (본사·기업 공고, 잡코리아와 상호보완)
//
// 역설계(브라우저 검증):
//   검색: GET https://www.saramin.co.kr/zf_user/search/recruit?searchword=<회사명>  (UTF-8)
//   상세: https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=<id>
//   결과 HTML에서 rec_idx=<id> + 제목(앵커) 추출. 제목에 회사명 포함으로 필터(짧은 명칭 잡음 제거).

import type { FoundJob } from "./hairinjob";
import { 브랜드공고인가 } from "./beautyMatch";

const BASE = "https://www.saramin.co.kr";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

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
  const url = `${BASE}/zf_user/search/recruit?searchword=${encodeURIComponent(company)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "ko,en;q=0.8" },
  });
  if (!res.ok) throw new Error(`saramin 응답 ${res.status}`);
  const html = new TextDecoder("utf-8").decode(new Uint8Array(await res.arrayBuffer()));

  const re = /rec_idx=(\d+)[^>]*>([\s\S]{0,160}?)<\/a>/g;
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
      title,
      url: `${BASE}/zf_user/jobs/relay/view?rec_idx=${id}`,
      source: "사람인",
    });
  }

  const matched = list.filter((j) => 브랜드공고인가(j.title, company, true));
  const jobs = (opts.strict ?? true) ? matched : list;
  return { total: list.length, matched: matched.length, jobs };
}
