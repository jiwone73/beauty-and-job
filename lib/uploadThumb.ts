import { supabaseAdmin } from "@/lib/supabase";
import { makeThumb, thumbPath } from "@/lib/imageShrink";

/**
 * 방금 올린 사진의 목록 카드용(400px) 짝을 같은 자리에 함께 올린다.
 *
 * 실패해도 조용히 넘어간다 — 썸네일이 없으면 화면이 원본으로 되돌아가므로,
 * 이것 때문에 사진 올리기가 막히면 안 된다.
 */
export async function 썸네일도올리기(bucket: string, path: string, buf: Buffer, contentType: string) {
  try {
    const t = await makeThumb(buf, contentType);
    if (!t) return;
    await supabaseAdmin.storage.from(bucket).upload(thumbPath(path), t, {
      contentType: "image/webp",
      upsert: true,
      // 이름에 시각이 박혀 있어 같은 이름이 다시 쓰이지 않는다. 길게 잡아도 안전하다.
      cacheControl: "31536000",
    });
  } catch (e) {
    console.error("[썸네일]", e);
  }
}
