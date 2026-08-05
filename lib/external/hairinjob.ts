// lib/external/hairinjob.ts
// 회사명 → 헤어인잡(hairinjob.com) 채용공고 조회 로직 (route.ts에서 import해서 사용)
//
// 동작 원리(브라우저로 역설계 검증):
//   1) https://www.hairinjob.com/cms/search.php?total_search_option=all&total_search_keyword=<회사명>&page=<N>
//   2) 응답은 EUC-KR → TextDecoder('euc-kr')로 디코딩(UTF-8로 읽으면 제목 깨짐)
//   3) 상세공고 링크 /cms/s01_v.php?idx=<번호> + 제목 추출
//   4) 제목에 회사명(공백 제거) 포함으로 필터
//   5) page 1..maxPages 반복(새 결과 없거나 마지막 페이지면 종료)
//
// 주의: TextDecoder('euc-kr')는 full-icu 포함 Node 런타임 필요 → 호출하는 route는 runtime='nodejs'.

const BASE = "https://www.hairinjob.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const PAGE_SIZE = 25; // 헤어인잡 검색 1페이지 결과 수

export interface FoundJob {
  idx: number;
  title: string;
  url: string;
  source: string; // 출처 사이트 표시명 (예: "헤어인잡")
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => {
      try {
        return String.fromCodePoint(Number(d));
      } catch {
        return "";
      }
    })
    .replace(/&[a-z]+;/gi, " ");
}

async function fetchSearchPage(keyword: string, page: number): Promise<string> {
  const url =
    `${BASE}/cms/search.php?total_search_option=all` +
    `&total_search_keyword=${encodeURIComponent(keyword)}&page=${page}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "ko,en;q=0.8" },
  });
  if (!res.ok) throw new Error(`hairinjob 응답 ${res.status}`);
  const buf = await res.arrayBuffer();
  return new TextDecoder("euc-kr").decode(new Uint8Array(buf));
}

function extractJobs(html: string): FoundJob[] {
  // <a href="....s01_v.php?idx=123...">제목</a>
  const re = /s01_v\.php\?idx=(\d+)["'][^>]*>([\s\S]*?)<\/a>/g;
  const seen = new Set<number>();
  const out: FoundJob[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const idx = Number(m[1]);
    if (!idx || seen.has(idx)) continue;
    const title = decodeEntities(m[2].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    if (!title) continue;
    seen.add(idx);
    out.push({ idx, title, url: `${BASE}/cms/s01_v.php?idx=${idx}`, source: "헤어인잡" });
  }
  return out;
}

/** 회사명으로 헤어인잡 공고를 조회한다. */
export async function findJobsByCompany(
  company: string,
  opts: { maxPages?: number; strict?: boolean } = {}
): Promise<{ total: number; matched: number; jobs: FoundJob[] }> {
  const maxPages = Math.min(Math.max(opts.maxPages ?? 5, 1), 20);
  const key = company.replace(/\s+/g, "");
  const all = new Map<number, FoundJob>();

  for (let page = 1; page <= maxPages; page++) {
    const html = await fetchSearchPage(company, page);
    const jobs = extractJobs(html);
    const before = all.size;
    for (const j of jobs) if (!all.has(j.idx)) all.set(j.idx, j);
    // 새 결과가 없거나 마지막 페이지(결과 < 페이지크기)면 종료
    if (jobs.length === 0 || all.size === before || jobs.length < PAGE_SIZE) break;
  }

  const list = [...all.values()];
  const matched = list.filter((j) => j.title.replace(/\s+/g, "").includes(key));
  const jobs = (opts.strict ?? true) ? matched : list;
  return { total: list.length, matched: matched.length, jobs };
}
