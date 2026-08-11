// app/api/admin/external-jobs/find-by-company/route.ts
// 회사명 → 외부 채용공고 URL 자동 조회 (멀티소스 9개: 자사홈 + 헤어인잡·알바몬·잡코리아·사람인·뷰티잡·뷰티인잡·뷰티잡매니저·미용인잡)
// 조회 로직은 lib/external/findByCompany.ts (target-companies 채용유무 자동확인과 공용). 조회는 무료.
//
// 사용: GET /api/admin/external-jobs/find-by-company?company=준오헤어&maxPages=5&strict=true
//   → { success, company, sources, total, jobs: [{ idx, title, url, source }] }
// 반환된 url은 그대로 '외부 공고 불러오기'(parse) 툴에 넣어 자동 등록 가능.

import { NextRequest } from "next/server";
import { findJobsForCompany } from "@/lib/external/findByCompany";

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

  // 단건 조회(사용자가 목록을 직접 봄) → 마감 검증 켬. 대량 채용유무 확인은 기본(off)이라 요청 폭증 없음.
  const { jobs, sources, source_status } = await findJobsForCompany(company, { maxPages, strict, verifyOpen: true });

  return Response.json({
    success: true,
    company,
    sources,
    source_status,
    total: jobs.length,
    jobs,
  });
}
