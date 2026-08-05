// lib/external/beautyjob.ts
// 회사명 → 뷰티잡(beautyjob.kr) 채용공고 조회 (피부·에스테틱·스파·마사지·의료미용 현장에 강함)
//
// 역설계(브라우저 검증):
//   검색: GET https://www.beautyjob.kr/massagejob?sfl=wr_subject&stx=<회사명>  (UTF-8, 그누보드)
//   상세: https://www.beautyjob.kr/massagejob/<번호>
//   목록 HTML에서 /massagejob/<번호> 링크 추출 + 앵커 태그 뒤 텍스트=상호명+제목.
//   제목에 회사명(공백 제거) 포함으로 필터.

import type { FoundJob } from "./hairinjob";

const BASE = "https://www.beautyjob.kr";
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
  const url = `${BASE}/massagejob?sfl=wr_subject&stx=${encodeURIComponent(company)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "ko,en;q=0.8" },
  });
  if (!res.ok) throw new Error(`beautyjob 응답 ${res.status}`);
  const html = new TextDecoder("utf-8").decode(new Uint8Array(await res.arrayBuffer()));

  const re = /\/massagejob\/(\d+)/g;
  const seen = new Set<number>();
  const list: FoundJob[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const id = Number(m[1]);
    if (!id || seen.has(id)) continue;
    // 앵커 태그의 닫는 '>' 다음부터가 상호명+제목(중첩 태그 있어 슬라이스 후 태그 제거)
    const gt = html.indexOf(">", m.index);
    if (gt < 0) continue;
    const title = decodeEntities(html.slice(gt + 1, gt + 260).replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    if (!title) continue;
    seen.add(id);
    list.push({
      idx: id,
      title: title.slice(0, 80),
      url: `${BASE}/massagejob/${id}`,
      source: "뷰티잡",
    });
  }

  const matched = list.filter((j) => j.title.replace(/\s+/g, "").includes(key));
  const jobs = (opts.strict ?? true) ? matched : list;
  return { total: list.length, matched: matched.length, jobs };
}
