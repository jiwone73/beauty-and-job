export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { ok, requireAuth } from "@/lib/api";
import { 동의읽기, 동의쓰기 } from "@/lib/termConsent";

// 추천 채용공고 알림 수신 동의.
//   예전에는 약관 id 를 코드에 박아 두고, 끄면 행을 지웠다. 둘 다 고쳤다 —
//   id 는 terms.type 으로 찾고(약관을 새 판으로 갈아도 따라간다),
//   끌 때는 지우지 않고 철회 시각을 남긴다(언제 껐는지가 증빙이다).
const TERM = "RECOMMENDATION";

export async function GET(req: NextRequest) {
  const { auth, res } = requireAuth(req, "user");
  if (res) return res;
  const 동의 = await 동의읽기("user", auth!.sub, [TERM]);
  return ok({ agreed: 동의[TERM] });
}

export async function PUT(req: NextRequest) {
  const { auth, res } = requireAuth(req, "user");
  if (res) return res;
  const { agreed } = await req.json().catch(() => ({ agreed: false }));
  await 동의쓰기("user", auth!.sub, TERM, !!agreed);
  const 동의 = await 동의읽기("user", auth!.sub, [TERM]);
  return ok({ agreed: 동의[TERM] });
}
