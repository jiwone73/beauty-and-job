export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api";
import { collectCafeLeads, saveLeads } from "@/lib/external/naverCafe";

// 하루 한 번 카페 구인글을 모은다.
// 검색 API 가 작성일을 주지 않아 '최근 것'을 고를 수 없으므로,
// 최신순 100건씩 받아 링크로 중복을 걸러 새 글만 남긴다.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) return err("AUTH_001", "인증이 필요합니다.", 401);

  const leads = await collectCafeLeads();
  const added = await saveLeads(leads);
  console.log(`[cron cafe-leads] 조회 ${leads.length}건 → 새 글 ${added}건`);
  return ok({ found: leads.length, added });
}
