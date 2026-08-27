"use client";
// 샘플 배너 — 쓸 만한 사진이 없는 업체를 위해 준비된 배경 위에 문구만 얹어 배너를 만든다.
// 공고 등록과 매장/기업정보 설정 양쪽에서 같은 결과를 내야 해서 여기 모아 둔다.
// 배경 프리셋(뷰티 필). bg=그라데이션 2색, text=제목색, wm=배경 'RECRUIT' 워터마크색
// 사진을 배경으로 깔고 그 위에 제목을 그린다(제목은 별도 입력). bg는 사진 로드 실패 시 폴백 색.
export const BANNER_PRESETS: { key: string; label: string; bg: string; text: string; img: string }[] = [
  { key: "cream", label: "크림 & 브러시", bg: "#efe0d1", text: "#3a2f26", img: "/banner/cream.jpg" },
  { key: "salon", label: "화이트 살롱", bg: "#e8e0d3", text: "#332c22", img: "/banner/salon.jpg" },
  { key: "blossom", label: "벚꽃 핑크", bg: "#fadbdb", text: "#4a2b30", img: "/banner/blossom.jpg" },
  { key: "marble", label: "마블 스파", bg: "#ebe9e7", text: "#2f2d2b", img: "/banner/marble.jpg" },
  { key: "silk", label: "실크 화이트", bg: "#eee9e1", text: "#3a342a", img: "/banner/silk.jpg" },
  { key: "lavender", label: "라벤더 헤어", bg: "#cfc1d4", text: "#3b2b45", img: "/banner/lavender.jpg" },
  { key: "aura", label: "오라 베이지", bg: "#f7f5f2", text: "#1f1b17", img: "/banner-default.jpg" },
  { key: "botanical", label: "보태니컬 크림", bg: "#f2e9dc", text: "#3a2f26", img: "/banner/botanical.jpg" },
  { key: "petal", label: "로즈 페탈", bg: "#f6d9d3", text: "#4a2b30", img: "/banner/petal.jpg" },
  { key: "aqua", label: "아쿠아 스킨케어", bg: "#dcebf2", text: "#22343d", img: "/banner/aqua.jpg" },
  { key: "violet", label: "바이올렛 살롱", bg: "#e2d9ee", text: "#2f2440", img: "/banner/violet.jpg" },
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
//   목록 카드는 이 배너를 3:2 로 잘라 쓰므로, 글자는 가운데 3:2 안에서만
//   줄바꿈해 어느 쪽에서도 잘리지 않게 한다.
export async function drawSampleBanner(canvas: HTMLCanvasElement, preset: (typeof BANNER_PRESETS)[number], title: string) {
  // 공고 배너 한 쪽의 실제 비율은 6:2(=3:1) 이다 — 3:2 칸 둘이 나란히 선다.
  // 상세 배너는 자르지 않고 그대로 보여주므로(BannerImg contain) 여기서 만든
  // 모양이 곧 배너 모양이 된다.
  const W = 1800, H = 600;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = preset.bg; ctx.fillRect(0, 0, W, H);
  // 배경 사진: cover. 세로는 아래쪽에 치우치게 잘라(0.68) 아래에 놓인 제품 연출이 살아남게 한다.
  //   제목이 묻히지 않게 채도만 살짝 낮춘다(형체·선명도는 그대로).
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); img.src = preset.img; });
  if (img.naturalWidth && img.naturalHeight) {
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    ctx.save();
    ctx.filter = "saturate(0.72)";
    ctx.drawImage(img, (W - dw) / 2, (H - dh) * 0.68, dw, dh);
    ctx.restore();
  }
  // 제목: 배너 정중앙 정렬
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = preset.text;
  ctx.font = "700 62px 'Pretendard','Apple SD Gothic Neo',sans-serif";
  // 목록 카드는 이 배너를 3:2 로 잘라 쓴다(JobCard, cover). 글자가 거기서 잘리지 않게
  //   가운데 3:2 영역(폭 = 높이 × 1.5) 안에서만 줄바꿈한다.
  const lines = wrapLines(ctx, title, H * 1.5 * 0.82, 4);
  const lh = 84;
  const startY = H / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, W / 2, startY + i * lh));
}
