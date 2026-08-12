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

// JPEG의 EXIF Orientation 태그를 1(회전 없음)로 리셋한다. 픽셀은 그대로 두고 메타데이터만 수정.
//   일부 사진은 잘못된 Orientation 태그가 박혀 브라우저가 세로로 돌려 크롭된 것처럼 보인다(원 사이트는 원본 픽셀 표시).
//   태그를 1로 만들면 어떤 브라우저/뷰어에서도 원본 픽셀(대개 가로) 그대로 나온다.
function resetJpegOrientation(buf: Buffer): Buffer {
  try {
    if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return buf; // JPEG 아님
    let o = 2;
    while (o + 4 < buf.length) {
      if (buf[o] !== 0xff) break;
      const marker = buf[o + 1];
      if (marker === 0xd8 || marker === 0xd9) { o += 2; continue; }
      const len = buf.readUInt16BE(o + 2);
      if (marker === 0xe1 && buf.toString("ascii", o + 4, o + 10) === "Exif\0\0") {
        const tiff = o + 10;
        const be = buf.toString("ascii", tiff, tiff + 2) === "MM";
        const u16 = (p: number) => (be ? buf.readUInt16BE(p) : buf.readUInt16LE(p));
        const u32 = (p: number) => (be ? buf.readUInt32BE(p) : buf.readUInt32LE(p));
        const ifd = tiff + u32(tiff + 4);
        if (ifd + 2 > buf.length) return buf;
        const n = u16(ifd);
        for (let i = 0; i < n; i++) {
          const e = ifd + 2 + i * 12;
          if (e + 12 > buf.length) break;
          if (u16(e) === 0x0112) { if (be) buf.writeUInt16BE(1, e + 8); else buf.writeUInt16LE(1, e + 8); break; }
        }
        return buf;
      }
      o += 2 + len;
    }
  } catch { /* 파싱 실패 시 원본 유지 */ }
  return buf;
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
      if (/jpe?g/i.test(ct)) buf = resetJpegOrientation(buf); // EXIF 회전 태그 제거 → 어떤 브라우저에서도 원본 픽셀 그대로
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
