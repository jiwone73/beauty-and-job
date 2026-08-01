// 업로드 전 클라이언트에서 이미지 해상도를 강제로 줄여(리사이즈) 용량을 낮춘다.
// 폰 사진처럼 큰 원본도 자동으로 축소해 서버 용량 제한(2MB)에 맞춘다.
export async function downscaleImage(
  file: File,
  opts: { maxDim?: number; maxBytes?: number; mime?: string } = {}
): Promise<File> {
  const maxDim = opts.maxDim ?? 1600;
  const maxBytes = opts.maxBytes ?? 1.8 * 1024 * 1024;
  const preferMime = opts.mime ?? "image/jpeg";

  // 이미지가 아니면(예: 알 수 없는 형식) 원본 그대로 반환
  if (typeof window === "undefined" || !file.type.startsWith("image/")) return file;

  let img: HTMLImageElement;
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(new Error("read fail"));
      fr.readAsDataURL(file);
    });
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("decode fail"));
      im.src = dataUrl;
    });
  } catch {
    // 디코딩 실패(HEIC 등) 시 원본 반환 → 서버에서 형식/용량 검증
    return file;
  }

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height || 1));
  let w = Math.max(1, Math.round(img.width * scale));
  let h = Math.max(1, Math.round(img.height * scale));

  const render = (rw: number, rh: number, mime: string, quality: number): Promise<Blob | null> => {
    const canvas = document.createElement("canvas");
    canvas.width = rw;
    canvas.height = rh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.resolve(null);
    ctx.drawImage(img, 0, 0, rw, rh);
    return new Promise((res) => canvas.toBlob((b) => res(b), mime, quality));
  };

  let mime = preferMime;
  let quality = 0.85;
  let blob = await render(w, h, mime, quality);
  // webp 인코딩 미지원 브라우저(예: 일부 iOS)면 png로 대체
  if (!blob && mime !== "image/png") {
    mime = "image/png";
    blob = await render(w, h, mime, quality);
  }
  // 용량 초과 시 품질 → 해상도 순으로 반복 축소
  let guard = 0;
  while (blob && blob.size > maxBytes && guard < 10) {
    guard++;
    if (mime !== "image/png" && quality > 0.5) {
      quality = Math.max(0.4, quality - 0.12);
    } else {
      w = Math.max(1, Math.round(w * 0.85));
      h = Math.max(1, Math.round(h * 0.85));
    }
    blob = await render(w, h, mime, quality);
  }

  if (!blob) return file; // 최후에도 실패하면 원본 반환

  const ext = mime === "image/webp" ? "webp" : mime === "image/png" ? "png" : "jpg";
  const base = (file.name || "image").replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.${ext}`, { type: mime });
}
