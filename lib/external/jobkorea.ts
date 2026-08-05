// lib/external/jobkorea.ts
// 회사명 → 잡코리아 채용공고 조회 (본사·기업 공고에 강함)
//
// 역설계(브라우저 검증):
//   검색: GET https://www.jobkorea.co.kr/Search/?stext=<회사명>   (UTF-8, 서버렌더 HTML)
//   상세: https://www.jobkorea.co.kr/Recruit/GI_Read/<idx>
//   결과 HTML에서 GI_Read/<idx> 링크 + 제목(앵커 텍스트) 추출.
//   ⚠ 짧은 브랜드명은 무관 공고가 섞임(예: '리안헤어' → '리안베이커리').
//      → 제목에 회사명(공백 제거) 포함으로 필터해 잡음 제거(정밀도 우선).
//         회사가 한글 사명으로 공고를 올릴 때 가장 잘 잡힘.

import type { FoundJob } from "./hairinjob";

const BASE = "https://www.jobkorea.co.kr";
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
      try {
        return String.fromCodePoint(parseInt(h, 16));
      } catch {
        return "";
      }
    })
    .replace(/&#(\d+);/g, (_, d) => {
      try {
        return String.fromCodePoint(Number(d));
      } catch {
        return "";
      }
    })
    .replace(/&[a-z]+;/gi, " ");
}

export async function findJobsByCompany(
  company: string,
  opts: { strict?: boolean } = {}
): Promise<{ total: number; matched: number; jobs: FoundJob[] }> {
  const key = company.replace(/\s+/g, "");
  const url = `${BASE}/Search/?stext=${encodeURIComponent(company)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "ko,en;q=0.8" },
  });
  if (!res.ok) throw new Error(`jobkorea 응답 ${res.status}`);
  const html = new TextDecoder("utf-8").decode(new Uint8Array(await res.arrayBuffer()));

  const re = /GI_Read\/(\d+)[^>]*>([\s\S]{0,160}?)<\/a>/g;
  const seen = new Set<number>();
  const list: FoundJob[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const idx = Number(m[1]);
    if (!idx || seen.has(idx)) continue;
    const title = decodeEntities(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (!title) continue;
    seen.add(idx);
    list.push({
      idx,
      title,
      url: `${BASE}/Recruit/GI_Read/${idx}`,
      source: "잡코리아",
    });
  }

  const matched = list.filter((j) => j.title.replace(/\s+/g, "").includes(key));
  const jobs = (opts.strict ?? true) ? matched : list;
  return { total: list.length, matched: matched.length, jobs };
}
