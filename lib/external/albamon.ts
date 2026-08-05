// lib/external/albamon.ts
// 회사명 → 알바몬 채용공고 조회 (매장·알바 공고에 강함)
//
// 왜 잡코리아를 거치나:
//   알바몬 본사이트는 결과를 하이드레이션 후 크로스오리진 GraphQL BFF로 로드해서
//   서버렌더 HTML(__NEXT_DATA__)에 결과가 없다 → 백엔드 단순 fetch로는 공고를 못 얻음.
//   반면 잡코리아 '알바몬공고' 탭(tabType=amRecruit)이 알바몬 공고를 서버렌더로 집계하고,
//   각 카드에 실제 상세 URL(albamon.com/jobs/detail/<번호>)을 그대로 노출한다.
//   → 잡코리아 amRecruit HTML을 파싱해 알바몬 상세 URL을 얻는다(브라우저로 검증).
//
//   상세: https://www.albamon.com/jobs/detail/<번호>  (기존 parse 툴이 처리하는 형식)
//   정밀도: 카드의 매장/회사명에 회사명(공백 제거) 포함으로 필터.
//           알바몬 매장 공고는 대개 "브랜드 ○○점" 형태라 매장명에 브랜드가 들어감.

import type { FoundJob } from "./hairinjob";

const JK = "https://www.jobkorea.co.kr";
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
  const url = `${JK}/Search/?stext=${encodeURIComponent(company)}&tabType=amRecruit`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "ko,en;q=0.8" },
  });
  if (!res.ok) throw new Error(`albamon(via jobkorea) 응답 ${res.status}`);
  const html = new TextDecoder("utf-8").decode(new Uint8Array(await res.arrayBuffer()));

  // 각 카드의 첫 albamon 상세 링크 = 매장/회사명 앵커
  const re = /albamon\.com\/jobs\/detail\/(\d+)[^>]*>([\s\S]{0,140}?)<\/a>/g;
  const seen = new Set<number>();
  const list: FoundJob[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const id = Number(m[1]);
    if (!id || seen.has(id)) continue;
    const store = decodeEntities(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (!store) continue;
    seen.add(id);
    list.push({
      idx: id,
      title: store, // 예: "리안헤어 목동역점"
      url: `https://www.albamon.com/jobs/detail/${id}`,
      source: "알바몬",
    });
  }

  const matched = list.filter((j) => j.title.replace(/\s+/g, "").includes(key));
  const jobs = (opts.strict ?? true) ? matched : list;
  return { total: list.length, matched: matched.length, jobs };
}
