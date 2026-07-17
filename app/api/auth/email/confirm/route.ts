export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { err } from "@/lib/api";

// [retired] 이메일 인증(더블 옵트인) 미사용 — 이 서비스는 이메일 인증을 하지 않음
export async function GET(_req: NextRequest) {
  return err("GONE", "지원하지 않는 요청입니다.", 410);
}
