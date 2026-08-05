// app/api/admin/external-jobs/find-by-company/route.ts
// 회사명 → 외부 채용공고 URL 자동 조회 (1차 소스: 헤어인잡)
// 실제 조회 로직은 lib/external/hairinjob.ts 에 있음(Next.js route는 GET 등 정해진 export만 허용).
//
// 사용: GET /api/admin/external-jobs/find-by-company?company=준오헤어&maxPages=5&strict=true
//   → { success, company, source, total_found, matched, jobs: [{ idx, title, url }] }
// 반환된 url은 그대로 '외부 공고 불러오기'(parse) 툴에 넣어 자동 등록 가능.

import { NextRequest } from "next/server";
import { findJobsByCompany } from "@/lib/external/hairinjob";

export const runtime = "nodejs"; // TextDecoder('euc-kr') 때문에 nodejs 런타임 고정
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

  try {
    const { total, matched, jobs } = await findJobsByCompany(company, {
      maxPages,
      strict,
    });
    return Response.json({
      success: true,
      company,
      source: "hairinjob",
      total_found: total,
      matched,
      jobs,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ success: false, error: msg }, { status: 502 });
  }
}
