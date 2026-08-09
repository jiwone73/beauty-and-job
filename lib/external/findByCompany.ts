// lib/external/findByCompany.ts
// 회사명 → 외부 채용공고 조회(멀티소스 9개)의 공용 로직.
// find-by-company API 라우트와 target-companies의 채용유무 자동확인(check-hiring)이 함께 사용.
// 조회만 하므로 과금 없음(파싱/불러오기 때만 AI 과금).

import type { FoundJob } from "@/lib/external/hairinjob";
import { findJobsByCompany as findHairinjob } from "@/lib/external/hairinjob";
import { findJobsByCompany as findJobkorea } from "@/lib/external/jobkorea";
import { findJobsByCompany as findAlbamon } from "@/lib/external/albamon";
import { findJobsByCompany as findBeautyjob } from "@/lib/external/beautyjob";
import { findJobsByCompany as findBeautyjobManager } from "@/lib/external/beautyjobmanager";
import { findJobsByCompany as findSaramin } from "@/lib/external/saramin";
import { findJobsByCompany as findMiyonginjob } from "@/lib/external/miyonginjob";
import { findJobsByCompany as findBeautyinjob } from "@/lib/external/beautyinjob";
import { findSelfSites } from "@/lib/external/selfSites";

export interface FindByCompanyResult {
  jobs: FoundJob[];
  sources: Record<string, number>;
  source_status: Record<string, string>;
}

export async function findJobsForCompany(
  company: string,
  opts: { maxPages?: number; strict?: boolean } = {}
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
    findBeautyjobManager(company, { strict }),
    findJobkorea(company, { strict }),
    findSaramin(company, { strict }),
    findMiyonginjob(company, { strict }),
    findBeautyinjob(company, { strict }),
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
  const bjmJobs = pull(3, "뷰티잡매니저");
  const jkJobs = pull(4, "잡코리아");
  const srJobs = pull(5, "사람인");
  const myJobs = pull(6, "미용인잡");
  const biJobs = pull(7, "뷰티인잡");

  // 병합 + url 기준 중복 제거
  const seen = new Set<string>();
  const jobs: FoundJob[] = [];
  for (const j of [...selfJobs, ...albaJobs, ...hairJobs, ...bjJobs, ...biJobs, ...bjmJobs, ...myJobs, ...jkJobs, ...srJobs]) {
    if (seen.has(j.url)) continue;
    seen.add(j.url);
    jobs.push(j);
  }

  return {
    jobs,
    sources: {
      자사홈페이지: selfJobs.length,
      알바몬: albaJobs.length,
      헤어인잡: hairJobs.length,
      뷰티잡: bjJobs.length,
      뷰티인잡: biJobs.length,
      뷰티잡매니저: bjmJobs.length,
      미용인잡: myJobs.length,
      잡코리아: jkJobs.length,
      사람인: srJobs.length,
    },
    source_status: sourceStatus,
  };
}
