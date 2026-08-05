// app/api/admin/external-jobs/find-by-company/route.ts
// 회사명 → 외부 채용공고 URL 자동 조회 (멀티소스: 자사홈페이지 + 헤어인잡 + 잡코리아)
// 조회 로직은 lib/external/*.ts. Next.js route는 GET 등 정해진 export만 허용.
//
// 사용: GET /api/admin/external-jobs/find-by-company?company=준오헤어&maxPages=5&strict=true
//   → { success, company, sources, total, jobs: [{ idx, title, url, source }] }
// 반환된 url은 그대로 '외부 공고 불러오기'(parse) 툴에 넣어 자동 등록 가능.

import { NextRequest } from "next/server";
import type { FoundJob } from "@/lib/external/hairinjob";
import { findJobsByCompany as findHairinjob } from "@/lib/external/hairinjob";
import { findJobsByCompany as findJobkorea } from "@/lib/external/jobkorea";
import { findJobsByCompany as findAlbamon } from "@/lib/external/albamon";
import { findJobsByCompany as findBeautyjob } from "@/lib/external/beautyjob";
import { findJobsByCompany as findBeautyjobManager } from "@/lib/external/beautyjobmanager";
import { findJobsByCompany as findSaramin } from "@/lib/external/saramin";
import { findJobsByCompany as findMiyonginjob } from "@/lib/external/miyonginjob";
import { findSelfSites } from "@/lib/external/selfSites";

export const runtime = "nodejs"; // TextDecoder('euc-kr') 등 때문에 nodejs 고정
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const company = (sp.get("company") || "").trim();
  if (!company) {
    return Response.json(
      { success: false, error: "company 파라미터가 필요합니다." },
      { status: 400 }
    );
  }
  const maxPages = Number(sp.get("maxPages") || 5);
  const strict = sp.get("strict") !== "false"; // 기본: 제목에 회사명 포함만

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

  // 병합(자사 → 알바몬 → 헤어인잡 → 뷰티잡 → 뷰티잡매니저 → 미용인잡 → 잡코리아 → 사람인) + url 기준 중복 제거
  const seen = new Set<string>();
  const jobs: FoundJob[] = [];
  for (const j of [...selfJobs, ...albaJobs, ...hairJobs, ...bjJobs, ...bjmJobs, ...myJobs, ...jkJobs, ...srJobs]) {
    if (seen.has(j.url)) continue;
    seen.add(j.url);
    jobs.push(j);
  }

  return Response.json({
    success: true,
    company,
    sources: {
      자사홈페이지: selfJobs.length,
      알바몬: albaJobs.length,
      헤어인잡: hairJobs.length,
      뷰티잡: bjJobs.length,
      뷰티잡매니저: bjmJobs.length,
      미용인잡: myJobs.length,
      잡코리아: jkJobs.length,
      사람인: srJobs.length,
    },
    source_status: sourceStatus,
    total: jobs.length,
    jobs,
  });
}
