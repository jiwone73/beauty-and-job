// lib/external/miyonginjob.ts
// 회사명 → 미용인잡(miyonginjob.com) 채용공고 조회 (미용 종합)
//
// 역설계(브라우저 검증):
//   목록: GET https://www.miyonginjob.com/employ/employ_all.html?page=<N>   (EUC-KR)
//   상세: https://www.miyonginjob.com/employ/employ_detail.html?no=<번호>
//   ⚠ 이 사이트는 키워드 검색이 fetch로 서버 필터되지 않음(GET/POST 모두 기본 페이지 반환).
//     → '최근 공고 목록'을 여러 페이지 받아 회사명(제목 포함)으로 필터한다.
//        따라서 최근에 올라온 브랜드만 잡히는 한계가 있음(다른 소스가 보완).

import type { FoundJob } from "./hairinjob";

const BASE = "https://www.miyonginjob.com";
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

async function fetchListPage(page: number): Promise<FoundJob[]> {
  const url = `${BASE}/employ/employ_all.html?page=${page}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "ko,en;q=0.8" },
  });
  if (!res.ok) throw new Error(`miyonginjob 응답 ${res.status}`);
  const html = new TextDecoder("euc-kr").decode(new Uint8Array(await res.arrayBuffer()));

  const re = /<a[^>]*employ_detail\.html\?no=(\d+)[^>]*>([\s\S]*?)<\/a>/g;
  const seen = new Set<number>();
  const out: FoundJob[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const id = Number(m[1]);
    if (!id || seen.has(id)) continue;
    const title = decodeEntities(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (!title) continue;
    seen.add(id);
    out.push({
      idx: id,
      title: title.slice(0, 80),
      url: `${BASE}/employ/employ_detail.html?no=${id}`,
      source: "미용인잡",
    });
  }
  return out;
}

export async function findJobsByCompany(
  company: string,
  opts: { maxPages?: number; strict?: boolean } = {}
): Promise<{ total: number; matched: number; jobs: FoundJob[] }> {
  const maxPages = Math.min(Math.max(opts.maxPages ?? 3, 1), 10);
  const key = company.replace(/\s+/g, "");
  const all = new Map<number, FoundJob>();
  for (let page = 1; page <= maxPages; page++) {
    const items = await fetchListPage(page);
    const before = all.size;
    for (const j of items) if (!all.has(j.idx)) all.set(j.idx, j);
    if (items.length === 0 || all.size === before) break; // 새 결과 없으면 종료
  }
  const list = [...all.values()];
  const matched = list.filter((j) => j.title.replace(/\s+/g, "").includes(key));
  const jobs = (opts.strict ?? true) ? matched : list;
  return { total: list.length, matched: matched.length, jobs };
}
