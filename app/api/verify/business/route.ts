export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api";
import { verifyBusinessNumber } from "@/lib/business/verify";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const bno = body?.business_number;
  if (!bno) return err("USER_002", "사업자등록번호를 입력해주세요.");
  const result = await verifyBusinessNumber(String(bno));
  return ok(result);
}
