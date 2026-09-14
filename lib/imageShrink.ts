// 올리기 전에 사진을 줄인다.
//
// 왜 필요한가: 저장소가 1GB 인데 외부 공고를 불러오며 받아 둔 사진 243 장이
// 295MB 를 먹고 있었다(2026-08 실측, 한 장 최대 7.4MB). 원본을 그대로 넣고
// 있었기 때문이다.
//
// 얼마나 줄이나: 가로 1600px 로 맞추고 다시 압축하면 큰 것 여섯 장 기준 75%
// 가 줄었다(37.3MB → 9.2MB). 1600px 인 이유는 공고 본문 칸이 952px 이라
// 고해상도 화면(2배)까지 감당하는 값이기 때문이다. 세로로 긴 포스터를 원본과
// 실제 표시 크기로 나란히 놓고 봤을 때 글자가 뭉개지지 않는 것도 확인했다.
//
// 손대지 않는 경우: 움직이는 GIF(첫 장만 남는다), 이미 작은 사진, 줄였는데
// 오히려 커진 경우. 어느 쪽이든 받은 것을 그대로 돌려준다.

import sharp from "sharp";
import { 썸네일꼬리 } from "@/lib/thumb";

const 가로상한 = 1600;
const 그냥둘크기 = 300 * 1024;

export type 줄인사진 = { buf: Buffer; contentType: string; ext: string };

export async function shrinkImage(input: Buffer, contentType: string): Promise<줄인사진> {
  const 그대로 = (): 줄인사진 => ({ buf: input, contentType, ext: 확장자(contentType) });
  if (/gif/i.test(contentType)) return 그대로();

  try {
    const meta = await sharp(input, { failOn: "none", sequentialRead: true }).metadata();
    if (!meta.width) return 그대로();
    if (meta.width <= 가로상한 && input.byteLength <= 그냥둘크기) return 그대로();

    // rotate() 는 EXIF 방향을 픽셀에 실제로 적용하고 태그를 없앤다. 태그만
    // 지우면 휴대폰으로 찍은 사진이 옆으로 눕는다.
    const 판 = sharp(input, { failOn: "none", sequentialRead: true })
      .rotate()
      .resize({ width: 가로상한, withoutEnlargement: true });

    // 투명한 곳이 있으면 JPEG 로 바꿀 수 없다(검게 찬다). 그때는 WebP.
    const webp = !!meta.hasAlpha;
    const out = webp
      ? await 판.webp({ quality: 82 }).toBuffer()
      // mozjpeg 는 28% 더 줄이지만 네 배 느리다(같은 여섯 장에 11.4초 대 2.7초).
      // 공고 불러오기는 오퍼스 호출과 한 요청 안에 있어 60초 상한에 이미 가깝다.
      // 여기서 몇 초를 더 쓰는 것보다 기본 인코더로 빨리 끝내는 편이 낫다.
      : await 판.jpeg({ quality: 82 }).toBuffer();

    if (out.byteLength >= input.byteLength) return 그대로();
    return webp
      ? { buf: out, contentType: "image/webp", ext: "webp" }
      : { buf: out, contentType: "image/jpeg", ext: "jpg" };
  } catch {
    // 못 읽는 형식이면 건드리지 않는다 — 줄이자고 올리기를 막을 일은 아니다.
    return 그대로();
  }
}

function 확장자(ct: string): string {
  if (/png/i.test(ct)) return "png";
  if (/gif/i.test(ct)) return "gif";
  if (/webp/i.test(ct)) return "webp";
  return "jpg";
}


// ── 목록 카드용 작은 사진 ─────────────────────────────────────────────
//
// 왜 또 만드나: 위에서 줄인 1600px 은 공고 상세 본문(952px 칸) 기준이다.
// 목록 카드는 250px 이라 같은 파일을 쓰면 넓이로 40배를 받아서 버린다.
// 실측(2026-09-14) 목록 한 장에 사진 97 장 13.8MB, 평균 146KB 였다.
//
// 이름 규칙: 원본이 `a/b.jpg` 면 썸네일은 `a/b-t400.webp` 다. 칸을 따로 두지
// 않고 이름으로 찾는다 — 표에 칸을 더하면 공고·기업·프로필 네 군데를 다 고쳐야
// 한다. 없는 경우는 화면이 원본으로 되돌아간다(onError).

const 썸네일가로 = 400;

/** 목록 카드용 400px webp. 못 만들면 null — 그때는 원본을 그대로 쓴다. */
export async function makeThumb(input: Buffer, contentType: string): Promise<Buffer | null> {
  if (/gif/i.test(contentType)) return null;   // 움직이는 그림은 첫 장만 남아 어색하다
  try {
    const out = await sharp(input, { failOn: "none", sequentialRead: true })
      .rotate()
      .resize({ width: 썸네일가로, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
    return out;
  } catch {
    return null;
  }
}

/** 원본 주소 → 썸네일 주소. 확장자만 갈아 끼운다. */
export function thumbPath(path: string): string {
  return path.replace(/\.(jpe?g|png|webp|gif)$/i, "") + 썸네일꼬리;
}
