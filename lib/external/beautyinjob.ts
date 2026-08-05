// lib/external/beautyinjob.ts
// 회사명 → 뷰티인잡(beautyinjob.kr) 채용공고 조회 (헤어·피부·네일 미용 종합)
//
// 역설계(브라우저 검증):
//   검색: GET https://www.beautyinjob.kr/job/lists?keyword=<회사명>   (UTF-8, jQuery 서버렌더)
//   상세: https://www.beautyinjob.kr/job/detail/<번호>
//   목록 HTML에서 /job/detail/<번호> 링크 + 제목("[샵명] 제목") 추출.
//   제목에 회사명(공백 제거) 포함으로 필터.  ※검색 파라미터는 keyword(searchword는 무시됨).

import type { FoundJob } from "./hairinjob";

const BASE = "https://www.beautyinjob.kr";
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
  const url = `${BASE}/job/lists?keyword=${encodeURIComponent(company)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "ko,en;q=0.8" },
  });
  if (!res.ok) throw new Error(`beautyinjob 응답 ${res.status}`);
  const html = new TextDecoder("utf-8").decode(new Uint8Array(await res.arrayBuffer()));

  const re = /<a[^>]*\/job\/detail\/(\d+)[^>]*>([\s\S]*?)<\/a>/g;
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
      url: `${BASE}/job/detail/${id}`,
      source: "뷰티인잡",
    });
  }

  const matched = list.filter((j) => j.title.replace(/\s+/g, "").includes(key));
  const jobs = (opts.strict ?? true) ? matched : list;
  return { total: list.length, matched: matched.length, jobs };
}
