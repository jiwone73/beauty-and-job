// lib/external/selectme.ts
// 회사명 → 셀렉미(selectme.co.kr) 채용공고 조회 (미용 전문 채용 플랫폼)
//
// 역설계(브라우저 검증):
//   검색: GET https://www.selectme.co.kr/recruit?keyword=<회사명>&start=0&perPage=50&order=DESC&sort=accuracy
//   상세: https://www.selectme.co.kr/recruit/<id>
//   Next.js App Router(RSC)라 목록/상세 데이터가 self.__next_f 스트림 JSON에 서버렌더된다.
//   각 공고 객체: {"isInvisibleClosedRecruit":..,"status":"ing",..,"shopName":"..","title":"..",.., "id":<recruitId>,"ceoId":..}
//   · status "ing" = 진행중(활성). 그 외(마감/종료)는 목록에서 제외한다 → 상세검증 불필요.
//   · 상세 URL의 recruitId = 객체의 "id"(바로 뒤에 "ceoId"가 따라옴).

import type { FoundJob } from "./hairinjob";

const BASE = "https://www.selectme.co.kr";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// RSC 스트림은 JSON이 \" 로 이스케이프돼 있다 → 한 번 풀어 일반 텍스트로.
function unescapeRsc(s: string): string {
  return s.replace(/\\"/g, '"');
}

export interface SelectmeRecruit {
  id: number;
  shopName: string;
  title: string;
  status: string;
}

// RSC 텍스트에서 공고 객체들을 추출(각 객체는 isInvisibleClosedRecruit 플래그로 시작).
export function extractRecruits(html: string): SelectmeRecruit[] {
  const text = unescapeRsc(html);
  const out: SelectmeRecruit[] = [];
  const seen = new Set<number>();
  // 객체 경계: "isInvisibleClosedRecruit": 이후 ~ 다음 경계 전까지가 한 공고
  const chunks = text.split('"isInvisibleClosedRecruit":').slice(1);
  for (const c of chunks) {
    const idM = c.match(/"id":(\d+),"ceoId":/);
    if (!idM) continue;
    const id = Number(idM[1]);
    if (!id || seen.has(id)) continue;
    const snM = c.match(/"shopName":"([^"]*)"/);
    const tiM = c.match(/"title":"((?:[^"\\]|\\.)*)"/);
    const stM = c.match(/^(?:true|false),"status":"([^"]*)"/);
    const shopName = (snM?.[1] || "").trim();
    if (!shopName) continue;
    seen.add(id);
    out.push({
      id,
      shopName,
      title: (tiM?.[1] || "").replace(/\\n/g, " ").replace(/\\/g, "").trim(),
      status: stM?.[1] || "",
    });
  }
  return out;
}

export async function findJobsByCompany(
  company: string,
  opts: { strict?: boolean } = {}
): Promise<{ total: number; matched: number; jobs: FoundJob[] }> {
  const key = company.replace(/\s+/g, "");
  const url = `${BASE}/recruit?keyword=${encodeURIComponent(company)}&start=0&perPage=50&order=DESC&sort=accuracy`;
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "ko,en;q=0.8" } });
  if (!res.ok) throw new Error(`selectme 응답 ${res.status}`);
  const html = new TextDecoder("utf-8").decode(new Uint8Array(await res.arrayBuffer()));

  const recruits = extractRecruits(html);
  // 활성(status "ing")만. shopName(공백 제거)이 회사명을 포함하면 매칭.
  const active = recruits.filter((r) => r.status === "ing");
  const list: FoundJob[] = active.map((r) => ({
    idx: r.id,
    title: (r.title || r.shopName).slice(0, 80),
    url: `${BASE}/recruit/${r.id}`,
    source: "셀렉미",
  }));
  const matched = active
    .filter((r) => r.shopName.replace(/\s+/g, "").includes(key))
    .map((r) => ({ idx: r.id, title: (r.title || r.shopName).slice(0, 80), url: `${BASE}/recruit/${r.id}`, source: "셀렉미" }));

  const jobs = (opts.strict ?? true) ? matched : list;
  return { total: list.length, matched: matched.length, jobs };
}
