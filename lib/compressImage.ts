// 브라우저에서 사진을 줄여 올린다. 서버는 손대지 않는다.
//
// 크기를 "긴 변"으로 재면 방향에 따라 손해가 갈린다. 같은 기준이어도 가로 사진은
// 넓게 남고 세로 사진은 좁아진다 — 정작 시술 사진은 대부분 세로다.
// 그래서 총 픽셀 수로 묶는다. 어느 비율이든 결과 용량이 고르고, 세로 사진이
// 손해 보지 않는다.
//
// 156만 픽셀은 인스타그램이 저장하는 크기(가로 1080)에 맞춘 것이다. 사진이 전부인
// 서비스가 그 정도로 충분하다고 본 값이라, 폰에서 보는 데 부족하지 않다.
//   3:4 세로 → 1080×1440   4:3 가로 → 1440×1080   1:1 → 1247×1247
export const PHOTO_PIXEL_BUDGET = 1080 * 1440;

// 아홉 장. 목록이 3×3 으로 딱 떨어져 훑어보기 좋다(인스타 격자와 같은 모양이라
// 눈에도 익다). 장당 180KB 안팎이니 한 사람당 1.6MB, 무료 저장소로 650명쯤이다.
export const MAX_PHOTOS = 9;

/** 원본 비율은 그대로 두고 총 픽셀 수만 줄인다. 자르지 않는다. */
export async function compressPhoto(
  file: File,
  pixelBudget = PHOTO_PIXEL_BUDGET
): Promise<{ file: File; width: number; height: number }> {
  let src: ImageBitmap | HTMLImageElement | null = null;
  let objUrl = "";
  try {
    try {
      src = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      objUrl = URL.createObjectURL(file);
      src = await new Promise<HTMLImageElement>((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => rej(new Error("decode"));
        im.src = objUrl;
      });
    }
    const w0 = (src as any).width as number;
    const h0 = (src as any).height as number;
    if (!w0 || !h0) return { file, width: 0, height: 0 };

    // 예산보다 작으면 그대로 둔다 — 다시 인코딩해서 괜히 화질을 깎지 않는다.
    const scale = Math.min(1, Math.sqrt(pixelBudget / (w0 * h0)));
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));
    if (scale === 1 && /^image\/jpe?g$/i.test(file.type) && file.size <= 250 * 1024) {
      return { file, width: w0, height: h0 };
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { file, width: w0, height: h0 };
    ctx.drawImage(src as any, 0, 0, w, h);

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    // 크기는 이미 맞췄으니 품질만 조금씩 낮춘다. 0.6 아래로는 내리지 않는다 —
    // 네일 무늬나 염색 결이 뭉개지면 포트폴리오로서 보여줄 것이 없어진다.
    let 마지막: Blob | null = null;
    for (const q of [0.82, 0.74, 0.66, 0.6]) {
      const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", q));
      if (!blob) break;
      마지막 = blob;
      if (blob.size <= 250 * 1024) break;
    }
    return 마지막
      ? { file: new File([마지막], name, { type: "image/jpeg" }), width: w, height: h }
      : { file, width: w0, height: h0 };
  } catch {
    return { file, width: 0, height: 0 }; // 못 읽으면 원본으로 보내고 서버가 판단하게 둔다
  } finally {
    if (objUrl) URL.revokeObjectURL(objUrl);
    if (src && "close" in (src as any)) (src as ImageBitmap).close();
  }
}
