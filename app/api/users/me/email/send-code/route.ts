export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { err } from "@/lib/api";

// [retired] 개인 이메일 변경은 비밀번호 재확인 방식(/api/users/me/email/change)으로 대체됨
export async function POST(_req: NextRequest) {
  return err("GONE", "지원하지 않는 요청입니다.", 410);
}
