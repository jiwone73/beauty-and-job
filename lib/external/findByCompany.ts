// lib/external/findByCompany.ts
// 회사명 → 외부 채용공고 조회(멀티소스: 자사홈 + 헤어인잡·알바몬·잡코리아·사람인·뷰티잡·셀렉미)의 공용 로직.
// find-by-company API 라우트와 target-companies의 채용유무 자동확인(check-hiring)이 함께 사용.
// 조회만 하므로 과금 없음(파싱/불러오기 때만 AI 과금).

import type { FoundJob } from "@/lib/external/hairinjob";
import { findJobsByCompany as findHairinjob } from "@/lib/external/hairinjob";
import { findJobsByCompany as findJobkorea } from "@/lib/external/jobkorea";
import { findJobsByCompany as findAlbamon } from "@/lib/external/albamon";
import { findJobsByCompany as findBeautyjob } from "@/lib/external/beautyjob";
import { findJobsByCompany as findSaramin } from "@/lib/external/saramin";
import { findJobsByCompany as findSelectme } from "@/lib/external/selectme";
import { findSelfSites } from "@/lib/external/selfSites";

export interface FindByCompanyResult {
  jobs: FoundJob[];
  sources: Record<string, number>;
  source_status: Record<string, string>;
}

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// 제목에 '채용완료' 등 완료 표시가 있는 공고 = 마감(요청 없이 판별). '마감임박' 등 진행중 표현은 제외.
const CLOSED_TITLE = /(?:채용|모집|충원|구인)\s*완료|마감\s*(?:되었|됐|완료)/;

// 상세 검증으로 마감을 걸러야 하는 소스(현재 없음 — 셀렉미는 status="ing"로 목록에서 이미 활성만 반환).
const VERIFY_SOURCES = new Set<string>([]);
async function isClosedDetail(url: string): Promise<boolean> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(url, { signal: ctl.signal, headers: { "User-Agent": UA, "Accept-Language": "ko,en;q=0.8" } });
    clearTimeout(t);
    if (!r.ok) return false;
    const buf = Buffer.from(await r.arrayBuffer());
    let h = new TextDecoder("utf-8").decode(buf);
    if ((h.match(/�/g)?.length || 0) > 5) { try { h = new TextDecoder("euc-kr").decode(buf); } catch { /* keep */ } }
    return /마감된\s*채용/.test(h) && /조회할\s*수\s*없|history\.back/.test(h);
  } catch { return false; } // 오류 시 숨기지 않음(활성일 수 있음)
}
async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); }
  }));
  return out;
}

export async function findJobsForCompany(
  company: string,
  opts: { maxPages?: number; strict?: boolean; verifyOpen?: boolean } = {}
): Promise<FindByCompanyResult> {
  const maxPages = opts.maxPages ?? 5;
  const strict = opts.strict ?? true;

  // 자사 홈페이지(동기) — 항상 포함
  const selfJobs = findSelfSites(company);

  // 잡보드(비동기) — 한 곳이 실패해도 나머지는 반환
  const settled = await Promise.allSettled([
    findHairinjob(company, { maxPages, strict }),
    findAlbamon(company, { strict }),
    findBeautyjob(company, { strict }),
    findSelectme(company, { strict }),
    findJobkorea(company, { strict }),
    findSaramin(company, { strict }),
  ]);

  const sourceStatus: Record<string, string> = { 자사홈페이지: "ok" };
  const pull = (i: number, label: string): FoundJob[] => {
    const r = settled[i];
    if (r.status === "fulfilled") {
      sourceStatus[label] = "ok";
      return r.value.jobs;
    }
    sourceStatus[label] = `error: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`;
    return [];
  };
  const hairJobs = pull(0, "헤어인잡");
  const albaJobs = pull(1, "알바몬");
  const bjJobs = pull(2, "뷰티잡");
  const smJobs = pull(3, "셀렉미");
  const jkJobs = pull(4, "잡코리아");
  const srJobs = pull(5, "사람인");

  // 병합 + url 기준 중복 제거
  const seen = new Set<string>();
  const merged: FoundJob[] = [];
  for (const j of [...selfJobs, ...albaJobs, ...hairJobs, ...bjJobs, ...smJobs, ...jkJobs, ...srJobs]) {
    if (seen.has(j.url)) continue;
    seen.add(j.url);
    merged.push(j);
  }

  // 마감 공고 제외 — (1) 제목 완료표시(비용 0, 모든 소스) (2) 단건 조회 시 EUC-KR 보드는 상세 검증
  let jobs = merged.filter((j) => !CLOSED_TITLE.test(j.title));
  if (opts.verifyOpen) {
    const toCheck = jobs.filter((j) => VERIFY_SOURCES.has(j.source));
    if (toCheck.length) {
      const flags = await mapLimit(toCheck, 6, (j) => isClosedDetail(j.url));
      const closed = new Set(toCheck.filter((_, i) => flags[i]).map((j) => j.url));
      if (closed.size) jobs = jobs.filter((j) => !closed.has(j.url));
    }
  }

  // 소스별 카운트는 필터 후 실제 표시분 기준(목록과 숫자 일치)
  const sources: Record<string, number> = {
    자사홈페이지: 0, 알바몬: 0, 헤어인잡: 0, 뷰티잡: 0, 셀렉미: 0, 잡코리아: 0, 사람인: 0,
  };
  for (const j of jobs) if (j.source in sources) sources[j.source] += 1;

  return { jobs, sources, source_status: sourceStatus };
}
