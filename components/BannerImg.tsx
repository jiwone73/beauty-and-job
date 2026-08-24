"use client";
import { useState } from "react";

// 배너/썸네일 한 칸.
//  기본: 정해진 칸 높이에 맞춰 축소(contain), 남는 여백은 이미지 모서리 배경색으로 채움.
//  ratio: 폭만 정해 두고 높이는 사진 비율이 정한다 — 여백 자체가 안 생긴다.
//  fill: 칸을 사진으로 꽉 채운다(cover). 칸 높이가 고정이라 위아래·좌우가 조금 잘린다.
export function BannerImg({ src, alt, ratio = false, fill = false }: { src: string; alt?: string; ratio?: boolean; fill?: boolean }) {
  const [bg, setBg] = useState("#f4f4f4");
  const [noCors, setNoCors] = useState(false);
  const sample = (img: HTMLImageElement) => {
    try {
      const cv = document.createElement("canvas");
      cv.width = 1;
      cv.height = 1;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      // 좌상단 모서리(6x6)를 1px로 축약 → 배경색 추정
      ctx.drawImage(img, 0, 0, 6, 6, 0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      setBg(`rgb(${d[0]}, ${d[1]}, ${d[2]})`);
    } catch {
      /* CORS 등으로 픽셀 샘플 실패 → 기본 배경 유지 */
    }
  };
  // fill 모드는 사진이 칸을 꽉 채워(cover) 배경색이 한 뼘도 비치지 않는다.
  // 그런데도 배경색을 재려고 crossOrigin="anonymous" 로 걸면, 사진 서버가
  // CORS 헤더를 안 주는 한(외부 스톡사진 대부분이 그렇다) 첫 요청은
  // 반드시 실패하고 — onError 로 재시도하며 같은 사진을 처음부터 다시
  // 받는다. 채용공고 그리드가 이 모드를 쓰는데, 카드가 90장을 넘으면
  // 사진 하나하나가 두 번씩 내려받혀 탭을 바꿀 때마다 눈에 띄게 느려졌다.
  // fill 에서는 애초에 안 보일 값이니 재는 일 자체를 건너뛴다.
  if (fill) {
    return (
      <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
        <img src={src} alt={alt} loading="lazy" decoding="async"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
    );
  }
  return (
    <div style={{ width: "100%", height: ratio ? "auto" : "100%", background: ratio ? "transparent" : bg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <img
        src={src}
        alt={alt}
        {...(noCors ? {} : { crossOrigin: "anonymous" as const })}
        onLoad={(e) => sample(e.currentTarget)}
        onError={() => setNoCors(true)}
        style={ratio
          ? { width: "100%", height: "auto", display: "block" }
          : { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
      />
    </div>
  );
}
