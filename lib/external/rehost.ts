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
      let ct: string;
      let buf: Buffer;
      // data:image/...;base64,... (잡코리아 등은 상세요강 이미지를 base64 인라인으로 넣기도 함)
      const dataM = url.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i);
      if (dataM) {
        ct = dataM[1];
        buf = Buffer.from(dataM[2], "base64");
      } else {
        const res = await fetch(url, {
          headers: { Referer: referer, "User-Agent": UA, Accept: "image/*" },
        });
        if (!res.ok) continue;
        ct = res.headers.get("content-type") || "";
        if (!/^image\//i.test(ct)) continue;
        buf = Buffer.from(await res.arrayBuffer());
      }
      if (buf.byteLength < 1000 || buf.byteLength > 15 * 1024 * 1024) continue; // 아이콘/과대 제외(뷰티잡 등 세로로 긴 포스터 대응)
      // EXIF Orientation은 그대로 보존한다. 원본 픽셀이 옆으로 저장되고 태그로 세우는 사진(휴대폰 촬영)이 많아
      // 태그를 지우면 오히려 옆으로 눕는다. 브라우저 기본(EXIF 적용)으로 표시하면 원 사이트와 동일하게 똑바로 나온다.
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
