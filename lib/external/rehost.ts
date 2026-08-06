// lib/external/rehost.ts
// 핫링크(외부 도메인 이미지 로드) 차단 사이트의 공고 이미지를 서버에서 받아
// Supabase Storage(job-images 버킷)에 재호스팅하고 public URL을 돌려준다.
//   · 헤어인잡 등은 다른 도메인에서 <img>로 못 불러온다(referer 차단) → beautywork에서 깨짐.
//   · 서버 fetch는 Referer를 원본 도메인으로 세팅해 차단을 우회한다.

import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "job-images";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function extOf(ct: string): string {
  if (/png/i.test(ct)) return "png";
  if (/gif/i.test(ct)) return "gif";
  if (/webp/i.test(ct)) return "webp";
  return "jpg";
}

/** 외부 이미지 URL들을 재호스팅해 beautywork(Supabase) public URL 배열로 반환. 실패분은 건너뜀. */
export async function rehostImages(
  urls: string[],
  referer: string,
  max = 8
): Promise<string[]> {
  const out: string[] = [];
  for (const url of urls.slice(0, max)) {
    try {
      const res = await fetch(url, {
        headers: { Referer: referer, "User-Agent": UA, Accept: "image/*" },
      });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") || "";
      if (!/^image\//i.test(ct)) continue;
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 1000 || buf.byteLength > 15 * 1024 * 1024) continue; // 아이콘/과대 제외(뷰티잡 등 세로로 긴 포스터 대응)
      const fileName = `external/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extOf(ct)}`;
      const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(fileName, buf, { contentType: ct, upsert: true });
      if (error) continue;
      const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName);
      if (data?.publicUrl) out.push(data.publicUrl);
    } catch {
      /* 개별 실패는 무시하고 계속 */
    }
  }
  return out;
}
