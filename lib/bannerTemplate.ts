"use client";
// 샘플 배너 — 쓸 만한 사진이 없는 업체를 위해 준비된 배경 위에 문구만 얹어 배너를 만든다.
// 공고 등록과 매장/기업정보 설정 양쪽에서 같은 결과를 내야 해서 여기 모아 둔다.
// 배경 프리셋(뷰티 필). bg=그라데이션 2색, text=제목색, wm=배경 'RECRUIT' 워터마크색
// 사진을 배경으로 깔고 그 위에 제목을 그린다(제목은 별도 입력). bg는 사진 로드 실패 시 폴백 색.
export const BANNER_PRESETS: { key: string; label: string; bg: string; text: string; img: string }[] = [
  { key: "aura", label: "화이트 뷰티", bg: "#f7f5f2", text: "#1f1b17", img: "/banner-default.jpg" },
];
// 폭 초과 시 자동 줄바꿈(명시적 개행 우선)
function wrapLines(ctx: CanvasRenderingContext2D, title: string, maxW: number, maxLines = 3): string[] {
  const wrap = (line: string): string[] => {
    if (ctx.measureText(line).width <= maxW) return [line];
    const words = line.split(" ");
    const out: string[] = []; let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (ctx.measureText(test).width <= maxW || !cur) cur = test;
      else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
    return out;
  };
  return title.split("\n").flatMap((l) => wrap(l.trim())).filter(Boolean).slice(0, maxLines);
}

// 캔버스에 샘플 배너 그림: 사진을 배경으로 깔고 그 위에 문구를 얹는다.
//   배너 한 칸은 전체 폭의 1/3(=3:1 배너에서 1:1)이라, 정사각으로 만들어야 글자가 잘리지 않는다.
//   사진 몇 장과 나란히 놓여도, 혼자 놓여도 칸 비율은 늘 같다.
export async function drawSampleBanner(canvas: HTMLCanvasElement, preset: (typeof BANNER_PRESETS)[number], title: string) {
  const W = 900, H = 900;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = preset.bg; ctx.fillRect(0, 0, W, H);
  // 배경 사진: cover. 세로는 아래쪽에 치우치게 잘라(0.68) 아래에 놓인 제품 연출이 살아남게 한다.
  //   제목이 묻히지 않게 채도만 낮춘다(형체·선명도는 그대로).
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); img.src = preset.img; });
  if (img.naturalWidth && img.naturalHeight) {
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    ctx.save();
    ctx.filter = "saturate(0.25)";
    ctx.drawImage(img, (W - dw) / 2, (H - dh) * 0.68, dw, dh);
    ctx.restore();
  }
  // 제목: 배너 정중앙 정렬
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = preset.text;
  ctx.font = "700 62px 'Pretendard','Apple SD Gothic Neo',sans-serif";
  const lines = wrapLines(ctx, title, W * 0.82, 4);
  const lh = 84;
  const startY = H / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, W / 2, startY + i * lh));
}
