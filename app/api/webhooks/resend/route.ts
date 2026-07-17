export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

// [retired] 반송 자동차단(email_bounced) 미사용 — 관련 컬럼/로직 제거됨
export async function POST(_req: NextRequest) {
  return NextResponse.json({ ok: true });
}
