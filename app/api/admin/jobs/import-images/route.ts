export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { ok, err, requireAuth } from "@/lib/api";
import { rehostImages } from "@/lib/external/rehost";

// 북마클릿이 보낸 사진 주소를 우리 저장소로 옮긴다.
//
// 카페·인스타 이미지는 다른 도메인에서 직접 불러오면 막히거나(핫링크 차단)
// 원본이 지워지면 같이 사라진다. 그래서 등록 시점에 우리 쪽으로 복사해 둔다.
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req);
  if (authErr) return authErr;
  if (!auth || !["admin", "company"].includes(auth.owner_type)) return err("AUTH_002", "권한이 없습니다.", 403);

  const b = await req.json().catch(() => ({}));
  const urls: string[] = (Array.isArray(b.urls) ? b.urls : [])
    .map((u: any) => String(u || "").trim())
    .filter((u: string) => /^https?:\/\//i.test(u))
    .slice(0, 10);
  if (!urls.length) return err("VALIDATION_001", "가져올 이미지가 없어요.");

  const referer = (b.referer || "").trim() || urls[0];
  const hosted = await rehostImages(urls, referer, 10);
  return ok({ urls: hosted });
}
